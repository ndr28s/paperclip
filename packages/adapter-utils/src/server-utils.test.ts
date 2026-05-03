import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderPaperclipWakePrompt, runChildProcess } from "./server-utils.js";

function isPidAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForPidExit(pid: number, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !isPidAlive(pid);
}

describe("runChildProcess", () => {
  it("waits for onSpawn before sending stdin to the child", async () => {
    const spawnDelayMs = 150;
    const startedAt = Date.now();
    let onSpawnCompletedAt = 0;

    const result = await runChildProcess(
      randomUUID(),
      process.execPath,
      [
        "-e",
        "let data='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>data+=chunk);process.stdin.on('end',()=>process.stdout.write(data));",
      ],
      {
        cwd: process.cwd(),
        env: {},
        stdin: "hello from stdin",
        timeoutSec: 5,
        graceSec: 1,
        onLog: async () => {},
        onSpawn: async () => {
          await new Promise((resolve) => setTimeout(resolve, spawnDelayMs));
          onSpawnCompletedAt = Date.now();
        },
      },
    );
    const finishedAt = Date.now();

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("hello from stdin");
    expect(onSpawnCompletedAt).toBeGreaterThanOrEqual(startedAt + spawnDelayMs);
    expect(finishedAt - startedAt).toBeGreaterThanOrEqual(spawnDelayMs);
  });

  it.skipIf(process.platform === "win32")("kills descendant processes on timeout via the process group", async () => {
    let descendantPid: number | null = null;

    const result = await runChildProcess(
      randomUUID(),
      process.execPath,
      [
        "-e",
        [
          "const { spawn } = require('node:child_process');",
          "const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
          "process.stdout.write(String(child.pid));",
          "setInterval(() => {}, 1000);",
        ].join(" "),
      ],
      {
        cwd: process.cwd(),
        env: {},
        timeoutSec: 1,
        graceSec: 1,
        onLog: async () => {},
        onSpawn: async () => {},
      },
    );

    descendantPid = Number.parseInt(result.stdout.trim(), 10);
    expect(result.timedOut).toBe(true);
    expect(Number.isInteger(descendantPid) && descendantPid > 0).toBe(true);

    expect(await waitForPidExit(descendantPid!, 2_000)).toBe(true);
  });
});

describe("renderPaperclipWakePrompt", () => {
  const baseIssue = {
    id: "issue-1",
    identifier: "GLI-2",
    title: "CTO 고용",
    status: "todo",
    priority: "high",
  };

  it("renders the Past Experience section when entries are present", () => {
    const prompt = renderPaperclipWakePrompt({
      reason: "issue_updated",
      issue: baseIssue,
      pastExperience: [
        "[GLI-1] Hire flow requires CEO sign-off above $500/mo",
        "[GLI-3] pnpm typecheck must run before merging strict-mode changes",
      ],
    });
    expect(prompt).toContain("## Past Experience");
    expect(prompt).toContain("- [GLI-1] Hire flow requires CEO sign-off above $500/mo");
    expect(prompt).toContain("- [GLI-3] pnpm typecheck must run before merging strict-mode changes");
  });

  it("omits the Past Experience section when there are no entries", () => {
    const prompt = renderPaperclipWakePrompt({
      reason: "issue_updated",
      issue: baseIssue,
      pastExperience: [],
    });
    expect(prompt).not.toContain("Past Experience");
  });

  it("ignores empty/non-string past experience entries", () => {
    const prompt = renderPaperclipWakePrompt({
      reason: "issue_updated",
      issue: baseIssue,
      pastExperience: ["", "   ", 42 as unknown as string, "[GLI-9] keep me"],
    });
    expect(prompt).toContain("## Past Experience");
    expect(prompt).toContain("- [GLI-9] keep me");
    // Only one bullet under the Past Experience heading
    const bulletsUnderHeading = prompt
      .split("## Past Experience")[1]!
      .split("\n")
      .filter((line) => line.startsWith("- "));
    expect(bulletsUnderHeading).toHaveLength(1);
  });
});
