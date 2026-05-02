import { app, BrowserWindow, shell, session } from "electron";
import { autoUpdater } from "electron-updater";
import path from "node:path";

const isDev = !app.isPackaged;

async function createMainWindow() {
  if (!isDev) {
    const cachedCookies: Record<string, string> = {};

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      // Cache session cookies from server responses
      const setCookieArr = (
        (details.responseHeaders?.["set-cookie"] ?? details.responseHeaders?.["Set-Cookie"]) as string[] | undefined
      ) ?? [];
      for (const sc of setCookieArr) {
        const [nameValue] = sc.split(";");
        const eqIdx = nameValue.indexOf("=");
        if (eqIdx > 0) {
          const name = nameValue.slice(0, eqIdx).trim();
          const value = nameValue.slice(eqIdx + 1).trim();
          cachedCookies[name] = value;
        }
      }

      // Fix CORS: echo back actual request origin (not "*") so credentials work.
      // Note: requestHeaders is not available on onHeadersReceived details in Electron's
      // type definitions, so we cast to access it at runtime.
      const reqHeaders = (details as unknown as { requestHeaders?: Record<string, string> }).requestHeaders;
      const reqOrigin =
        reqHeaders?.["Origin"] ??
        reqHeaders?.["origin"] ??
        "null";
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Access-Control-Allow-Origin": [reqOrigin],
          "Access-Control-Allow-Methods": ["GET, POST, PUT, PATCH, DELETE, OPTIONS"],
          "Access-Control-Allow-Headers": ["Content-Type, Authorization, Cookie"],
          "Access-Control-Allow-Credentials": ["true"],
        },
      });
    });

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const url = details.url;
      // Only inject for real HTTP(S) requests, not devtools/extensions
      const isApiRequest =
        (url.startsWith("http://") || url.startsWith("https://")) &&
        !url.startsWith("https://devtools") &&
        !url.startsWith("chrome-extension://");

      const cookieStr = Object.entries(cachedCookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");

      if (isApiRequest && cookieStr) {
        callback({
          requestHeaders: {
            ...details.requestHeaders,
            Cookie: cookieStr,
          },
        });
      } else {
        callback({ requestHeaders: details.requestHeaders });
      }
    });
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    title: "Paperclip",
    backgroundColor: "#0b0b0d",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });

// Auto-updater (production only)
if (!isDev) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  app.whenReady().then(() => {
    // Check for updates 3 seconds after launch
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.warn("Auto-update check failed:", err?.message);
      });
    }, 3000);
  });
}
