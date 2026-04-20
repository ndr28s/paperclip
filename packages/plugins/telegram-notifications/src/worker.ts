import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import type { PluginEvent, Issue, Agent } from "@paperclipai/plugin-sdk";
import { escapeMarkdownV2, formatMarkdownV2, sendMessage } from "./telegram-api.js";

// ---------------------------------------------------------------------------
// Config shape resolved from instanceConfigSchema
// ---------------------------------------------------------------------------

interface TelegramConfig {
  botTokenRef: string;
  defaultChatId: string;
  approvalsChatId?: string;
  errorsChatId?: string;
  notifyOnIssueCreated?: boolean;
  notifyOnIssueDone?: boolean;
  notifyOnApproval?: boolean;
  notifyOnAgentRunStarted?: boolean;
  notifyOnAgentRunFinished?: boolean;
  notifyOnAgentRunFailed?: boolean;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtIssueCreated(issue: Issue): string {
  const id = issue.identifier ?? issue.id.slice(0, 8);
  const title = escapeMarkdownV2(issue.title);
  const priority = escapeMarkdownV2(issue.priority ?? "normal");
  return `📋 *New Issue \\[${escapeMarkdownV2(id)}\\]*\n*${title}*\nPriority: ${priority}`;
}

function fmtIssueDone(issue: Issue): string {
  const id = issue.identifier ?? issue.id.slice(0, 8);
  const title = escapeMarkdownV2(issue.title);
  return `✅ *Issue Done \\[${escapeMarkdownV2(id)}\\]*\n${title}`;
}

function fmtApprovalCreated(event: PluginEvent): string {
  const payload = event.payload as Record<string, unknown>;
  const title = escapeMarkdownV2(String(payload["title"] ?? "Approval requested"));
  const issueId = escapeMarkdownV2(String(payload["issueId"] ?? ""));
  return `🔔 *Approval Required*\n${title}${issueId ? `\nIssue: \`${issueId}\`` : ""}`;
}

function fmtAgentRunStarted(agent: Agent, runId: string): string {
  const name = escapeMarkdownV2(agent.name ?? agent.id.slice(0, 8));
  return `🚀 *Agent Run Started*\nAgent: \`${name}\`\nRun: \`${escapeMarkdownV2(runId.slice(0, 8))}\``;
}

function fmtAgentRunFinished(agent: Agent, runId: string): string {
  const name = escapeMarkdownV2(agent.name ?? agent.id.slice(0, 8));
  return `🏁 *Agent Run Finished*\nAgent: \`${name}\`\nRun: \`${escapeMarkdownV2(runId.slice(0, 8))}\``;
}

function fmtAgentRunFailed(agent: Agent, runId: string, error?: string): string {
  const name = escapeMarkdownV2(agent.name ?? agent.id.slice(0, 8));
  const errLine = error ? `\nError: ${escapeMarkdownV2(error.slice(0, 200))}` : "";
  return `❌ *Agent Run Failed*\nAgent: \`${name}\`\nRun: \`${escapeMarkdownV2(runId.slice(0, 8))}\`${errLine}`;
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const plugin = definePlugin({
  async setup(ctx) {
    const config = (await ctx.config.get()) as unknown as TelegramConfig;

    async function getToken(): Promise<string> {
      return ctx.secrets.resolve(config.botTokenRef);
    }

    async function notify(chatId: string, text: string): Promise<void> {
      const token = await getToken();
      await sendMessage(ctx.http, token, chatId, text);
    }

    // --- issue.created ---
    if (config.notifyOnIssueCreated !== false) {
      ctx.events.on("issue.created", async (event: PluginEvent) => {
        try {
          const issue = event.payload as Issue;
          await notify(config.defaultChatId, fmtIssueCreated(issue));
          await ctx.activity.log({
            companyId: event.companyId,
            message: `Telegram: notified issue created ${issue.id}`,
            entityType: "issue",
            entityId: issue.id,
          });
        } catch (err) {
          ctx.logger.error("telegram: issue.created notify failed", { err });
        }
      });
    }

    // --- issue.updated (detect done) ---
    if (config.notifyOnIssueDone !== false) {
      ctx.events.on("issue.updated", async (event: PluginEvent) => {
        try {
          const issue = event.payload as Issue;
          if (issue.status !== "done") return;

          // Deduplicate: only notify once per issue completion
          const stateKey = `done-notified`;
          const already = await ctx.state.get({
            scopeKind: "issue",
            scopeId: issue.id,
            stateKey,
          });
          if (already) return;

          await notify(config.defaultChatId, fmtIssueDone(issue));
          await ctx.state.set(
            { scopeKind: "issue", scopeId: issue.id, stateKey },
            true
          );
          await ctx.activity.log({
            companyId: event.companyId,
            message: `Telegram: notified issue done ${issue.id}`,
            entityType: "issue",
            entityId: issue.id,
          });
        } catch (err) {
          ctx.logger.error("telegram: issue.updated notify failed", { err });
        }
      });
    }

    // --- approval.created ---
    if (config.notifyOnApproval !== false) {
      ctx.events.on("approval.created", async (event: PluginEvent) => {
        try {
          const chatId = config.approvalsChatId ?? config.defaultChatId;
          await notify(chatId, fmtApprovalCreated(event));
          await ctx.activity.log({
            companyId: event.companyId,
            message: `Telegram: notified approval created`,
          });
        } catch (err) {
          ctx.logger.error("telegram: approval.created notify failed", { err });
        }
      });
    }

    // --- agent.run.started ---
    if (config.notifyOnAgentRunStarted === true) {
      ctx.events.on("agent.run.started", async (event: PluginEvent) => {
        try {
          const payload = event.payload as { agent: Agent; runId: string };
          await notify(config.defaultChatId, fmtAgentRunStarted(payload.agent, payload.runId));
        } catch (err) {
          ctx.logger.error("telegram: agent.run.started notify failed", { err });
        }
      });
    }

    // --- agent.run.finished ---
    if (config.notifyOnAgentRunFinished !== false) {
      ctx.events.on("agent.run.finished", async (event: PluginEvent) => {
        try {
          const payload = event.payload as { agent: Agent; runId: string };
          await notify(config.defaultChatId, fmtAgentRunFinished(payload.agent, payload.runId));
        } catch (err) {
          ctx.logger.error("telegram: agent.run.finished notify failed", { err });
        }
      });
    }

    // --- agent.run.failed ---
    if (config.notifyOnAgentRunFailed !== false) {
      ctx.events.on("agent.run.failed", async (event: PluginEvent) => {
        try {
          const payload = event.payload as { agent: Agent; runId: string; error?: string };
          const chatId = config.errorsChatId ?? config.defaultChatId;
          await notify(chatId, fmtAgentRunFailed(payload.agent, payload.runId, payload.error));
          await ctx.activity.log({
            companyId: event.companyId,
            message: `Telegram: notified agent run failed ${payload.runId}`,
          });
        } catch (err) {
          ctx.logger.error("telegram: agent.run.failed notify failed", { err });
        }
      });
    }

    ctx.logger.info("telegram-notifications plugin ready");
  },

  async onHealth() {
    return { status: "ok", message: "Telegram notifications plugin ready" };
  },

  async onValidateConfig(config) {
    const c = config as Partial<TelegramConfig>;
    const errors: string[] = [];
    if (!c.botTokenRef) errors.push("botTokenRef is required");
    if (!c.defaultChatId) errors.push("defaultChatId is required");
    return { ok: errors.length === 0, errors };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
