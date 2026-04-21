'use strict';

const { app, Tray, Menu, nativeImage, shell, Notification, utilityProcess } = require('electron');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Walk up from startDir until we find pnpm-workspace.yaml (repo root).
function findRepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// The server reads its port from the config file (config.server.port), which
// takes precedence over PAPERCLIP_LISTEN_PORT.  Read the same config so our
// health-check and "open dashboard" menu item use the correct port.
function resolvePort() {
  const configPath =
    process.env.PAPERCLIP_CONFIG ||
    path.join(os.homedir(), '.paperclip', 'instances', 'default', 'config.json');
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (cfg && cfg.server && cfg.server.port) return cfg.server.port;
  } catch (_) {}
  return parseInt(process.env.PAPERCLIP_LISTEN_PORT || '3100', 10);
}

// ---------------------------------------------------------------------------
// Minimal 16x16 PNG icons encoded as base64.
// These are raw PNG files generated to represent status colors.
// Blue  (#3B82F6) – used for all states; tooltip communicates status text.
//
// The PNG below is a valid 16x16 solid-blue square.
// ---------------------------------------------------------------------------
const ICON_BLUE_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVQ4T2NkIJL6z0A' +
  'BYBw1gIFBaIABA2QWAABEAAHx8nkuAAAAAElFTkSuQmCC';

// Green (#22C55E) – server running
const ICON_GREEN_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4T2NkGAT/GagA' +
  'jKMGMDAIDYCBgWuAAQMAEAAH+fznrAAAAABJRU5ErkJggg==';

// Yellow (#EAB308) – server starting
const ICON_YELLOW_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4T2NkGDz/GagA' +
  'jKMGMDAIDYCBgWuAAQMAEAAH3P3nQwAAAABJRU5ErkJggg==';

// Red (#EF4444) – server stopped / error
const ICON_RED_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4T2NkGB7/GagA' +
  'jKMGMDAIDYCBgWuAAQMAEAAHD/fnBwAAAABJRU5ErkJggg==';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const PORT = resolvePort();

/** @type {Tray | null} */
let tray = null;
/** @type {import('child_process').ChildProcess | import('electron').UtilityProcess | null} */
let serverProcess = null;
let serverReady = false;
/** Set to true when the user explicitly asked to stop (Quit / Restart). */
let userInitiatedStop = false;
/** True when serverProcess is a utilityProcess (packaged mode). */
let serverIsUtilityProcess = false;

// ---------------------------------------------------------------------------
// Single-instance lock
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  // Another instance is already running — open the dashboard there and exit.
  app.quit();
} else {
  app.on('second-instance', () => {
    if (serverReady) {
      shell.openExternal(`http://localhost:${PORT}`);
    } else {
      showNotification('Paperclip', '서버가 아직 시작 중입니다. 잠시 후 다시 시도해 주세요.');
    }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.setAppUserModelId('ai.paperclip.launcher');

// Prevent any browser windows from being created.
app.on('window-all-closed', (e) => e.preventDefault());

app.whenReady().then(() => {
  // Hide macOS Dock icon (no-op on Windows).
  if (app.dock) app.dock.hide();

  // Do not auto-launch at login by default; let the user opt in via Windows settings.
  app.setLoginItemSettings({ openAtLogin: false });

  createTray();
  startServer();
});

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------
function iconForStatus(status) {
  const b64 =
    status === 'running'
      ? ICON_GREEN_B64
      : status === 'stopped'
      ? ICON_RED_B64
      : ICON_YELLOW_B64; // 'starting'
  return nativeImage.createFromDataURL(`data:image/png;base64,${b64}`);
}

function statusLabel(status) {
  return {
    starting: 'Paperclip - 시작 중...',
    running: 'Paperclip - 실행 중',
    stopped: 'Paperclip - 중지됨',
  }[status] || 'Paperclip';
}

function createTray() {
  tray = new Tray(iconForStatus('starting'));
  tray.setToolTip('Paperclip - 시작 중...');
  updateMenu('starting');
}

function updateTrayStatus(status) {
  if (!tray) return;
  tray.setImage(iconForStatus(status));
  tray.setToolTip(statusLabel(status));
  updateMenu(status);
}

function updateMenu(status) {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
    { label: statusLabel(status), enabled: false },
    { type: 'separator' },
    {
      label: '대시보드 열기',
      enabled: status === 'running',
      click: () => shell.openExternal(`http://localhost:${PORT}`),
    },
    {
      label: '서버 재시작',
      enabled: status !== 'starting',
      click: restartServer,
    },
    { type: 'separator' },
    { label: '종료', click: quitApp },
  ]);

  tray.setContextMenu(menu);
}

// ---------------------------------------------------------------------------
// Server spawn
// ---------------------------------------------------------------------------
function spawnServer() {
  if (app.isPackaged) {
    // Packaged mode: use bundled server via utilityProcess.fork()
    const serverEntry = path.join(process.resourcesPath, 'server', 'dist', 'index.js');
    const serverCwd = path.join(process.resourcesPath, 'server');

    serverIsUtilityProcess = true;

    // Write server stdout/stderr to a log file so crashes are diagnosable
    // when running as a packaged exe (no visible console).
    const logDir = app.getPath('logs');
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'server.log');
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    const logLine = (tag, data) => {
      const line = `[${new Date().toISOString()}] ${tag} ${data.toString().trimEnd()}\n`;
      logStream.write(line);
      console.log(line.trimEnd());
    };
    logLine('INFO', `Starting server — entry: ${serverEntry}`);

    const proc = utilityProcess.fork(serverEntry, [], {
      env: {
        ...process.env,
        PAPERCLIP_LISTEN_PORT: String(PORT),
        NODE_ENV: 'production',
        PAPERCLIP_MIGRATION_AUTO_APPLY: 'true',
        PAPERCLIP_MIGRATION_PROMPT: 'never',
      },
      stdio: 'pipe',
      serviceName: 'paperclip-server',
      cwd: serverCwd,
    });

    proc.on('spawn', () => {
      logLine('INFO', `Server process spawned pid=${proc.pid}`);
    });

    if (proc.stdout) {
      proc.stdout.on('data', (d) => logLine('OUT', d));
    }
    if (proc.stderr) {
      proc.stderr.on('data', (d) => logLine('ERR', d));
    }

    // Store logPath so exit handler can show it in the notification.
    proc._logPath = logPath;

    return proc;
  } else {
    // Dev mode: find repo root and run pnpm dev
    const repoRoot = findRepoRoot(path.dirname(app.getPath('exe')));

    if (!repoRoot) {
      showNotification('Paperclip 오류', 'paperclip 저장소를 찾을 수 없습니다. launcher/ 폴더가 저장소 안에 있는지 확인하세요.');
      updateTrayStatus('stopped');
      return null;
    }

    serverIsUtilityProcess = false;
    return spawn('pnpm', ['dev'], {
      cwd: repoRoot,
      shell: true,
      windowsHide: true,
      env: { ...process.env, PAPERCLIP_LISTEN_PORT: String(PORT) },
    });
  }
}

