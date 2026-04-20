'use strict';

const { app, Tray, Menu, nativeImage, shell, Notification } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

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
const PORT = parseInt(process.env.PAPERCLIP_LISTEN_PORT || '3100', 10);

/** @type {Tray | null} */
let tray = null;
/** @type {import('child_process').ChildProcess | null} */
let serverProcess = null;
let serverReady = false;
/** Set to true when the user explicitly asked to stop (Quit / Restart). */
let userInitiatedStop = false;

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
  const isDev = !app.isPackaged;
  let cmd, args, cwd;

  if (isDev) {
    // Development: run `pnpm dev` from the repo root (two levels up from src/).
    cwd = path.resolve(__dirname, '../../');
    cmd = 'pnpm';
    args = ['dev'];
  } else {
    // Production: invoke the bundled CLI entry point via node.
    const resourcesPath = process.resourcesPath;
    const appDir = path.join(resourcesPath, 'app');
    cwd = appDir;
    cmd = process.platform === 'win32' ? 'node.exe' : 'node';
    args = [path.join(appDir, 'cli', 'dist', 'index.js'), 'start'];
  }

  return spawn(cmd, args, {
    cwd,
    shell: true,
    windowsHide: true,
    env: { ...process.env, PAPERCLIP_LISTEN_PORT: String(PORT) },
  });
}

function startServer() {
  userInitiatedStop = false;
  serverReady = false;
  updateTrayStatus('starting');

  serverProcess = spawnServer();

  serverProcess.on('error', (err) => {
    console.error('[launcher] Failed to start server process:', err);
    updateTrayStatus('stopped');
    if (!userInitiatedStop) {
      showNotification('Paperclip 오류', `서버를 시작할 수 없습니다: ${err.message}`);
    }
  });

  serverProcess.on('exit', (code, signal) => {
    serverReady = false;
    const wasUserStop = userInitiatedStop;
    serverProcess = null;

    if (!wasUserStop) {
      // Unexpected exit.
      console.warn(`[launcher] Server exited unexpectedly (code=${code}, signal=${signal})`);
      updateTrayStatus('stopped');
      showNotification('Paperclip 중지됨', '서버가 예기치 않게 종료되었습니다.');
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
    serverProcess = null;

    // Give the process up to 5 seconds to exit cleanly before killing it.
    const forceKill = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch (_) {}
    }, 5000);

    proc.on('exit', () => {
      clearTimeout(forceKill);
      resolve();
    });

    try {
      proc.kill('SIGTERM');
    } catch (err) {
      console.error('[launcher] Error sending SIGTERM:', err);
      clearTimeout(forceKill);
      resolve();
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
