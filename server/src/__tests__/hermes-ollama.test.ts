import { describe, expect, it } from "vitest";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import { buildCustomProviderCtx } from "../adapters/registry.js";

function makeCtx(agentConfig: Record<string, unknown>): AdapterExecutionContext {
  return {
    runId: "run-1",
    agent: {
      id: "agent-1",
      companyId: "company-1",
      name: "Test Agent",
      adapterType: "hermes_local",
      adapterConfig: agentConfig,
    },
    runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
    config: {},
    context: {},
    onLog: async () => {},
  };
}

describe("buildCustomProviderCtx (Hermes + Ollama)", () => {
  it("returns ctx unchanged when provider is not custom and no baseUrl", () => {
    const ctx = makeCtx({ provider: "anthropic", model: "claude-sonnet-4" });
    expect(buildCustomProviderCtx(ctx)).toBe(ctx);
  });

  it("returns ctx unchanged when provider is auto", () => {
    const ctx = makeCtx({ provider: "auto" });
    expect(buildCustomProviderCtx(ctx)).toBe(ctx);
  });

  it("injects --provider custom when provider is 'custom'", () => {
    const ctx = makeCtx({ provider: "custom" });
    const result = buildCustomProviderCtx(ctx);
    const cfg = result.agent.adapterConfig as Record<string, unknown>;
    expect(cfg.provider).toBe("auto");
    expect(cfg.extraArgs).toEqual(["--provider", "custom"]);
  });

  it("injects --base-url when baseUrl is set", () => {
    const ctx = makeCtx({ baseUrl: "http://localhost:11434/v1" });
    const result = buildCustomProviderCtx(ctx);
    const cfg = result.agent.adapterConfig as Record<string, unknown>;
    expect(cfg.extraArgs).toContain("--base-url");
    expect(cfg.extraArgs).toContain("http://localhost:11434/v1");
  });

  it("injects both --provider and --base-url for Ollama config", () => {
    const ctx = makeCtx({
      provider: "custom",
      baseUrl: "http://localhost:11434/v1",
      model: "nous-hermes-3:latest",
    });
    const result = buildCustomProviderCtx(ctx);
    const cfg = result.agent.adapterConfig as Record<string, unknown>;
    expect(cfg.provider).toBe("auto");
    expect(cfg.extraArgs).toEqual([
      "--provider", "custom",
      "--base-url", "http://localhost:11434/v1",
    ]);
  });

  it("prepends injected args before existing extraArgs", () => {
    const ctx = makeCtx({
      provider: "custom",
      baseUrl: "http://localhost:11434/v1",
      extraArgs: ["--verbose"],
    });
    const result = buildCustomProviderCtx(ctx);
    const cfg = result.agent.adapterConfig as Record<string, unknown>;
    expect(cfg.extraArgs).toEqual([
      "--provider", "custom",
      "--base-url", "http://localhost:11434/v1",
      "--verbose",
    ]);
  });

  it("does not mutate the original context", () => {
    const originalConfig = { provider: "custom", baseUrl: "http://localhost:11434/v1" };
    const ctx = makeCtx(originalConfig);
    buildCustomProviderCtx(ctx);
    expect(ctx.agent.adapterConfig).toEqual(originalConfig);
  });

  it("ignores empty baseUrl string", () => {
    const ctx = makeCtx({ provider: "anthropic", baseUrl: "   " });
    expect(buildCustomProviderCtx(ctx)).toBe(ctx);
  });
});
