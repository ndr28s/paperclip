import fs from "node:fs";
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
 * - Imports @paperclipai/server directly (no dev-mode tsx detection)
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
    console.error(
      `[paperclipai start] No config found at: ${configPath}\n` +
        `Run 'paperclipai onboard' first, or set PAPERCLIP_CONFIG to an existing config.json path.`,
    );
    process.exit(1);
  }

  console.log(`[paperclipai start] Starting server (instance: ${instanceId})...`);

  let mod: ServerModule;
  try {
    mod = await import("@paperclipai/server") as ServerModule;
  } catch (err) {
    console.error("[paperclipai start] Failed to import @paperclipai/server:", err);
    process.exit(1);
  }

  if (typeof mod.startServer !== "function") {
    console.error("[paperclipai start] @paperclipai/server did not export startServer()");
    process.exit(1);
  }

  await mod.startServer();
}
