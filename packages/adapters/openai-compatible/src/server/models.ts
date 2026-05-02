import type { AdapterModel } from "@paperclipai/adapter-utils";
import { DEFAULT_BASE_URL } from "../index.js";

interface ModelsListResponse {
  data?: Array<{ id?: unknown }>;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Discover models from an OpenAI-compatible endpoint.
 *
 * baseUrl/apiKey come from the agent's adapterConfig at request time. When
 * called without parameters this falls back to the localhost vLLM default —
 * useful for quick smoke checks but normally listModels() is called via the
 * server registry which forwards the agent's config.
 */
export async function listOpenAiCompatibleModels(opts: {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
} = {}): Promise<AdapterModel[]> {
  const baseUrl = trimTrailingSlash((opts.baseUrl ?? DEFAULT_BASE_URL).trim());
  if (!baseUrl) return [];
  const apiKey = (opts.apiKey ?? "").trim();
  const timeoutMs = opts.timeoutMs ?? 5000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as ModelsListResponse;
    if (!json || !Array.isArray(json.data)) return [];
    return json.data
      .map((entry) => (typeof entry?.id === "string" ? entry.id.trim() : ""))
      .filter((id) => id.length > 0)
      .map((id) => ({ id, label: id }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
