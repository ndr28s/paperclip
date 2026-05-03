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

// ── Types ─────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface ChatResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
  error?: { message?: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function trimSlash(v: string) {
  return v.replace(/\/+$/, "");
}

function emitEvent(
  onLog: AdapterExecutionContext["onLog"],
  event: Record<string, unknown>,
): Promise<void> {
  return onLog("stdout", `${JSON.stringify(event)}\n`);
}

function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function resolveServerUrl(): string {
  if (process.env.PAPERCLIP_API_URL) return trimSlash(process.env.PAPERCLIP_API_URL);
  const rawHost =
    process.env.PAPERCLIP_LISTEN_HOST ?? process.env.HOST ?? "localhost";
  const port =
    process.env.PAPERCLIP_LISTEN_PORT ?? process.env.PORT ?? "3100";
  const host = (() => {
    const h = rawHost.trim();
    if (!h || h === "0.0.0.0" || h === "::") return "localhost";
    if (h.includes(":") && !h.startsWith("[") && !h.endsWith("]")) return `[${h}]`;
    return h;
  })();
  return `http://${host}:${port}`;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).host || "unknown";
  } catch {
    return "unknown";
  }
}

// ── Paperclip API client (agent JWT → local server) ───────────────────────

async function paperclipCall(
  serverUrl: string,
  authToken: string,
  runId: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${serverUrl}/api${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${authToken}`,
      "x-paperclip-run-id": runId,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// ── Tool definitions (OpenAI function-calling format) ─────────────────────

const PAPERCLIP_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_issue",
      description: "Get details of a specific issue by its UUID.",
      parameters: {
        type: "object",
        properties: {
          issue_id: { type: "string", description: "The issue UUID" },
        },
        required: ["issue_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_issues",
      description:
        "List issues for the company. Optionally filter by status.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description:
              "Filter by status: backlog, todo, in_progress, done, cancelled",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_issue",
      description:
        "Update an issue's status, assignee, priority, title, or description.",
      parameters: {
        type: "object",
        properties: {
          issue_id: { type: "string", description: "The issue UUID" },
          status: {
            type: "string",
            description:
              "New status: backlog, todo, in_progress, done, cancelled",
          },
          assignee_agent_id: {
            type: "string",
            description: "UUID of the agent to assign (null to unassign)",
          },
          priority: {
            type: "string",
            description: "urgent, high, medium, low, no_priority",
          },
          title: { type: "string", description: "New title" },
          description: {
            type: "string",
            description: "New description (Markdown)",
          },
        },
        required: ["issue_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_comment",
      description:
        "Add a comment to an issue. Use this to report progress, decisions, or blockers.",
      parameters: {
        type: "object",
        properties: {
          issue_id: { type: "string", description: "The issue UUID" },
          body: { type: "string", description: "Comment text (Markdown)" },
        },
        required: ["issue_id", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_approval",
      description:
        "Create an approval request. Use 'hire_agent' to request a new hire, 'approve_ceo_strategy' for strategic decisions, 'request_board_approval' for major changes.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "hire_agent",
              "approve_ceo_strategy",
              "budget_override_required",
              "request_board_approval",
            ],
            description: "Approval type",
          },
          payload: {
            type: "object",
            description:
              "For hire_agent: { name, role, title, reason }. For others: any relevant data.",
          },
          issue_id: {
            type: "string",
            description: "Optional: link this approval to an issue UUID",
          },
        },
        required: ["type", "payload"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_agents",
      description: "List all agents in the company.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_issue",
      description: "Create a new issue/task in the company.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: {
            type: "string",
            description: "Markdown body",
          },
          status: {
            type: "string",
            description: "backlog, todo, in_progress",
          },
          priority: {
            type: "string",
            description: "urgent, high, medium, low, no_priority",
          },
          assignee_agent_id: {
            type: "string",
            description: "Agent UUID to assign",
          },
        },
        required: ["title"],
      },
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────

async function executeTool(
  toolCall: ToolCall,
  serverUrl: string,
  authToken: string,
  runId: string,
  companyId: string,
  agentId: string,
): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
  } catch {
    return JSON.stringify({ error: "Invalid JSON arguments for tool call" });
  }

  const name = toolCall.function.name;

  try {
    if (name === "get_issue") {
      const r = await paperclipCall(
        serverUrl,
        authToken,
        runId,
        "GET",
        `/issues/${args.issue_id}`,
      );
      return JSON.stringify(
        r.ok ? r.data : { error: r.data, status: r.status },
      );
    }

    if (name === "list_issues") {
      const qs = args.status ? `?status=${args.status}` : "";
      const r = await paperclipCall(
        serverUrl,
        authToken,
        runId,
        "GET",
        `/companies/${companyId}/issues${qs}`,
      );
      return JSON.stringify(
        r.ok ? r.data : { error: r.data, status: r.status },
      );
    }

    if (name === "update_issue") {
      const patch: Record<string, unknown> = {};
      if (args.status !== undefined) patch.status = args.status;
      if (args.assignee_agent_id !== undefined)
        patch.assigneeAgentId = args.assignee_agent_id;
      if (args.priority !== undefined) patch.priority = args.priority;
      if (args.title !== undefined) patch.title = args.title;
      if (args.description !== undefined) patch.description = args.description;
      const r = await paperclipCall(
        serverUrl,
        authToken,
        runId,
        "PATCH",
        `/issues/${args.issue_id}`,
        patch,
      );
      return JSON.stringify(
        r.ok
          ? { success: true, data: r.data }
          : { error: r.data, status: r.status },
      );
    }

    if (name === "add_comment") {
      const r = await paperclipCall(
        serverUrl,
        authToken,
        runId,
        "POST",
        `/issues/${args.issue_id}/comments`,
        { body: args.body },
      );
      return JSON.stringify(
        r.ok ? { success: true } : { error: r.data, status: r.status },
      );
    }

    if (name === "create_approval") {
      const issueIds =
        typeof args.issue_id === "string" ? [args.issue_id] : [];
      const r = await paperclipCall(
        serverUrl,
        authToken,
        runId,
        "POST",
        `/companies/${companyId}/approvals`,
        {
          type: args.type,
          payload: args.payload ?? {},
          requestedByAgentId: agentId,
          issueIds,
        },
      );
      return JSON.stringify(
        r.ok
          ? { success: true, approval: r.data }
          : { error: r.data, status: r.status },
      );
    }

    if (name === "list_agents") {
      const r = await paperclipCall(
        serverUrl,
        authToken,
        runId,
        "GET",
        `/companies/${companyId}/agents`,
      );
      return JSON.stringify(
        r.ok ? r.data : { error: r.data, status: r.status },
      );
    }

    if (name === "create_issue") {
      const r = await paperclipCall(
        serverUrl,
        authToken,
        runId,
        "POST",
        `/companies/${companyId}/issues`,
        {
          title: args.title,
          description: args.description,
          status: args.status ?? "backlog",
          priority: args.priority ?? "medium",
          assigneeAgentId: args.assignee_agent_id ?? null,
        },
      );
      return JSON.stringify(
        r.ok
          ? { success: true, issue: r.data }
          : { error: r.data, status: r.status },
      );
    }

    return JSON.stringify({ error: `Unknown tool: ${name}` });
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Main execute ──────────────────────────────────────────────────────────

export async function execute(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const { runId, agent, config, context, onLog, onMeta, authToken } = ctx;

  const baseUrlRaw = asString(config.baseUrl, DEFAULT_BASE_URL).trim();
  const baseUrl = trimSlash(baseUrlRaw);
  const model = asString(config.model, DEFAULT_MODEL).trim();
  const apiKey = asString(config.apiKey, "").trim();
  const timeoutSec = asNumber(config.timeoutSec, 600);
  const temperature = asNumber(config.temperature, 0.7);
  const maxTokens = asNumber(config.maxTokens, 0);
  const maxToolRounds = asNumber(config.maxToolRounds, 10);
  const disableTools = config.disableTools === true;

  const systemPromptTemplate = asString(
    config.systemPrompt,
    [
      "You are {{agent.name}}, a {{agent.role}} in the Paperclip AI platform.",
      "You have tools to interact with the Paperclip system — use them.",
      "Don't just describe what you would do; actually call the tools to do it.",
      "When asked to hire someone, call create_approval with type='hire_agent'.",
      "When you finish a task, call update_issue to mark it done.",
      "Be concise and action-oriented.",
    ].join(" "),
  );
  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
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
    run: { id: runId },
    context,
  };

  const systemPrompt = renderTemplate(systemPromptTemplate, templateData);
  const heartbeatPrompt = renderTemplate(promptTemplate, templateData);
  const wakePrompt = renderPaperclipWakePrompt(
    parseObject(context.paperclipWake),
    { resumedSession: false },
  );
  const sessionHandoffNote = asString(
    context.paperclipSessionHandoffMarkdown,
    "",
  ).trim();
  const userPrompt = joinPromptSections([
    wakePrompt,
    sessionHandoffNote,
    heartbeatPrompt,
  ]);

  const serverUrl = resolveServerUrl();
  const useTools = Boolean(authToken) && !disableTools;

  const chatUrl = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  if (onMeta) {
    await onMeta({
      adapterType: "openai_compatible",
      command: `POST ${chatUrl}`,
      cwd: process.cwd(),
      commandArgs: [],
      commandNotes: [
        `model=${model}`,
        `baseUrl=${baseUrl}`,
        apiKey ? "apiKey=set" : "apiKey=unset",
        `tools=${useTools ? "enabled" : "disabled"}`,
      ],
      env: {},
      prompt: userPrompt,
      promptMetrics: {
        systemPromptChars: systemPrompt.length,
        promptChars: userPrompt.length,
        wakePromptChars: wakePrompt.length,
        sessionHandoffChars: sessionHandoffNote.length,
        heartbeatPromptChars: heartbeatPrompt.length,
      },
      context,
    });
  }

  await emitEvent(onLog, { type: "request_start", url: chatUrl, model });

  // ── Build initial messages ────────────────────────────────────────────

  const messages: ChatMessage[] = [];
  if (systemPrompt.trim()) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  // ── Agentic loop ──────────────────────────────────────────────────────

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCachedTokens = 0;
  let finalText = "";
  let rounds = 0;
  const maxRounds = useTools ? maxToolRounds : 1;

  while (rounds < maxRounds) {
    rounds++;

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      stream: false,
    };
    if (temperature >= 0 && temperature <= 2) requestBody.temperature = temperature;
    if (maxTokens > 0) requestBody.max_tokens = maxTokens;
    if (useTools && PAPERCLIP_TOOLS.length > 0) requestBody.tools = PAPERCLIP_TOOLS;

    const controller = new AbortController();
    const timer =
      timeoutSec > 0
        ? setTimeout(() => controller.abort(), timeoutSec * 1000)
        : null;

    let response: Response;
    try {
      response = await fetch(chatUrl, {
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
    let parsed: ChatResponse | null = null;
    try {
      parsed = responseText
        ? (JSON.parse(responseText) as ChatResponse)
        : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const apiMessage = parsed?.error?.message?.trim();
      const errorMessage =
        apiMessage ||
        `OpenAI-compatible API returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}.`;

      // If we sent tools and got a 4xx, the endpoint may not support function calling.
      // Retry once without tools so the agent can at least generate a text response.
      if (useTools && requestBody.tools && (response.status >= 400 && response.status < 500)) {
        await onLog(
          "stdout",
          `${JSON.stringify({ type: "tools_unsupported_fallback", status: response.status, message: errorMessage })}\n`,
        );
        delete requestBody.tools;
        const retryController = new AbortController();
        const retryTimer = timeoutSec > 0 ? setTimeout(() => retryController.abort(), timeoutSec * 1000) : null;
        let retryResponse: Response;
        try {
          retryResponse = await fetch(chatUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
            signal: retryController.signal,
          });
        } catch (retryErr) {
          if (retryTimer) clearTimeout(retryTimer);
          const retryAborted = retryErr instanceof Error && retryErr.name === "AbortError";
          const retryErrMsg = retryAborted ? `Request timed out after ${timeoutSec}s` : retryErr instanceof Error ? retryErr.message : String(retryErr);
          await onLog("stderr", `${retryErrMsg}\n`);
          return { exitCode: 1, signal: null, timedOut: retryAborted, errorMessage: retryErrMsg, provider: "openai_compatible", biller: hostnameFromUrl(baseUrl), model };
        }
        if (retryTimer) clearTimeout(retryTimer);
        const retryText = await retryResponse.text();
        let retryParsed: ChatResponse | null = null;
        try { retryParsed = retryText ? (JSON.parse(retryText) as ChatResponse) : null; } catch { retryParsed = null; }
        if (!retryResponse.ok) {
          const retryMsg = retryParsed?.error?.message?.trim() || `OpenAI-compatible API returned HTTP ${retryResponse.status}.`;
          await onLog("stderr", `${retryMsg}\n`);
          return { exitCode: 1, signal: null, timedOut: false, errorMessage: retryMsg, provider: "openai_compatible", biller: hostnameFromUrl(baseUrl), model };
        }
        // Use retryParsed as the result for this round (no tool calls possible)
        const retryChoice = retryParsed?.choices?.[0];
        const retryContent = retryChoice?.message?.content ?? null;
        totalInputTokens += retryParsed?.usage?.prompt_tokens ?? 0;
        totalOutputTokens += retryParsed?.usage?.completion_tokens ?? 0;
        totalCachedTokens += retryParsed?.usage?.prompt_tokens_details?.cached_tokens ?? 0;
        if (retryContent) {
          const displayed = stripThinkBlocks(retryContent);
          if (displayed) { await emitEvent(onLog, { type: "assistant", text: retryContent, round: rounds, note: "tools_disabled_fallback" }); finalText = displayed; }
        }
        break; // no tools available, end loop
      }

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
      };
    }

    const choice = parsed?.choices?.[0];
    const assistantMsg = choice?.message;
    const assistantContent = assistantMsg?.content ?? null;
    const toolCalls = assistantMsg?.tool_calls;

    totalInputTokens += parsed?.usage?.prompt_tokens ?? 0;
    totalOutputTokens += parsed?.usage?.completion_tokens ?? 0;
    totalCachedTokens +=
      parsed?.usage?.prompt_tokens_details?.cached_tokens ?? 0;

    // Push assistant message to history
    const historyMsg: ChatMessage = { role: "assistant", content: assistantContent };
    if (toolCalls && toolCalls.length > 0) historyMsg.tool_calls = toolCalls;
    messages.push(historyMsg);

    // Emit assistant text (stripping <think> blocks for cleaner logs)
    if (assistantContent) {
      const displayed = stripThinkBlocks(assistantContent);
      if (displayed) {
        await emitEvent(onLog, {
          type: "assistant",
          text: assistantContent,
          round: rounds,
        });
        finalText = displayed;
      }
    }

    // Handle tool calls
    if (toolCalls && toolCalls.length > 0 && useTools) {
      await emitEvent(onLog, {
        type: "tool_calls",
        count: toolCalls.length,
        names: toolCalls.map((t) => t.function.name),
      });

      for (const tc of toolCalls) {
        await emitEvent(onLog, {
          type: "tool_call",
          name: tc.function.name,
          args: tc.function.arguments,
        });
        const result = await executeTool(
          tc,
          serverUrl,
          authToken!,
          runId,
          agent.companyId,
          agent.id,
        );
        await emitEvent(onLog, {
          type: "tool_result",
          name: tc.function.name,
          result: result.slice(0, 500),
        });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
          name: tc.function.name,
        });
      }
      // Continue loop for next round
      continue;
    }

    // No tool calls → done
    break;
  }

  await emitEvent(onLog, {
    type: "result",
    finishReason: rounds >= maxRounds ? "max_rounds" : "stop",
    rounds,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cachedInputTokens: totalCachedTokens,
  });

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    errorMessage: null,
    usage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cachedInputTokens: totalCachedTokens,
    },
    provider: "openai_compatible",
    biller: hostnameFromUrl(baseUrl),
    model,
    billingType: "unknown",
    resultJson: null,
    summary: finalText || null,
  };
}
