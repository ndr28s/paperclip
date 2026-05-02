import { contextBridge } from "electron";

// Bridge for the renderer process. Add safe IPC channels here as needed.
contextBridge.exposeInMainWorld("paperclip", {
  platform: process.platform,
  isPackaged: !process.env.ELECTRON_RENDERER_URL, // true in production build
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});

// TypeScript declarations for the renderer.
declare global {
  interface Window {
    paperclip: {
      platform: NodeJS.Platform;
      isPackaged: boolean;
      versions: { node: string; chrome: string; electron: string };
    };
  }
}
