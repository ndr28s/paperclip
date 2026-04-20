import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

export const PLUGIN_ID = "paperclip.telegram-notifications";
export const PLUGIN_VERSION = "0.1.0";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Telegram Notifications",
  description:
    "Send issue, approval, and agent run notifications to Telegram chats.",
  author: "Paperclip",
  categories: ["connector", "automation"],
  capabilities: [
    "events.subscribe",
    "issues.read",
    "agents.read",
    "http.outbound",
    "secrets.read-ref",
    "plugin.state.read",
    "plugin.state.write",
    "activity.log.write",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  instanceConfigSchema: {
    type: "object",
    properties: {
      botTokenRef: {
        type: "string",
        title: "Bot Token (Secret Ref)",
        description:
          "Name of the secret that holds your Telegram bot token (e.g. TELEGRAM_BOT_TOKEN).",
      },
      defaultChatId: {
        type: "string",
        title: "Default Chat ID",
        description:
          "Telegram chat / channel ID that receives notifications when no override applies.",
      },
      approvalsChatId: {
        type: "string",
        title: "Approvals Chat ID (optional)",
        description:
          "Override chat for approval-required events. Falls back to defaultChatId.",
      },
      errorsChatId: {
        type: "string",
        title: "Errors Chat ID (optional)",
        description:
          "Override chat for agent run failures. Falls back to defaultChatId.",
      },
      notifyOnIssueCreated: {
        type: "boolean",
        title: "Notify on issue created",
        default: true,
      },
      notifyOnIssueDone: {
        type: "boolean",
        title: "Notify when issue is marked done",
        default: true,
      },
      notifyOnApproval: {
        type: "boolean",
        title: "Notify on approval requested",
        default: true,
      },
      notifyOnAgentRunStarted: {
        type: "boolean",
        title: "Notify when agent run starts",
        default: false,
      },
      notifyOnAgentRunFinished: {
        type: "boolean",
        title: "Notify when agent run finishes",
        default: true,
      },
      notifyOnAgentRunFailed: {
        type: "boolean",
        title: "Notify on agent run failure",
        default: true,
      },
    },
    required: ["botTokenRef", "defaultChatId"],
  },
};

export default manifest;
