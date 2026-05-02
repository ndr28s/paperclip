import type { RawAgent, RawIssue, RawProject, RawGoal, RawApproval, RawActivity } from "./hooks";

// Deterministic color from string (for agents without color field)
const AGENT_COLORS = [
  "#4A90E2", "#7AB7E8", "#A06CD5", "#34C98A", "#E8856A",
  "#3A6BB5", "#F5A623", "#C078E0", "#2BA774", "#5BA0E8",
  "#E8524A", "#D08F3F",
];

export function agentColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

export function agentInitials(name: string): string {
  return name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
}

export function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function auditPeriod(isoDate: string): "today" | "yesterday" | "this_week" | "older" {
  const now = new Date();
  const date = new Date(isoDate);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
  if (date >= todayStart) return "today";
  if (date >= yesterdayStart) return "yesterday";
  if (date >= weekStart) return "this_week";
  return "older";
}

export function formatTargetDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const ACTION_LABELS: Record<string, string> = {
  "issue.created": "created issue",
  "issue.updated": "updated issue",
  "issue.status_changed": "changed status of",
  "issue.comment_added": "commented on",
  "issue.assigned": "assigned",
  "issue.read_marked": "read",
  "agent.created": "added agent",
  "agent.updated": "updated agent",
  "agent.status_changed": "changed status of",
  "company.archived": "archived workspace",
  "project.created": "created project",
  "project.updated": "updated project",
  "meeting_session.created": "started meeting",
  "meeting_session.ended": "ended meeting",
  "approval.created": "requested approval",
  "approval.approved": "approved",
  "approval.rejected": "rejected",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action.split(".").join(" ");
}

export function stableSpark(seed: string, length = 14, min = 0, max = 10): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Array.from({ length }, () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) | 0;
    return min + Math.abs(h % (max - min + 1));
  });
}

export function centsToDisplay(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(0)}`;
}

export function transformAgent(raw: RawAgent) {
  const color = agentColor(raw.id);
  const initials = agentInitials(raw.name);
  const statusMap: Record<string, string> = {
    idle: "idle",
    running: "working",
    paused: "paused",
    error: "error",
    pending: "pending",
  };
  const uiStatus = statusMap[raw.status] ?? raw.status;
  const model = (raw.adapterConfig?.model as string) ?? (raw.adapterConfig?.defaultModel as string) ?? "—";
  return {
    id: raw.id,
    name: raw.name,
    role: raw.title || raw.role,
    initials,
    color,
    status: uiStatus as "active" | "working" | "idle" | "paused" | "blocked" | "error" | "pending",
    task: { tag: "—", text: "No active task" },
    spent: raw.spentMonthlyCents / 100,
    budget: raw.budgetMonthlyCents / 100,
    model,
    tasks24h: 0,
    reportsTo: raw.reportsTo,
  };
}

const PRIORITY_MAP: Record<string, string> = {
  high: "high", urgent: "high", critical: "high",
  medium: "med", med: "med", normal: "med", moderate: "med",
  low: "low", minor: "low", none: "low",
};

export function transformIssue(raw: RawIssue, projectMap: Map<string, string> = new Map()) {
  const priority = (PRIORITY_MAP[raw.priority?.toLowerCase?.()] || "low") as "high" | "med" | "low";
  return {
    id: raw.identifier || raw.id.slice(0, 8),
    title: raw.title,
    priority,
    status: raw.status as "backlog" | "todo" | "in_progress" | "in_review" | "done" | "blocked" | "cancelled",
    assignee: raw.assigneeAgentId || "",
    project: projectMap.get(raw.projectId || "") || "",
    commentCount: 0,
    openedBy: raw.createdByUserId || raw.createdByAgentId || "—",
    openedByIsUser: !!raw.createdByUserId && !raw.createdByAgentId,
    rawId: raw.id,
    projectId: raw.projectId,
  };
}

export function transformProject(raw: RawProject) {
  const initials = raw.name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
  const color = raw.color || agentColor(raw.id);
  const statusMap: Record<string, string> = {
    active: "active",
    in_progress: "active",
    paused: "paused",
    planned: "backlog",
    backlog: "backlog",
    archived: "paused",
  };
  return {
    id: raw.id,
    name: raw.name,
    color,
    status: (statusMap[raw.status] || "backlog") as "active" | "paused" | "backlog",
    lead: raw.leadAgentId || "",
    description: raw.description || "",
    target: formatTargetDate(raw.targetDate),
    goalsCount: 0,
    agents: 0,
    initials,
  };
}

export function transformGoal(raw: RawGoal) {
  const levelMap: Record<string, string> = {
    task: "Task",
    objective: "Tactical",
    strategy: "Strategic",
    company: "Strategic",
    team: "Tactical",
    individual: "Task",
  };
  const statusMap: Record<string, string> = {
    planned: "planned",
    active: "active",
    completed: "achieved",
    archived: "archived",
  };
  return {
    id: raw.id,
    project: "",
    title: raw.title,
    level: levelMap[raw.level] || raw.level,
    status: statusMap[raw.status] || raw.status,
    owner: raw.ownerAgentId || "",
    description: raw.description || "",
    parent: raw.parentId || null,
    precursor: null,
  };
}

export function transformApproval(raw: RawApproval) {
  const age = relativeTime(raw.createdAt);
  const payload = raw.payload || {};
  const title = (payload.title as string) || (payload.name as string) || raw.type.replace(/_/g, " ");
  const detail = (payload.detail as string) || (payload.summary as string) || "";
  const fromAgent = raw.requestedByAgentId || raw.requestedByUserId || "—";
  return {
    id: raw.id,
    type: raw.type,
    status: raw.status,
    from: fromAgent,
    title,
    detail,
    age,
    payload,
    rawCreatedAt: raw.createdAt,
  };
}

export function transformActivity(raw: RawActivity) {
  return {
    id: raw.id,
    kind: raw.entityType as "issue" | "meeting" | "approval" | "agent" | "project",
    actor: raw.agentId || raw.actorId,
    actorType: raw.actorType,
    action: raw.action,
    subject: raw.entityId,
    subjectKind: raw.entityType,
    at: auditPeriod(raw.createdAt),
    time: new Date(raw.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    details: raw.details,
  };
}
