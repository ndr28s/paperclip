/**
 * Auxiliary LLM client for server-side side tasks.
 *
 * Provides a lightweight LLM interface for operations that don't need a full
 * agent adapter: title generation, summarization, classification.
 *
 * Resolution order (auto mode):
 *   1. OPENROUTER_API_KEY → OpenRouter (cheap flash model)
 *   2. ANTHROPIC_API_KEY  → Anthropic  (claude-haiku-4-5-20251001)
 *   3. OPENAI_API_KEY (+ optional OPENAI_BASE_URL) → OpenAI-compatible
 *   4. None → returns null (feature gracefully disabled)
 *
 * Override env vars:
 *   PAPERCLIP_AUX_PROVIDER = openrouter | anthropic | openai | disabled
 *   PAPERCLIP_AUX_MODEL    = model slug override
 *   PAPERCLIP_AUX_BASE_URL = custom base URL (openai-compatible)
 *   PAPERCLIP_AUX_API_KEY  = custom API key
 */

export type AuxProvider = "openrouter" | "anthropic" | "openai";
export type AuxTask = "title_generation" | "compression" | "general";

export interface AuxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AuxCallOptions {
  task?: AuxTask;
  messages: AuxMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface AuxCallResult {
  content: string;
  model: string;
  provider: AuxProvider;
}

interface ResolvedBackend {
  provider: AuxProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const ANTHROPIC_BASE_URL = "https://api.anthropic.com";
const OPENAI_BASE_URL = "https://api.openai.com/v1";

const DEFAULT_MODELS: Record<AuxProvider, string> = {
  openrouter: "google/gemini-flash-1.5-8b",
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
};

const DEFAULT_TIMEOUT_MS = 30_000;
const ANTHROPIC_API_VERSION = "2023-06-01";

function resolveBackend(): ResolvedBackend | null {
  const explicitProvider = process.env.PAPERCLIP_AUX_PROVIDER?.trim().toLowerCase();

  if (explicitProvider === "disabled") return null;

  const modelOverride = process.env.PAPERCLIP_AUX_MODEL?.trim() || undefined;
  const baseUrlOverride = process.env.PAPERCLIP_AUX_BASE_URL?.trim() || undefined;
  const apiKeyOverride = process.env.PAPERCLIP_AUX_API_KEY?.trim() || undefined;

  if (explicitProvider === "openrouter") {
    const apiKey = apiKeyOverride || process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) return null;
    return {
      provider: "openrouter",
      apiKey,
      baseUrl: baseUrlOverride || OPENROUTER_BASE_URL,
      model: modelOverride || DEFAULT_MODELS.openrouter,
    };
  }

  if (explicitProvider === "anthropic") {
    const apiKey = apiKeyOverride || process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) return null;
    return {
      provider: "anthropic",
      apiKey,
      baseUrl: baseUrlOverride || ANTHROPIC_BASE_URL,
      model: modelOverride || DEFAULT_MODELS.anthropic,
    };
  }

  if (explicitProvider === "openai") {
    const apiKey = apiKeyOverride || process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return null;
    return {
      provider: "openai",
      apiKey,
      baseUrl: baseUrlOverride || process.env.OPENAI_BASE_URL?.trim() || OPENAI_BASE_URL,
      model: modelOverride || DEFAULT_MODELS.openai,
    };
  }

  // Auto-detect: try each provider in priority order
  const openrouterKey = apiKeyOverride || process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    return {
      provider: "openrouter",
      apiKey: openrouterKey,
      baseUrl: baseUrlOverride || OPENROUTER_BASE_URL,
      model: modelOverride || DEFAULT_MODELS.openrouter,
    };
  }

  const anthropicKey = apiKeyOverride || process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    return {
      provider: "anthropic",
      apiKey: anthropicKey,
      baseUrl: baseUrlOverride || ANTHROPIC_BASE_URL,
      model: modelOverride || DEFAULT_MODELS.anthropic,
    };
  }

  const openaiKey = apiKeyOverride || process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      baseUrl: baseUrlOverride || process.env.OPENAI_BASE_URL?.trim() || OPENAI_BASE_URL,
      model: modelOverride || DEFAULT_MODELS.openai,
    };
  }

  return null;
}

async function callChatCompletions(
  backend: ResolvedBackend,
  messages: AuxMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number,
): Promise<string> {
  const url = `${backend.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${backend.apiKey}`,
  };
  if (backend.provider === "openrouter") {
    headers["http-referer"] = "https://paperclipai.com";
    headers["x-title"] = "Paperclip";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: backend.model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Auxiliary LLM HTTP ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Auxiliary LLM: unexpected response shape (no content)");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropicMessages(
  backend: ResolvedBackend,
  messages: AuxMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number,
): Promise<string> {
  const url = `${backend.baseUrl.replace(/\/$/, "")}/v1/messages`;

  const systemMessages = messages.filter((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");
  const system = systemMessages.map((m) => m.content).join("\n\n") || undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": backend.apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model: backend.model,
        messages: conversationMessages,
        max_tokens: maxTokens,
        temperature,
        ...(system ? { system } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Auxiliary LLM (Anthropic) HTTP ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = await response.json() as {
      content?: Array<{ type: string; text?: string }>;
    };
    const textBlock = data.content?.find((b) => b.type === "text");
    if (!textBlock || typeof textBlock.text !== "string") {
      throw new Error("Auxiliary LLM (Anthropic): unexpected response shape (no text block)");
    }
    return textBlock.text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call the auxiliary LLM with the given messages.
 *
 * Returns null when no provider is configured or when the provider is
 * explicitly set to "disabled". Never throws for missing provider; errors
 * from the network or API are re-thrown so callers can decide how to handle.
 */
export async function callAuxLLM(options: AuxCallOptions): Promise<AuxCallResult | null> {
  const backend = resolveBackend();
  if (!backend) return null;

  const {
    messages,
    maxTokens = 512,
    temperature = 0.3,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  let content: string;
  if (backend.provider === "anthropic") {
    content = await callAnthropicMessages(backend, messages, maxTokens, temperature, timeoutMs);
  } else {
    content = await callChatCompletions(backend, messages, maxTokens, temperature, timeoutMs);
  }

  return { content: content.trim(), model: backend.model, provider: backend.provider };
}

/**
 * Returns the resolved backend without making any API calls.
 * Useful for logging or health checks.
 */
export function getAuxBackendInfo(): { provider: AuxProvider; model: string } | null {
  const backend = resolveBackend();
  if (!backend) return null;
  return { provider: backend.provider, model: backend.model };
}
