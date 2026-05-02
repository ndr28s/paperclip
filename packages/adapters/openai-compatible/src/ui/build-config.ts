import type { CreateConfigValues } from "@paperclipai/adapter-utils";
import { DEFAULT_BASE_URL, DEFAULT_MODEL } from "../index.js";

export function buildOpenAiCompatibleConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  const schema = (v.adapterSchemaValues ?? {}) as Record<string, unknown>;

  const baseUrl = stringValue(schema.baseUrl) || DEFAULT_BASE_URL;
  const model = stringValue(schema.model) || stringValue(v.model) || DEFAULT_MODEL;
  const apiKey = stringValue(schema.apiKey);
  const timeoutSec = numberValue(schema.timeoutSec);

  ac.baseUrl = baseUrl;
  ac.model = model;
  if (apiKey) ac.apiKey = apiKey;
  if (timeoutSec !== null) ac.timeoutSec = timeoutSec;
  if (v.promptTemplate) ac.promptTemplate = v.promptTemplate;

  return ac;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
