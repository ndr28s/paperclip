import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  asNumber,
  asString,
  joinPromptSections,
  parseObject,
  renderPaperclipWakePrompt,
  renderTemplate,
} from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_BASE_URL, DEFAULT_MODEL } from "../index.js";

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: { role?: string; content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
  error?: { message?: string; type?: string; code?: string | number };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function emitEvent(
  onLog: AdapterExecutionContext["onLog"],
  event: Record<string, unknown>,
): Promise<void> {
  return onLog("stdout", `${JSON.stringify(event)}\n`);
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, config, context, onLog, onMeta } = ctx;

  const baseUrlRaw = asString(config.baseUrl, DEFAULT_BASE_URL).trim();
  const baseUrl = trimTrailingSlash(baseUrlRaw);
  const model = asString(config.model, DEFAULT_MODEL).trim();
  const apiKey = asString(config.apiKey, "").trim();
  const timeoutSec = asNumber(config.timeoutSec, 120);
  const temperature = asNumber(config.temperature, 0.7);
  const maxTokens = asNumber(config.maxTokens, 0);
  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
  );
  const systemPromptTemplate = asString(
    config.systemPrompt,
    "You are {{agent.name}}, a Paperclip agent. Respond concisely.",
  );

  if (!baseUrl) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "openai_compatible adapter requires baseUrl.",
    };
  }
  if (!model) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "openai_compatible adapter requires a model id.",
    };
  }

  const templateData = {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    company: { id: agent.companyId },
    agent,
    run: { id: runId, source: "on_demand" },
    context,
  };

  const systemPrompt = renderTemplate(systemPromptTemplate, templateData);
  const heartbeatPrompt = renderTemplate(promptTemplate, templateData);
  const wakePrompt = renderPaperclipWakePrompt(parseObject(context.paperclipWake), {
    resumedSession: false,
  });
  const sessionHandoffNote = asString(context.paperclipSessionHandoffMarkdown, "").trim();
  const userPrompt = joinPromptSections([wakePrompt, sessionHandoffNote, heartbeatPrompt]);

  const messages: ChatCompletionMessage[] = [];
  if (systemPrompt.trim()) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const url = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const requestBody: Record<string, unknown> = {
    model,
    messages,
    stream: false,
  };
  if (temperature >= 0 && temperature <= 2) requestBody.temperature = temperature;
  if (maxTokens > 0) requestBody.max_tokens = maxTokens;

  const promptMetrics = {
    systemPromptChars: systemPrompt.length,
    promptChars: userPrompt.length,
    wakePromptChars: wakePrompt.length,
    sessionHandoffChars: sessionHandoffNote.length,
    heartbeatPromptChars: heartbeatPrompt.length,
  };

  if (onMeta) {
    await onMeta({
      adapterType: "openai_compatible",
      command: `POST ${url}`,
      cwd: process.cwd(),
      commandArgs: [],
      commandNotes: [
        `model=${model}`,
        `baseUrl=${baseUrl}`,
        apiKey ? "apiKey=set" : "apiKey=unset",
      ],
      env: {},
      prompt: userPrompt,
      promptMetrics,
      context,
    });
  }

  await emitEvent(onLog, { type: "request_start", url, model });

  const controller = new AbortController();
  const timer = timeoutSec > 0 ? setTimeout(() => controller.abort(), timeoutSec * 1000) : null;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    const aborted = err instanceof Error && err.name === "AbortError";
    const errorMessage = aborted
      ? `Request timed out after ${timeoutSec}s`
      : err instanceof Error
        ? err.message
        : String(err);
    await onLog("stderr", `${errorMessage}\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut: aborted,
      errorMessage,
      provider: "openai_compatible",
      biller: hostnameFromUrl(baseUrl),
      model,
    };
  }
  if (timer) clearTimeout(timer);

  const responseText = await response.text();
  let parsed: ChatCompletionResponse | null = null;
  try {
    parsed = responseText ? (JSON.parse(responseText) as ChatCompletionResponse) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const apiMessage = parsed?.error?.message?.trim();
    const errorMessage =
      apiMessage ||
      `OpenAI-compatible API returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}.`;
    await onLog(
      "stderr",
      `${errorMessage}${responseText && !apiMessage ? `\n${responseText.slice(0, 500)}` : ""}\n`,
    );
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage,
      provider: "openai_compatible",
      biller: hostnameFromUrl(baseUrl),
      model,
      resultJson: parsed ? (parsed as unknown as Record<string, unknown>) : null,
    };
  }

  const choice = parsed?.choices?.[0];
  const assistantText = choice?.message?.content ?? "";

  if (assistantText) {
    await emitEvent(onLog, { type: "assistant", text: assistantText });
  }

  const inputTokens = parsed?.usage?.prompt_tokens ?? 0;
  const outputTokens = parsed?.usage?.completion_tokens ?? 0;
  const cachedInputTokens = parsed?.usage?.prompt_tokens_details?.cached_tokens ?? 0;

  await emitEvent(onLog, {
    type: "result",
    finishReason: choice?.finish_reason ?? null,
    inputTokens,
    outputTokens,
    cachedInputTokens,
  });

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    errorMessage: null,
    usage: {
      inputTokens,
      outputTokens,
      cachedInputTokens,
    },
    provider: "openai_compatible",
    biller: hostnameFromUrl(baseUrl),
    model,
    billingType: "unknown",
    resultJson: parsed ? (parsed as unknown as Record<string, unknown>) : null,
    summary: assistantText.trim() || null,
  };
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).host || "unknown";
  } catch {
    return "unknown";
  }
}
