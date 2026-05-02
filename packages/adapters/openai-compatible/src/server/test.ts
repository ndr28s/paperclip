import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import { asString, parseObject } from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_BASE_URL } from "../index.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((c) => c.level === "error")) return "fail";
  if (checks.some((c) => c.level === "warn")) return "warn";
  return "pass";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

interface ModelsListResponse {
  data?: Array<{ id?: unknown }>;
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const baseUrlRaw = asString(config.baseUrl, DEFAULT_BASE_URL).trim();
  const baseUrl = trimTrailingSlash(baseUrlRaw);
  const model = asString(config.model, "").trim();
  const apiKey = asString(config.apiKey, "").trim();

  if (!baseUrl) {
    checks.push({
      code: "openai_compatible_base_url_missing",
      level: "error",
      message: "Base URL is required.",
      hint: "Set adapterConfig.baseUrl, e.g. http://localhost:8000/v1",
    });
    return {
      adapterType: ctx.adapterType,
      status: summarizeStatus(checks),
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    checks.push({
      code: "openai_compatible_base_url_invalid",
      level: "error",
      message: `Invalid base URL: ${baseUrl}`,
    });
  }
  if (parsedUrl && parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    checks.push({
      code: "openai_compatible_base_url_protocol_invalid",
      level: "error",
      message: `Unsupported protocol: ${parsedUrl.protocol}`,
      hint: "Use http:// or https://",
    });
  }
  if (!parsedUrl) {
    return {
      adapterType: ctx.adapterType,
      status: summarizeStatus(checks),
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  checks.push({
    code: "openai_compatible_base_url_valid",
    level: "info",
    message: `Configured endpoint: ${baseUrl}`,
  });

  if (!model) {
    checks.push({
      code: "openai_compatible_model_required",
      level: "error",
      message: "Model id is required.",
      hint: "Set adapterConfig.model to a model id served by the endpoint.",
    });
  }

  // Probe /models
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let probeOk = false;
  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      checks.push({
        code: "openai_compatible_auth_failed",
        level: "warn",
        message: `Endpoint returned HTTP ${res.status} on /models.`,
        hint: "Set adapterConfig.apiKey if the endpoint requires authentication.",
      });
    } else if (!res.ok) {
      checks.push({
        code: "openai_compatible_models_probe_failed",
        level: "warn",
        message: `Endpoint /models returned HTTP ${res.status}.`,
        hint: "Verify the endpoint path. Common roots: http://localhost:8000/v1 (vLLM), http://localhost:11434/v1 (Ollama).",
      });
    } else {
      probeOk = true;
      const json = (await res.json()) as ModelsListResponse;
      const ids = Array.isArray(json?.data)
        ? json.data
            .map((entry) => (typeof entry?.id === "string" ? entry.id.trim() : ""))
            .filter((id) => id.length > 0)
        : [];
      checks.push({
        code: "openai_compatible_models_discovered",
        level: "info",
        message: `Discovered ${ids.length} model(s) at ${baseUrl}.`,
      });
      if (model && ids.length > 0) {
        if (ids.includes(model)) {
          checks.push({
            code: "openai_compatible_model_present",
            level: "info",
            message: `Configured model "${model}" is available.`,
          });
        } else {
          checks.push({
            code: "openai_compatible_model_not_found",
            level: "warn",
            message: `Configured model "${model}" was not in /models response.`,
            detail: ids.slice(0, 8).join(", "),
            hint: "Pick one of the listed model ids.",
          });
        }
      }
    }
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    checks.push({
      code: "openai_compatible_endpoint_unreachable",
      level: "error",
      message: aborted
        ? `Timed out reaching ${baseUrl}/models`
        : `Could not reach ${baseUrl}/models: ${err instanceof Error ? err.message : String(err)}`,
      hint: "Verify the server is running and the URL is correct.",
    });
  } finally {
    clearTimeout(timer);
  }

  if (probeOk && model) {
    // Optional: tiny chat completion smoke test.
    const smokeController = new AbortController();
    const smokeTimer = setTimeout(() => smokeController.abort(), 15000);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Respond with the single word: hello" }],
          max_tokens: 16,
          temperature: 0,
          stream: false,
        }),
        signal: smokeController.signal,
      });
      if (!res.ok) {
        const body = await res.text();
        checks.push({
          code: "openai_compatible_chat_probe_failed",
          level: "warn",
          message: `Chat probe returned HTTP ${res.status}.`,
          detail: body.slice(0, 240) || undefined,
        });
      } else {
        checks.push({
          code: "openai_compatible_chat_probe_passed",
          level: "info",
          message: "Chat completions probe succeeded.",
        });
      }
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      checks.push({
        code: "openai_compatible_chat_probe_failed",
        level: "warn",
        message: aborted
          ? "Chat probe timed out after 15s."
          : `Chat probe failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      clearTimeout(smokeTimer);
    }
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
