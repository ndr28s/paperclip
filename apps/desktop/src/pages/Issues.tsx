import React, { useState, useMemo, useEffect, useRef } from "react";
import { AGENTS as STATIC_AGENTS, ISSUES as STATIC_ISSUES, Issue, Agent } from "../data";
import { Icon } from "../components/Icon";
import { useCompany } from "../context/CompanyContext";
import { useIssues as useIssuesApi, useProjects as useProjectsApi, useAgents as useAgentsApi, useIssueRuns, useRunLog, RunForIssue } from "../api/hooks";
import { transformIssue, transformAgent } from "../api/transforms";
import { api } from "../api/client";
import { Markdown } from "../components/Markdown";

// Module-level fallback for components defined outside the Issues component
let _dynamicAgents: Agent[] = [];
const agentById = (id: string): Agent | undefined => _dynamicAgents.find(a => a.id === id);

function PriorityIcon({ p }: { p: string }) {
  if (p === "high") return <svg width={9} height={9} viewBox="0 0 10 10"><path d="M5 1 L9 9 L1 9 Z" fill="currentColor"/></svg>;
  if (p === "med")  return <svg width={9} height={9} viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" fill="currentColor"/></svg>;
  return <svg width={9} height={9} viewBox="0 0 10 10"><rect x="1.5" y="4" width="7" height="2" rx="1" fill="currentColor"/></svg>;
}

const PRIORITY_LABEL: Record<string, string> = { high: "High", med: "Med", low: "Low" };

const COLUMNS = [
  { id: "backlog",      title: "Backlog",     color: "#5C667A" },
  { id: "in_progress",  title: "In Progress", color: "#4A90E2" },
  { id: "in_review",    title: "In Review",   color: "#F5A623" },
  { id: "done",         title: "Done",        color: "#34C98A" },
];

const dueClass = (due: string) => {
  if (due === "Today") return "today";
  if (["Apr 25", "Apr 26", "Apr 27"].includes(due)) return "overdue";
  return "";
};

