import { useState, useEffect, useCallback } from "react";
import { api } from "./client";

function useApiData<T>(
  url: string | null,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    api.get<T>(url)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => { doFetch(); }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}

function useApiDataPolled<T>(
  url: string | null,
  intervalMs: number,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    api.get<T>(url)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    doFetch();
    const id = setInterval(doFetch, intervalMs);
    return () => clearInterval(id);
  }, [doFetch, intervalMs]);

  return { data, loading, error, refetch: doFetch };
}

export function useAgents(companyId: string | null) {
  return useApiData<RawAgent[]>(companyId ? `/companies/${companyId}/agents` : null);
}

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  status: string;
  reports: OrgNode[];
}

export function useOrg(companyId: string | null) {
  return useApiData<OrgNode[]>(companyId ? `/companies/${companyId}/org` : null);
}

export function useIssues(companyId: string | null, params?: { status?: string; projectId?: string }) {
  const search = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v != null) as [string, string][]).toString() : "";
  return useApiData<RawIssue[]>(companyId ? `/companies/${companyId}/issues${search ? "?" + search : ""}` : null, [search]);
}

export function useProjects(companyId: string | null) {
  return useApiData<RawProject[]>(companyId ? `/companies/${companyId}/projects` : null);
}

export function useGoals(companyId: string | null) {
  return useApiData<RawGoal[]>(companyId ? `/companies/${companyId}/goals` : null);
}

// Routines
export interface RawRoutineTrigger {
  id: string;
  routineId: string;
  type: string; // "cron" | "webhook" | "manual"
  config: Record<string, unknown>;
  status: string;
  createdAt: string;
}

export interface RawRoutine {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  status: string; // "active" | "paused" | "archived"
  agentId?: string | null;
  projectId?: string | null;
  prompt: string;
  concurrencyPolicy?: string | null;
  catchUpPolicy?: string | null;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  triggers?: RawRoutineTrigger[];
}

export interface RawRoutineRun {
  id: string;
  routineId: string;
  status: string; // "pending" | "running" | "success" | "failed" | "cancelled"
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  createdAt: string;
}

export function useRoutines(companyId: string | null) {
  return useApiDataPolled<RawRoutine[]>(companyId ? `/companies/${companyId}/routines` : null, 15000);
}

export function useRoutineRuns(routineId: string | null) {
  return useApiData<RawRoutineRun[]>(routineId ? `/routines/${routineId}/runs?limit=20` : null, [routineId]);
}

// Issue detail & comments
export interface RawIssueComment {
  id: string;
  issueId: string;
  body: string;
  authorUserId?: string | null;
  authorAgentId?: string | null;
  authorName?: string | null;
  createdAt: string;
}

export function useIssue(issueId: string | null) {
  return useApiData<RawIssue>(issueId ? `/issues/${issueId}` : null, [issueId]);
}

export function useIssueComments(issueId: string | null) {
  return useApiData<RawIssueComment[]>(issueId ? `/issues/${issueId}/comments` : null, [issueId]);
}

export function useApprovals(companyId: string | null, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return useApiDataPolled<RawApproval[]>(companyId ? `/companies/${companyId}/approvals${qs}` : null, 10000, [status]);
}

export function useActiveSession(companyId: string | null) {
  return useApiData<RawMeetingSession | null>(companyId ? `/companies/${companyId}/meeting-sessions/active` : null);
}

export function useMeetingMessages(companyId: string | null, sessionId: string | null) {
  return useApiData<RawMeetingMessage[]>(
    companyId && sessionId ? `/companies/${companyId}/meeting-sessions/${sessionId}/messages` : null,
    [sessionId]
  );
}

export function useActivity(companyId: string | null, limit = 200) {
  return useApiData<RawActivity[]>(companyId ? `/companies/${companyId}/activity?limit=${limit}` : null, [limit]);
}

export function useDashboard(companyId: string | null) {
  return useApiData<RawDashboard>(companyId ? `/companies/${companyId}/dashboard` : null);
}

export function useSidebarBadges(companyId: string | null) {
  return useApiDataPolled<RawSidebarBadges>(companyId ? `/companies/${companyId}/sidebar-badges` : null, 15000);
}

function daysToRange(days: number): string {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `?from=${fmt(from)}&to=${fmt(to)}`;
}

export function useCostsSummary(companyId: string | null, days = 30) {
  const range = daysToRange(days);
  return useApiData<RawCostsSummary>(companyId ? `/companies/${companyId}/costs/summary${range}` : null, [days]);
}

export function useCostsByAgent(companyId: string | null, days = 30) {
  const range = daysToRange(days);
  return useApiData<RawCostByAgent[]>(companyId ? `/companies/${companyId}/costs/by-agent${range}` : null, [days]);
}

export interface RunForIssue {
  runId: string;
  agentId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  logBytes: number;
}

export function useIssueRuns(issueId: string | null) {
  return useApiData<RunForIssue[]>(issueId ? `/issues/${issueId}/runs` : null, [issueId]);
}

export function useRunLog(runId: string | null) {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(() => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    api.getText(`/heartbeat-runs/${runId}/log`)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => { doFetch(); }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}

// Raw API types (from server)
export interface RawAgent {
  id: string;
  name: string;
  status: string;
  role: string;
  title?: string | null;
  reportsTo?: string | null;
  adapterType?: string | null;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  adapterConfig?: Record<string, unknown>;
  lastHeartbeatAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RawIssue {
  id: string;
  companyId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  identifier?: string | null;
  issueNumber?: number | null;
  createdByAgentId?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RawProject {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  status: string;
  leadAgentId?: string | null;
  targetDate?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RawGoal {
  id: string;
  companyId: string;
  title: string;
  description?: string | null;
  level: string;
  status: string;
  parentId?: string | null;
  ownerAgentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RawApproval {
  id: string;
  companyId: string;
  type: string;
  status: string;
  requestedByAgentId?: string | null;
  requestedByUserId?: string | null;
  payload: Record<string, unknown>;
  decisionNote?: string | null;
  decidedByUserId?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RawMeetingSession {
  id: string;
  companyId: string;
  agentId?: string | null;
  createdAt: string;
  endedAt?: string | null;
}

export interface RawMeetingMessage {
  id: string;
  sessionId: string;
  companyId: string;
  authorUserId?: string | null;
  authorAgentId?: string | null;
  body: string;
  createdAt: string;
}

export interface RawActivity {
  id: string;
  companyId: string;
  action: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string;
  agentId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface RawDashboard {
  companyId: string;
  agents: { active: number; running: number; paused: number; error: number };
  tasks: { open: number; inProgress: number; blocked: number; done: number };
  costs: { monthSpendCents: number; monthBudgetCents: number; monthUtilizationPercent: number };
  pendingApprovals: number;
}

export interface RawSidebarBadges {
  approvals: number;
  inbox: number;
  failedRuns: number;
  joinRequests: number;
}

export interface RawCostsSummary {
  companyId: string;
  spendCents: number;
  budgetCents: number;
  utilizationPercent: number;
}

export interface RawCostByAgent {
  agentId: string;
  agentName: string;
  agentStatus: string;
  costCents: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  subscriptionRunCount: number;
}
