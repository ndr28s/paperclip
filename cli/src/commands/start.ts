import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadPaperclipEnvFile } from "../config/env.js";
import { configExists, resolveConfigPath } from "../config/store.js";
import {
  describeLocalInstancePaths,
  resolvePaperclipHomeDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";

interface StartOptions {
  config?: string;
  instance?: string;
}

type ServerModule = { startServer?: () => Promise<unknown> };

/**
 * Production-mode server start. Unlike `run`, this command:
 * - Skips the interactive onboarding wizard and doctor health-check
 * - Requires a pre-existing config.json (exits 1 if missing)
 * - Imports server/dist/index.js directly via path (avoids tsx-source detection)
 * - Designed for containerized / Railway deployments
 */
export async function startCommand(opts: StartOptions): Promise<void> {
  const instanceId = resolvePaperclipInstanceId(opts.instance);
  process.env.PAPERCLIP_INSTANCE_ID = instanceId;

  const homeDir = resolvePaperclipHomeDir();
  fs.mkdirSync(homeDir, { recursive: true });

  const paths = describeLocalInstancePaths(instanceId);
  fs.mkdirSync(paths.instanceRoot, { recursive: true });

  const configPath = resolveConfigPath(opts.config);
  process.env.PAPERCLIP_CONFIG = configPath;
  loadPaperclipEnvFile(configPath);

  if (!configExists(configPath)) {
    console.warn(
      `[paperclipai start] No config.json found at: ${configPath} — relying on environment variables.`,
    );
  }

  // Resolve server/dist/index.js from the CLI dist output directory.
  // Both cli/dist/ and dist/cli/ (Railway copy) are two levels below the repo root,
  // so ../../server/dist/index.js always resolves to the built server.
  const cliDir = path.dirname(fileURLToPath(import.meta.url));
  const serverEntry = path.resolve(cliDir, "../../server/dist/index.js");

  if (!fs.existsSync(serverEntry)) {
    console.error(
      `[paperclipai start] Server build not found at: ${serverEntry}\n` +
        `Run the build first: pnpm --filter @paperclipai/server build`,
    );
    process.exit(1);
  }

  console.log(`[paperclipai start] Starting server (instance: ${instanceId})...`);

  let mod: ServerModule;
  try {
    mod = await import(pathToFileURL(serverEntry).href) as ServerModule;
  } catch (err) {
    console.error("[paperclipai start] Failed to import server:", err);
    process.exit(1);
  }

  if (typeof mod.startServer !== "function") {
    console.error("[paperclipai start] server/dist/index.js did not export startServer()");
    process.exit(1);
  }

  await mod.startServer();
}