// ── Issue Card ──
function IssueCard({ issue, onOpen }: { issue: { id: string; title: string; priority: string; status: string; assignee: string; commentCount: number; due?: string; blocked?: boolean; rawId?: string }; onOpen?: (rawId: string) => void }) {
  const a = agentById(issue.assignee);
  return (
    <div
      className={`issue-card ${issue.blocked ? "blocked" : ""}`}
      onClick={() => issue.rawId && onOpen && onOpen(issue.rawId)}
      style={{ cursor: issue.rawId && onOpen ? "pointer" : undefined }}
    >
      <div className="issue-card-top">
        <span className="issue-id">{issue.id}</span>
        <span style={{ flex: 1 }} />
        <span className={`pri pri-${issue.priority}`}>
          <span className="pri-icon"><PriorityIcon p={issue.priority} /></span>
          {PRIORITY_LABEL[issue.priority]}
        </span>
      </div>
      <div className="issue-card-title">{issue.title}</div>
      <div className="issue-card-foot">
        <div className="issue-card-meta">
          {a && <div className="meta-item" title={`${a.name} · ${a.role}`}><div className="assignee-avatar" style={{ background: a.color }}>{a.initials}</div></div>}
          {issue.commentCount > 0 && (
            <span className="meta-item" title={`${issue.commentCount} comments`}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 4h10v6H7l-3 3v-3H3V4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
              {issue.commentCount}
            </span>
          )}
        </div>
        <div className="issue-card-meta">
          {issue.blocked && <span className="blocked-tag">⚠ Blocked</span>}
          {issue.due && <span className={`due ${dueClass(issue.due)}`}>{issue.due}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ──
function KanbanColumn({ col, issues, onAdd, onOpenIssue }: { col: typeof COLUMNS[0]; issues: { id: string; title: string; priority: string; status: string; assignee: string; commentCount: number; due?: string; blocked?: boolean; rawId?: string }[]; onAdd: (id: string) => void; onOpenIssue: (rawId: string) => void }) {
  return (
    <div className="kanban-col">
      <div className="kanban-col-head">
        <span className="dot" style={{ background: col.color }} />
        <span className="col-title">{col.title}</span>
        <span className="col-count">{issues.length}</span>
        <button className="add-btn" title={`Add to ${col.title}`} onClick={() => onAdd(col.id)}>
          <Icon name="plus" size={11} />
        </button>
      </div>
      <div className="kanban-cards">
        {issues.length === 0
          ? <div className="col-empty">Nothing here yet.</div>
          : issues.map(i => <IssueCard key={i.id} issue={i} onOpen={onOpenIssue} />)}
      </div>
    </div>
  );
}

// ── List View ──
function IssueListView({ issues, onOpenIssue }: { issues: { id: string; title: string; priority: string; status: string; assignee: string; project: string; commentCount: number; due?: string; blocked?: boolean; rawId?: string }[]; onOpenIssue: (rawId: string) => void }) {
  return (
    <div className="issues-list">
      <div className="issues-list-header">
        <span>ID</span><span>Title</span><span>Status</span><span>Assignee</span><span>Priority</span><span>Due</span>
      </div>
      <div className="issues-list-body">
        {issues.map(i => {
          const a = agentById(i.assignee);
          const col = COLUMNS.find(c => c.id === i.status);
          return (
            <div
              className="issue-list-row"
              key={i.id}
              onClick={() => i.rawId && onOpenIssue(i.rawId)}
              style={{ cursor: i.rawId ? "pointer" : undefined }}
            >
              <span className="id-cell">{i.id}</span>
              <span className="title-cell">
                {i.blocked && <span title="Blocked" style={{ color: "var(--err)" }}>⚠</span>}
                <span className="title-text">{i.title}</span>
              </span>
              <span className="status-cell">
                <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: col?.color, display: "inline-block" }} />
                {col?.title}
              </span>
              <span className="assignee-cell">
                {a && <div className="assignee-avatar" style={{ background: a.color }}>{a.initials}</div>}
                <span className="name">{a ? a.name : "—"}</span>
              </span>
              <span className={`pri pri-${i.priority}`} style={{ width: "fit-content" }}>
                <span className="pri-icon"><PriorityIcon p={i.priority} /></span>
                {PRIORITY_LABEL[i.priority]}
              </span>
              <span className={`due-cell ${dueClass(i.due || "")}`}>{i.due || "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Quick Create Modal ──
function QuickCreate({ open, onClose, defaultStatus, companyId, onCreated }: { open: boolean; onClose: () => void; defaultStatus: string; companyId: string | null; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [pri, setPri] = useState("med");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => { if (open) setStatus(defaultStatus); }, [open, defaultStatus]);

  async function handleCreate() {
    if (!title.trim() || !companyId) return;
    setCreating(true);
    setError(null);
    try {
      const apiPriority = pri === "med" ? "medium" : pri;
      await api.post(`/companies/${companyId}/issues`, {
        title: title.trim(),
        status,
        priority: apiPriority,
        assigneeAgentId: assignee || null,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  }

  if (!open) return null;
  return (
    <div className="qc-overlay" onClick={onClose}>
      <div className="qc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qc-head">
          <h3>New issue</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="qc-body">
          <input className="qc-title-input" autoFocus placeholder="Issue title…" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate(); }} />
          <textarea className="qc-desc-input" placeholder="Add a description (optional)…" />
          <div className="qc-row">
            <select className="qc-chip set" value={status} onChange={e => setStatus(e.target.value)} style={{ background: "var(--bg-2)", color: "var(--fg-0)" }}>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select className="qc-chip set" value={pri} onChange={e => setPri(e.target.value)} style={{ background: "var(--bg-2)", color: "var(--fg-0)" }}>
              <option value="high">High priority</option>
              <option value="med">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <select className="qc-chip" value={assignee} onChange={e => setAssignee(e.target.value)} style={{ background: "var(--bg-2)", color: "var(--fg-0)" }}>
              <option value="">No assignee</option>
              {_dynamicAgents.map((a: Agent) => <option key={a.id} value={a.id}>{a.name} · {a.role}</option>)}
            </select>
          </div>
          {error && <div style={{ color: "var(--err)", fontSize: 12, marginTop: 4 }}>{error}</div>}
        </div>
        <div className="qc-foot">
          <span className="hint">Press <span className="kbd-inline">⌘ ↵</span> to create</span>
          <div className="actions">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={!title.trim() || creating} onClick={handleCreate}>{creating ? "Creating…" : "Create issue"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Issue Side Panel ──
interface PanelIssue {
  id: string;
  rawId?: string;
  title: string;
  priority: string;
  status: string;
  assignee: string;
  project: string;
  openedBy: string;
  openedByIsUser?: boolean;
  description?: string | null;
}

// ── Run Log Item ──
function RunLogItem({ run, agents }: { run: RunForIssue; agents: Agent[] }) {
  const [expanded, setExpanded] = useState(false);
  const { data: logText, loading: logLoading } = useRunLog(expanded ? run.runId : null);
  const agent = agents.find(a => a.id === run.agentId);

  const statusColor = run.status === "running" ? "var(--info)"
    : run.status === "succeeded" ? "var(--ok)"
    : run.status === "failed" ? "var(--err)"
    : "var(--fg-3)";

  const startLabel = run.startedAt
    ? new Date(run.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "—";

  return (
    <div style={{ borderBottom: "1px solid var(--border-0)" }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "var(--fg-1)", flex: 1 }}>
          {agent ? agent.name : run.agentId.slice(0, 8)}
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{startLabel}</span>
        <span style={{ fontSize: 11, color: statusColor, textTransform: "capitalize" }}>{run.status}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: expanded ? "rotate(180deg)" : undefined, color: "var(--fg-3)", flexShrink: 0 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {expanded && (
        <div style={{ paddingBottom: 8 }}>
          {logLoading ? (
            <div style={{ fontSize: 11, color: "var(--fg-3)", padding: "4px 0" }}>Loading log…</div>
          ) : logText ? (
            <pre style={{ fontSize: 11, fontFamily: "monospace", color: "var(--fg-1)", background: "var(--bg-0)", border: "1px solid var(--border-0)", borderRadius: 4, padding: 8, maxHeight: 400, overflowY: "auto", overflowX: "auto", whiteSpace: "pre", margin: 0 }}>{logText}</pre>
          ) : (
            <div style={{ fontSize: 11, color: "var(--fg-3)", padding: "4px 0" }}>No log available.</div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueSidePanel({ issue, agents, companyId, onClose, onChanged }: {
  issue: PanelIssue;
  agents: Agent[];
  companyId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const a = agents.find(x => x.id === issue.assignee);
  const col = COLUMNS.find(c => c.id === issue.status);
  const openedByAgent = agents.find(x => x.id === issue.openedBy);
  const openedByLabel = openedByAgent ? openedByAgent.name
    : issue.openedByIsUser ? "You"
    : issue.openedBy === "—" ? "—"
    : `${issue.openedBy.slice(0, 8)}…`;

  const { data: runs, refetch: refetchRuns } = useIssueRuns(issue.rawId ?? null);
  const hasRunning = (runs || []).some(r => r.status === "running");

  // Poll every 5s while any run is in "running" state
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (hasRunning) {
      pollRef.current = setInterval(() => refetchRuns(), 5000);
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [hasRunning, refetchRuns]);

  async function changeStatus(newStatus: string) {
    if (!companyId || !issue.rawId || saving) return;
    setSaving(true);
    try {
      await api.patch(`/issues/${issue.rawId}`, { status: newStatus });
      onChanged();
    } catch {
      // surface failure silently — UI will not advance
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="issue-panel-overlay" onClick={onClose} />
      <aside className="issue-panel" role="dialog" aria-label={`Issue ${issue.id}`}>
        <div className="issue-panel-header">
          <span className="issue-id" style={{ fontWeight: 600 }}>{issue.id}</span>
          <span className={`status-cell`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-1)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: col?.color || "var(--fg-3)", display: "inline-block" }} />
            {col?.title || issue.status}
          </span>
          <button className="close-btn" onClick={onClose} aria-label="Close" style={{ marginLeft: "auto" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="issue-panel-body">
          <div className="issue-panel-section">
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--fg-0)", lineHeight: 1.4 }}>{issue.title}</h2>
          </div>
          <div className="issue-panel-section">
            <div className="issue-panel-meta-grid">
              <div className="issue-panel-meta-item">
                <div className="issue-panel-section-label">Priority</div>
                <span className={`pri pri-${issue.priority}`} style={{ width: "fit-content" }}>
                  <span className="pri-icon"><PriorityIcon p={issue.priority} /></span>
                  {PRIORITY_LABEL[issue.priority] || issue.priority}
                </span>
              </div>
              <div className="issue-panel-meta-item">
                <div className="issue-panel-section-label">Assignee</div>
                {a ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div className="assignee-avatar" style={{ background: a.color }}>{a.initials}</div>
                    <span style={{ fontSize: 13, color: "var(--fg-0)" }}>{a.name}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--fg-3)" }}>Unassigned</span>
                )}
              </div>
              <div className="issue-panel-meta-item">
                <div className="issue-panel-section-label">Project</div>
                <span style={{ fontSize: 13, color: "var(--fg-1)" }}>{issue.project || "—"}</span>
              </div>
              <div className="issue-panel-meta-item">
                <div className="issue-panel-section-label">Status</div>
                <span style={{ fontSize: 13, color: "var(--fg-1)" }}>{col?.title || issue.status}</span>
              </div>
              <div className="issue-panel-meta-item">
                <div className="issue-panel-section-label">Opened by</div>
                <span style={{ fontSize: 13, color: "var(--fg-1)" }}>{openedByLabel}</span>
              </div>
            </div>
          </div>
          <div className="issue-panel-section">
            <div className="issue-panel-section-label">Description</div>
            {issue.description ? (
              <Markdown>{issue.description}</Markdown>
            ) : (
              <div style={{ fontSize: 13, color: "var(--fg-3)", fontStyle: "italic" }}>No description provided.</div>
            )}
          </div>
          <div className="issue-panel-section">
            <div
              onClick={() => setLogsOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: logsOpen ? "rotate(180deg)" : undefined, color: "var(--fg-3)", flexShrink: 0 }}>
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="issue-panel-section-label" style={{ cursor: "pointer", margin: 0 }}>실행 로그</span>
              {runs && runs.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: 2 }}>({runs.length})</span>
              )}
              {hasRunning && (
                <span style={{ fontSize: 10, color: "var(--info)", marginLeft: 4 }}>● 실행 중</span>
              )}
            </div>
            {logsOpen && (
              <div style={{ marginTop: 6 }}>
                {!runs || runs.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--fg-3)", fontStyle: "italic" }}>실행 기록이 없습니다.</div>
                ) : (
                  runs.map(run => (
                    <RunLogItem key={run.runId} run={run} agents={agents} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="issue-panel-foot">
          <label style={{ fontSize: 12, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            Change status
            <select
              value={issue.status}
              onChange={e => changeStatus(e.target.value)}
              disabled={saving || !issue.rawId}
              style={{ background: "var(--bg-2)", color: "var(--fg-0)", border: "1px solid var(--border-1)", borderRadius: 4, padding: "4px 8px", fontSize: 12 }}
            >
              <option value="backlog">Backlog</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </aside>
    </>
  );
}

// ── Issues Page ──
export function Issues() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [activeAssignees, setActiveAssignees] = useState<Set<string> | null>(null);
  const [qcOpen, setQcOpen] = useState(false);
  const [qcStatus, setQcStatus] = useState("backlog");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const { companyId, fetched } = useCompany();
  const { data: rawIssues, loading: issuesLoading, refetch: refetchIssues } = useIssuesApi(companyId);
  const { data: rawProjects } = useProjectsApi(companyId);
  const { data: rawAgents } = useAgentsApi(companyId);

  const AGENTS: Agent[] = useMemo(() => {
    if (!rawAgents) return [];
    return rawAgents.map(r => transformAgent(r));
  }, [rawAgents]);

  // Keep module-level reference in sync for sub-components
  _dynamicAgents = AGENTS;

  const projectMap = useMemo(() => {
    const m = new Map<string, string>();
    if (rawProjects) rawProjects.forEach(p => m.set(p.id, p.name));
    return m;
  }, [rawProjects]);

  type LiveIssue = {
    id: string; title: string; priority: string; status: string;
    assignee: string; project: string; commentCount: number; openedBy: string; openedByIsUser?: boolean;
    due?: string; blocked?: boolean; rawId?: string; projectId?: string | null;
    description?: string | null;
  };
  const ISSUES: LiveIssue[] = useMemo(() => {
    if (!rawIssues) return [];
    return rawIssues.map(r => ({
      ...transformIssue(r, projectMap),
      due: "",
      blocked: r.status === "blocked",
      description: r.description,
    }));
  }, [rawIssues, projectMap]);

  const blockedCount = useMemo(() => ISSUES.filter(i => i.status === "blocked" || i.blocked).length, [ISSUES]);
  const selectedIssue = useMemo(
    () => ISSUES.find(i => i.rawId === selectedIssueId) || null,
    [ISSUES, selectedIssueId]
  );

  const filtered = useMemo(() => {
    let list = ISSUES;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || i.project.toLowerCase().includes(q));
    }
    if (activeAssignees && activeAssignees.size > 0) list = list.filter(i => activeAssignees.has(i.assignee));
    return list;
  }, [ISSUES, search, activeAssignees]);

  const byStatus = useMemo(() => {
    const m: Record<string, typeof ISSUES> = {};
    for (const c of COLUMNS) m[c.id] = [];
    for (const i of filtered) (m[i.status] || (m[i.status] = [])).push(i);
    return m;
  }, [filtered]);

  const assigneeIds = useMemo(() => Array.from(new Set(ISSUES.map(i => i.assignee).filter(Boolean))), [ISSUES]);
  const toggleAssignee = (id: string) => {
    const next = new Set(activeAssignees || []);
    if (next.has(id)) next.delete(id); else next.add(id);
    setActiveAssignees(next.size === 0 ? null : next);
  };

  const openQuick = (status = "backlog") => { setQcStatus(status); setQcOpen(true); };

  if (issuesLoading) return <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--fg-3)" }}>Loading...</div></main>;

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div className="issues-page">
        <div className="issues-header">
          <div>
            <h1>Issues</h1>
            <div className="subhead">
              {ISSUES.length} issues across 4 columns
              {blockedCount > 0 && (
                <> · <span style={{ color: "var(--err)" }}>{blockedCount} blocked</span></>
              )}
              {" "}· {byStatus.in_review?.length ?? 0} waiting on you
            </div>
          </div>
          <div className="issues-header-actions">
            <div className="view-toggle">
              <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="3.5" height="12" rx="0.8" stroke="currentColor" strokeWidth="1.4"/><rect x="6.5" y="2" width="3.5" height="9" rx="0.8" stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="2" width="3.5" height="6" rx="0.8" stroke="currentColor" strokeWidth="1.4"/></svg>
                Board
              </button>
              <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                List
              </button>
            </div>
            <button className="btn">Filter</button>
            <button className="btn primary" onClick={() => openQuick("backlog")}><Icon name="plus" size={12} /> New issue</button>
          </div>
        </div>

        <div className="issues-toolbar">
          <div className="agents-search">
            <span className="search-icon"><Icon name="search" size={14} /></span>
            <input type="text" placeholder="Search by title, ID, or project…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="toolbar-spacer" />
          <div className="assignee-filters">
            <span className="label">Assignee</span>
            {assigneeIds.map(id => {
              const a = agentById(id);
              if (!a) return null;
              return (
                <div
                  key={id}
                  className={`assignee-pill ${activeAssignees && activeAssignees.has(id) ? "active" : ""} ${activeAssignees && !activeAssignees.has(id) ? "dim" : ""}`}
                  style={{ background: a.color }}
                  title={a.name}
                  onClick={() => toggleAssignee(id)}
                >
                  {a.initials}
                </div>
              );
            })}
            {activeAssignees && (
              <button className="btn" style={{ height: 24, padding: "0 8px", fontSize: 11.5, marginLeft: 4 }} onClick={() => setActiveAssignees(null)}>Clear</button>
            )}
          </div>
        </div>

        {view === "kanban" ? (
          <div className="kanban">
            {COLUMNS.map(c => <KanbanColumn key={c.id} col={c} issues={byStatus[c.id] ?? []} onAdd={openQuick} onOpenIssue={setSelectedIssueId} />)}
          </div>
        ) : (
          <IssueListView issues={filtered} onOpenIssue={setSelectedIssueId} />
        )}

        <QuickCreate open={qcOpen} onClose={() => setQcOpen(false)} defaultStatus={qcStatus} companyId={companyId} onCreated={() => refetchIssues()} />

        {selectedIssue && (
          <IssueSidePanel
            issue={selectedIssue}
            agents={AGENTS}
            companyId={companyId}
            onClose={() => setSelectedIssueId(null)}
            onChanged={() => refetchIssues()}
          />
        )}
      </div>
    </main>
  );
}
