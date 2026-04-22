import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAuxLLM, getAuxBackendInfo } from "../lib/auxiliary-client.js";

// ── env helpers ──────────────────────────────────────────────────────────────

const AUX_ENV_VARS = [
  "PAPERCLIP_AUX_PROVIDER",
  "PAPERCLIP_AUX_MODEL",
  "PAPERCLIP_AUX_BASE_URL",
  "PAPERCLIP_AUX_API_KEY",
  "OPENROUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
] as const;

type AuxEnvVarName = (typeof AUX_ENV_VARS)[number];

let savedEnv: Partial<Record<AuxEnvVarName, string | undefined>> = {};

beforeEach(() => {
  savedEnv = {};
  for (const key of AUX_ENV_VARS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of AUX_ENV_VARS) {
    const saved = savedEnv[key];
    if (saved === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved;
    }
  }
  vi.restoreAllMocks();
});

function mockFetchOk(content: string, model = "test-model") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content } }],
          model,
        }),
    }),
  );
}

function mockAnthropicFetchOk(content: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ type: "text", text: content }],
          model: "claude-haiku-4-5-20251001",
        }),
    }),
  );
}

function mockFetchError(status: number, body = "error") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      text: () => Promise.resolve(body),
    }),
  );
}

// ── getAuxBackendInfo ─────────────────────────────────────────────────────────

describe("getAuxBackendInfo", () => {
  it("returns null when no credentials are set", () => {
    expect(getAuxBackendInfo()).toBeNull();
  });

  it("returns null when PAPERCLIP_AUX_PROVIDER=disabled", () => {
    process.env.PAPERCLIP_AUX_PROVIDER = "disabled";
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    expect(getAuxBackendInfo()).toBeNull();
  });

  it("prefers OPENROUTER_API_KEY in auto mode", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const info = getAuxBackendInfo();
    expect(info?.provider).toBe("openrouter");
  });

  it("falls back to ANTHROPIC_API_KEY when OpenRouter key is absent", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const info = getAuxBackendInfo();
    expect(info?.provider).toBe("anthropic");
    expect(info?.model).toBe("claude-haiku-4-5-20251001");
  });

  it("falls back to OPENAI_API_KEY when OpenRouter and Anthropic keys are absent", () => {
    process.env.OPENAI_API_KEY = "sk-oai-test";
    const info = getAuxBackendInfo();
    expect(info?.provider).toBe("openai");
    expect(info?.model).toBe("gpt-4o-mini");
  });

  it("respects PAPERCLIP_AUX_PROVIDER=anthropic even when OpenRouter key exists", () => {
    process.env.PAPERCLIP_AUX_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    const info = getAuxBackendInfo();
    expect(info?.provider).toBe("anthropic");
  });

  it("respects PAPERCLIP_AUX_MODEL override", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    process.env.PAPERCLIP_AUX_MODEL = "custom/my-model";
    const info = getAuxBackendInfo();
    expect(info?.model).toBe("custom/my-model");
  });

  it("returns null for explicit provider when key is missing", () => {
    process.env.PAPERCLIP_AUX_PROVIDER = "openrouter";
    // No OPENROUTER_API_KEY set
    expect(getAuxBackendInfo()).toBeNull();
  });
});

// ── callAuxLLM ───────────────────────────────────────────────────────────────

describe("callAuxLLM", () => {
  it("returns null when no provider is configured", async () => {
    const result = await callAuxLLM({ messages: [{ role: "user", content: "hi" }] });
    expect(result).toBeNull();
  });

  it("returns null when provider is explicitly disabled", async () => {
    process.env.PAPERCLIP_AUX_PROVIDER = "disabled";
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    const result = await callAuxLLM({ messages: [{ role: "user", content: "hi" }] });
    expect(result).toBeNull();
  });

  it("calls OpenRouter chat completions endpoint", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-key";
    mockFetchOk("Hello world");

    const result = await callAuxLLM({ messages: [{ role: "user", content: "say hello" }] });

    expect(result).not.toBeNull();
    expect(result?.provider).toBe("openrouter");
    expect(result?.content).toBe("Hello world");

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("openrouter.ai");
    expect(url).toContain("/chat/completions");
    const body = JSON.parse(init.body as string);
    expect(body.messages).toEqual([{ role: "user", content: "say hello" }]);
  });

  it("calls Anthropic messages endpoint", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-key";
    mockAnthropicFetchOk("Anthropic response");

    const result = await callAuxLLM({ messages: [{ role: "user", content: "hi" }] });

    expect(result).not.toBeNull();
    expect(result?.provider).toBe("anthropic");
    expect(result?.content).toBe("Anthropic response");

    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("api.anthropic.com");
    expect(url).toContain("/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-key");
  });

  it("strips system messages from Anthropic conversation array", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-key";
    mockAnthropicFetchOk("ok");

    await callAuxLLM({
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "hi" },
      ],
    });

    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.system).toBe("You are helpful.");
    expect(body.messages.every((m: { role: string }) => m.role !== "system")).toBe(true);
  });

  it("uses custom OPENAI_BASE_URL when set", async () => {
    process.env.OPENAI_API_KEY = "sk-custom-key";
    process.env.OPENAI_BASE_URL = "https://my-custom.openai.azure.com/v1";
    mockFetchOk("custom response");

    await callAuxLLM({ messages: [{ role: "user", content: "hi" }] });

    const fetchMock = vi.mocked(fetch);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("my-custom.openai.azure.com");
  });

  it("respects PAPERCLIP_AUX_BASE_URL override", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-key";
    process.env.PAPERCLIP_AUX_BASE_URL = "https://my-proxy.example.com/v1";
    mockFetchOk("proxied");

    await callAuxLLM({ messages: [{ role: "user", content: "hi" }] });

    const fetchMock = vi.mocked(fetch);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("my-proxy.example.com");
  });

  it("throws on non-2xx HTTP response", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-key";
    mockFetchError(429, "rate limited");

    await expect(
      callAuxLLM({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow("429");
  });

  it("trims whitespace from content", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-key";
    mockFetchOk("  trimmed content  ");

    const result = await callAuxLLM({ messages: [{ role: "user", content: "hi" }] });
    expect(result?.content).toBe("trimmed content");
  });

  it("uses PAPERCLIP_AUX_API_KEY over the provider-specific key", async () => {
    process.env.PAPERCLIP_AUX_PROVIDER = "openrouter";
    process.env.PAPERCLIP_AUX_API_KEY = "sk-aux-override";
    process.env.OPENROUTER_API_KEY = "sk-or-real";
    mockFetchOk("ok");

    await callAuxLLM({ messages: [{ role: "user", content: "hi" }] });

    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer sk-aux-override");
  });
});
