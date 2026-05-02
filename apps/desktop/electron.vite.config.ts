import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import { tamaguiPlugin } from "@tamagui/vite-plugin";
import path from "node:path";

export default defineConfig({
  main: {
    build: {
      outDir: "dist-electron",
      emptyOutDir: false,
      lib: {
        entry: "electron/main.ts",
      },
    },
  },
  preload: {
    build: {
      outDir: "dist-electron",
      emptyOutDir: false,
      lib: {
        entry: "electron/preload.ts",
      },
    },
  },
  renderer: {
    root: ".",
    build: {
      outDir: "dist",
      rollupOptions: {
        input: path.resolve(__dirname, "index.html"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3100",
          changeOrigin: true,
          cookieDomainRewrite: { "*": "" },
          cookiePathRewrite: { "*": "/" },
        },
      },
    },
    plugins: [
      react(),
      tamaguiPlugin({
        config: "../../packages/tamagui-config/src/index.ts",
        components: ["tamagui"],
      }),
    ],
  },
});
