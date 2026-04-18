import fs from "node:fs";
import { loadPaperclipEnvFile } from "../config/env.js";
import { configExists, resolveConfigPath } from "../config/store.js";
import {
  describeLocalInstancePaths,
  resolvePaperclipHomeDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";
import { importServerEntry } from "./run.js";

interface StartOptions {
  config?: string;
  instance?: string;
}

/**
 * Production-mode server start. Unlike `run`, this command:
 * - Skips the interactive onboarding wizard
 * - Skips the doctor health-check prompts
 * - Requires a pre-existing config.json (errors out if missing)
 * - Is designed for containerized / CI deployments (Railway, Docker)
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
        `Run 'paperclipai onboard' or 'paperclipai run' to set up first, ` +
        `or set PAPERCLIP_CONFIG to an existing config.json path.`,
    );
    process.exit(1);
  }

  console.log(`[paperclipai start] Starting Paperclip server (instance: ${instanceId})...`);

  await importServerEntry();
}
