# Paperclip Launcher

Electron-based Windows system tray launcher for the Paperclip orchestration platform.

## Overview

The launcher starts the Paperclip server in the background and provides a Windows
system tray icon so you can open the dashboard, restart the server, or quit without
ever opening a terminal.

## Development

```bash
cd launcher
npm install
npm start
```

The launcher detects that it is not packaged (`app.isPackaged === false`) and runs
`pnpm dev` from the repository root instead of the bundled CLI.

## Production build

```bash
cd launcher
npm install
npm run build
```

This produces `launcher/dist/Paperclip Setup.exe` (NSIS installer) via
`electron-builder`. You can also do a directory build (no installer) with:

```bash
npm run build:dir
```

## Tray behaviour

| State       | Tooltip                    | Menu items                                 |
|-------------|----------------------------|--------------------------------------------|
| Starting    | Paperclip - 시작 중...     | Open Dashboard (disabled), Restart, Quit   |
| Running     | Paperclip - 실행 중        | Open Dashboard, Restart, Quit              |
| Stopped     | Paperclip - 중지됨         | Open Dashboard (disabled), Restart, Quit   |

- **Open Dashboard** — opens `http://localhost:3100` in the default browser.
- **Restart** — kills the server process and spawns a new one.
- **Quit** — terminates the server and exits the launcher.

If the server exits unexpectedly a Windows notification is shown.

Launching a second instance of the launcher opens the dashboard directly (if the
server is running) rather than starting a second server.

## Port

The server listens on port `3100` by default. Override with the environment variable
`PAPERCLIP_LISTEN_PORT` before launching.
