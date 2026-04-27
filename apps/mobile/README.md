# @paperclipai/mobile

Paperclip mobile app — Expo + React Native + Tamagui.

## Stack
- **Expo (SDK 52, New Architecture enabled)** — managed workflow, OTA updates, EAS Build
- **React Native 0.76** — native components, Hermes engine
- **Tamagui** — design system shared with web/desktop via `@paperclipai/tamagui-config`

## Layout
```
App.tsx           Root component
index.ts          Expo entry
app.json          Expo config (bundle ids, plugins)
babel.config.js   Babel + Tamagui plugin
metro.config.js   Metro tuned for pnpm monorepo
```

## Scripts
```bash
pnpm --filter @paperclipai/mobile start       # Expo dev server (QR + simulator)
pnpm --filter @paperclipai/mobile android     # build & run on Android
pnpm --filter @paperclipai/mobile ios         # build & run on iOS (macOS only)
pnpm --filter @paperclipai/mobile prebuild    # generate native android/ios dirs
```

## First-time setup
1. Install Android Studio (for `pnpm android`)
2. Run `pnpm install` at the repo root (sets up workspace symlinks)
3. `pnpm --filter @paperclipai/mobile prebuild` once to generate `android/` folder
4. `pnpm --filter @paperclipai/mobile android` to build & run on a connected device or emulator

## Connecting to the paperclip server
Use the local network IP for the server (not `localhost`) so the device can reach it.
Configure via env or in-app settings, pass to `ApiClient` from `@paperclipai/api-client`.