function startServer() {
  userInitiatedStop = false;
  serverReady = false;
  updateTrayStatus('starting');

  serverProcess = spawnServer();
  if (!serverProcess) return;

  if (!serverIsUtilityProcess) {
    // ChildProcess has an 'error' event; utilityProcess does not.
    serverProcess.on('error', (err) => {
      console.error('[launcher] Failed to start server process:', err);
      updateTrayStatus('stopped');
      if (!userInitiatedStop) {
        showNotification('Paperclip 오류', `서버를 시작할 수 없습니다: ${err.message}`);
      }
    });
  }

  const startLogPath = serverProcess._logPath || null;
  serverProcess.on('exit', (code) => {
    serverReady = false;
    const wasUserStop = userInitiatedStop;
    serverProcess = null;

    if (!wasUserStop) {
      // Unexpected exit.
      console.warn(`[launcher] Server exited unexpectedly (code=${code})`);
      updateTrayStatus('stopped');
      const detail = startLogPath ? `로그: ${startLogPath}` : '';
      showNotification('Paperclip 중지됨', `서버가 예기치 않게 종료되었습니다 (code=${code}). ${detail}`);
    }
  });

  // Begin polling for readiness.
  pollReady();
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) {
      resolve();
      return;
    }

    userInitiatedStop = true;

    const proc = serverProcess;
    const isUtility = serverIsUtilityProcess;
    serverProcess = null;

    proc.on('exit', () => {
      resolve();
    });

    if (isUtility) {
      // utilityProcess.kill() terminates immediately (no SIGTERM support on Windows).
      try { proc.kill(); } catch (_) {}
    } else {
      // Give the ChildProcess up to 5 seconds to exit cleanly before killing it.
      const forceKill = setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch (_) {}
      }, 5000);

      proc.once('exit', () => {
        clearTimeout(forceKill);
      });

      try {
        proc.kill('SIGTERM');
      } catch (err) {
        console.error('[launcher] Error sending SIGTERM:', err);
        clearTimeout(forceKill);
        resolve();
      }
    }
  });
}

async function restartServer() {
  updateTrayStatus('starting');
  await stopServer();
  startServer();
}

async function quitApp() {
  updateTrayStatus('stopped');
  await stopServer();
  app.quit();
}

// ---------------------------------------------------------------------------
// Health check polling
// ---------------------------------------------------------------------------
function pollReady() {
  const MAX_WAIT_MS = 60_000;
  const INTERVAL_MS = 2_000;
  const startedAt = Date.now();

  function check() {
    if (!serverProcess) return; // Process already gone; stop polling.

    const elapsed = Date.now() - startedAt;
    if (elapsed > MAX_WAIT_MS) {
      console.warn('[launcher] Server did not become ready within 60s.');
      updateTrayStatus('stopped');
      showNotification('Paperclip 오류', '서버가 60초 내에 시작되지 않았습니다.');
      return;
    }

    const req = http.get(
      { hostname: 'localhost', port: PORT, path: '/api/health', timeout: 1500 },
      (res) => {
        // HTTP 200 = healthy; HTTP 404 = server up but no /api/health route yet.
        if (res.statusCode === 200 || res.statusCode === 404) {
          serverReady = true;
          updateTrayStatus('running');
        } else {
          setTimeout(check, INTERVAL_MS);
        }
        // Consume response body to free socket.
        res.resume();
      }
    );

    req.on('error', () => {
      // Server not yet listening; retry.
      setTimeout(check, INTERVAL_MS);
    });

    req.on('timeout', () => {
      req.destroy();
      setTimeout(check, INTERVAL_MS);
    });
  }

  setTimeout(check, INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
function showNotification(title, body) {
  if (!Notification.isSupported()) return;
  new Notification({ title, body, silent: false }).show();
}
