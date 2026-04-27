# @paperclipai/desktop

Paperclip desktop app — Electron + React 19 + Tamagui.

## Stack
- **Electron** for native shell (Windows / macOS / Linux)
- **electron-vite** for fast dev/build
- **React 19** for UI
- **Tamagui** as the design system (shared with mobile via `@paperclipai/tamagui-config`)

## Layout
```
electron/      Main + preload (Node side, runs in Electron main process)
src/           Renderer (React app shown in the BrowserWindow)
index.html     Renderer entry
electron.vite.config.ts
```

## Scripts
```bash
pnpm --filter @paperclipai/desktop dev          # dev with hot reload
pnpm --filter @paperclipai/desktop build        # bundle for production
pnpm --filter @paperclipai/desktop package:win  # build .exe (Windows)
pnpm --filter @paperclipai/desktop package:mac  # build .dmg (macOS)
pnpm --filter @paperclipai/desktop package:linux # build .AppImage
```

## Connecting to the paperclip server
The renderer talks to the local paperclip server over HTTP. Configure the base URL via env or
in-app settings; pass it to `ApiClient` from `@paperclipai/api-client`.
