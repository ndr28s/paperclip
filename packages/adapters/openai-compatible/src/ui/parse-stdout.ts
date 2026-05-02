import type { TranscriptEntry } from "@paperclipai/adapter-utils";

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function parseOpenAiCompatibleStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const parsed = asRecord(safeJsonParse(trimmed));
  if (!parsed) {
    return [{ kind: "stdout", ts, text: trimmed }];
  }

  const type = asString(parsed.type);

  if (type === "request_start") {
    const url = asString(parsed.url);
    const model = asString(parsed.model);
    return [
      {
        kind: "system",
        ts,
        text: `→ ${model || "model"} ${url ? `(${url})` : ""}`.trim(),
      },
    ];
  }

  if (type === "assistant") {
    const text = asString(parsed.text);
    if (!text) return [];
    return [{ kind: "assistant", ts, text }];
  }

  if (type === "result") {
    const inputTokens = asNumber(parsed.inputTokens);
    const outputTokens = asNumber(parsed.outputTokens);
    const cachedTokens = asNumber(parsed.cachedInputTokens);
    return [
      {
        kind: "result",
        ts,
        text: "Run completed",
        inputTokens,
        outputTokens,
        cachedTokens,
        costUsd: 0,
        subtype: "end",
        isError: false,
        errors: [],
      },
    ];
  }

  return [{ kind: "stdout", ts, text: trimmed }];
}
