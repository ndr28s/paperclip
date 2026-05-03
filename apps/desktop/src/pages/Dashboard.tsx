import React, { useState, useEffect, useRef, useMemo } from "react";
import { KPIS, AGENTS as STATIC_AGENTS, ACTIVITY, DASHBOARD_APPROVALS, Agent, KPI } from "../data";
import { Icon } from "../components/Icon";
import { useCompany } from "../context/CompanyContext";
import { useDashboard, useAgents, useApprovals, useActivity, useIssues, RawIssue, RawActivity } from "../api/hooks";
import { transformAgent, transformApproval, transformActivity, centsToDisplay, actionLabel, stableSpark, agentInitials, agentColor, relativeTime } from "../api/transforms";
import { api } from "../api/client";

// ── Helpers ──
function formatDate(d: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function timeAgo(age: string): string {
  return age;
}

// ── StatusIcon ──
function StatusIcon({ status, size = 11 }: { status: string; size?: number }) {
  const s = size;
  switch (status) {
    case "active": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3.5" fill="currentColor"/><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1" opacity="0.4"/></svg>;
    case "thinking": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="3.5" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12.5" cy="8" r="1.4" fill="currentColor"/></svg>;
    case "idle": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.2l2 1.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
    case "paused": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="5" y="3.5" width="2" height="9" rx="0.5" fill="currentColor"/><rect x="9" y="3.5" width="2" height="9" rx="0.5" fill="currentColor"/></svg>;
    case "blocked": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11" r="0.8" fill="currentColor"/></svg>;
    default: return null;
  }
}

// ── Onboarding Checklist ──
function OnboardingChecklist({ agents, issues, activity }: {
  agents: Agent[];
  issues: RawIssue[] | null;
  activity: RawActivity[] | null;
}) {
  const checks = [
    { label: "첫 에이전트 고용", done: agents.length > 0 },
    { label: "첫 업무 만들기", done: (issues?.length ?? 0) > 0 },
    { label: "에이전트에 업무 배정", done: (issues ?? []).some(i => !!i.assigneeAgentId) },
    { label: "결과 검토", done: (activity?.length ?? 0) > 0 },
  ];
  const doneCount = checks.filter(c => c.done).length;
  const allDone = doneCount === checks.length;
  if (allDone) return null;
  const pct = Math.round((doneCount / checks.length) * 100);

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>시작하기</h3>
        <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{doneCount}/{checks.length}</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-3)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--ok)", borderRadius: 2, transition: "width 0.4s" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checks.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 16, height: 16, borderRadius: 8, flexShrink: 0,
              background: step.done ? "var(--ok)" : "var(--bg-3)",
              border: step.done ? "none" : "1px solid var(--border-1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {step.done && <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l3 3 4-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ fontSize: 13, color: step.done ? "var(--fg-2)" : "var(--fg-0)", textDecoration: step.done ? "line-through" : "none" }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KPI Strip ──
function KPIStrip({ kpis }: { kpis: KPI[] }) {
  return (
    <div className="kpi-block" style={{ gridArea: "kpis" }}>
      <div className="kpi-strip">
        {kpis.map((k: KPI, i: number) => (
          <div className="kpi" key={i}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">
              {k.value} <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 400 }}>{k.sub}</span>
            </div>
            <div className={`kpi-delta delta-${k.deltaDir}`}>{k.delta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Simple Agent Card ──
function SimpleAgentCard({ agent, onNavigate, onAssignTask }: { agent: Agent; onNavigate?: (page: string) => void; onAssignTask?: (agentId: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusLabel: Record<string, string> = {
    active: "Active",
    thinking: "Thinking",
    idle: "Idle",
    paused: "Paused",
    blocked: "Needs your help",
  };
  const statusDotColor: Record<string, string> = {
    active: "var(--ok)",
    thinking: "var(--accent-fg)",
    idle: "var(--info)",
    paused: "var(--fg-2)",
    blocked: "var(--warn)",
  };
  const pct = Math.min(100, (agent.spent / agent.budget) * 100);
  const barClass = pct >= 100 ? "over" : pct >= 80 ? "warn" : "";
  const isIdle = agent.status === "idle";

  return (
    <div className="agent-card simple" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Head */}
      <div className="agent-head">
        <div className="agent-avatar" style={{ background: agent.color }}>
          {agent.initials}
          <span className="pulse" style={{ background: statusDotColor[agent.status] }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="agent-name">{agent.name}</div>
          <div className="agent-role">{agent.role}</div>
        </div>
        <div className={`agent-status status-${agent.status}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <StatusIcon status={agent.status} />
          {statusLabel[agent.status]}
        </div>
      </div>

      {/* Current task */}
      <div className="agent-task" style={{ fontSize: 12 }}>
        {isIdle ? (
          <span style={{ color: "var(--fg-2)", fontStyle: "italic" }}>
            Waiting for a task.{" "}
            <span style={{ color: "var(--accent-fg)", cursor: "pointer", textDecoration: "underline" }} onClick={() => onNavigate?.("agents")}>Assign one →</span>
          </span>
        ) : (
          <>
            <span className="task-tag">{agent.task.tag}</span>
            {agent.task.text}
          </>
        )}
      </div>

      {/* Action buttons + expand chevron */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => onNavigate?.("agents")}>Open chat</button>
        <button className="btn primary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => onAssignTask ? onAssignTask(agent.id) : onNavigate?.("agents")}>Assign task</button>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "1px solid var(--border-1)",
            borderRadius: 4,
            cursor: "pointer",
            color: "var(--fg-2)",
            fontSize: 11,
            padding: "3px 8px",
            lineHeight: 1,
          }}
          title="Show financial details"
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Expanded financial details */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-1)", marginBottom: 5 }}>
            <span>${agent.spent.toFixed(2)} / ${agent.budget.toFixed(0)} this month</span>
            <span style={{ color: "var(--fg-2)" }}>{agent.tasks24h} tasks today</span>
          </div>
          <div className="budget-bar">
            <div className={barClass} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dense Agent Card ──
function DenseAgentCard({ agent }: { agent: Agent }) {
  const pct = Math.min(100, (agent.spent / agent.budget) * 100);
  const barClass = pct >= 100 ? "over" : pct >= 80 ? "warn" : "";
  const statusLabel: Record<string, string> = { active: "Active", thinking: "Thinking", idle: "Idle", paused: "Paused", blocked: "Blocked" };
  const statusDotColor: Record<string, string> = { active: "var(--ok)", thinking: "var(--accent-fg)", idle: "var(--info)", paused: "var(--fg-2)", blocked: "var(--warn)" };
  return (
    <div className="agent-card">
      <div className="agent-head">
        <div className="agent-avatar" style={{ background: agent.color }}>
          {agent.initials}
          <span className="pulse" style={{ background: statusDotColor[agent.status] }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="agent-name">{agent.name}</div>
          <div className="agent-role">{agent.role}</div>
        </div>
        <div className={`agent-status status-${agent.status}`}>
          <StatusIcon status={agent.status} />
          {statusLabel[agent.status]}
        </div>
      </div>
      <div className="agent-task">
        <span className="task-tag">{agent.task.tag}</span>
        {agent.task.text}
      </div>
      <div className="agent-foot">
        <div className="budget">
          <div className="budget-row">
            <span className="budget-spent">${agent.spent.toFixed(2)}</span>
            <span className="budget-cap">/ ${agent.budget.toFixed(0)} mo</span>
          </div>
          <div className="budget-bar">
            <div className={barClass} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="agent-stat" title="Tasks last 24h">
          <span style={{ color: "var(--fg-0)" }}>{agent.tasks24h}</span>
          <span className="label">24h</span>
        </div>
      </div>
    </div>
  );
}

// ── Agents Section ──
function AgentsSection({ agents, onHireAgent, onNavigate, onAssignTask }: { agents: Agent[]; onHireAgent: () => void; onNavigate?: (page: string) => void; onAssignTask?: (agentId: string) => void }) {
  return (
    <section className="agents-section">
      <div className="section-head">
        <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-2)", margin: 0 }}>
          YOUR AGENTS
        </h2>
        <span className="count">{agents.length}</span>
        <span style={{ fontSize: 11, color: "var(--fg-3)", cursor: "help", marginLeft: 2 }} title="Agents currently in your company">?</span>
        <div className="head-actions" style={{ marginLeft: "auto" }}>
          <button className="btn primary" style={{ fontSize: 12 }} onClick={onHireAgent}>
            <Icon name="plus" size={12} /> Hire agent
          </button>
        </div>
      </div>
      <div className="agents-grid">
        {agents.map(a => <SimpleAgentCard key={a.id} agent={a} onNavigate={onNavigate} onAssignTask={onAssignTask} />)}
      </div>
    </section>
  );
}

// ── Things To Review Panel ──
interface LiveApproval {
  id: string;
  type: string;
  from: string;
  title: string;
  detail: string;
  age: string;
}

function ThingsToReviewPanel({ approvals, companyId, onAction }: { approvals: LiveApproval[] | null; companyId: string | null; onAction: () => void }) {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const useLive = approvals !== null;
  const source: LiveApproval[] = useLive
    ? approvals as LiveApproval[]
    : (DASHBOARD_APPROVALS as Array<{ type: string; from: string; title: string; detail: string; age: string }>).map((a, i) => ({ id: `static-${i}`, ...a }));
  const visible = source.filter(a => !resolved[a.id]);

  const typeBadgeColor: Record<string, string> = {
    deploy: "var(--info)",
    spend: "var(--warn)",
    hire: "var(--ok)",
    access: "var(--accent-fg)",
  };

  async function handleDecision(approvalId: string, decision: "approved" | "rejected") {
    setResolved(prev => ({ ...prev, [approvalId]: decision }));
    if (!useLive || !companyId || approvalId.startsWith("static-")) return;
    try {
      await api.patch(`/companies/${companyId}/approvals/${approvalId}`, { status: decision });
      onAction();
    } catch {
      // restore on failure
      setResolved(prev => { const next = { ...prev }; delete next[approvalId]; return next; });
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-2)", margin: 0 }}>
          THINGS TO REVIEW
        </h3>
        <span className="count">{visible.length}</span>
        <span
          style={{ fontSize: 11, color: "var(--fg-3)", cursor: "help", marginLeft: 2 }}
          title="Items that need your approval before agents can proceed"
        >?</span>
      </div>
      <div>
        {visible.length === 0 && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--ok)", fontSize: 13 }}>
            You're all caught up! ✓
          </div>
        )}
        {visible.map((a, i) => (
          <div className="approval" key={a.id} style={{ padding: "12px 14px", borderBottom: i < visible.length - 1 ? "1px solid var(--border-1)" : "none" }}>
            <div className="approval-head" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span
                className={`approval-tag ${a.type}`}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: typeBadgeColor[a.type] ?? "var(--bg-3)",
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {a.type}
              </span>
              <span className="approval-from" style={{ fontSize: 11, color: "var(--fg-2)", flex: 1 }}>{a.from}</span>
              <span className="approval-age" style={{ fontSize: 11, color: "var(--fg-3)" }}>{timeAgo(a.age)} ago</span>
            </div>
            <div className="approval-title" style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-0)", marginBottom: 2 }}>{a.title}</div>
            {a.detail && (
              <div className="approval-detail" style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 8 }}>{a.detail}</div>
            )}
            <div className="approval-actions" style={{ display: "flex", gap: 6 }}>
              <button
                className="btn approve"
                style={{ fontSize: 11, padding: "3px 10px", color: "var(--ok)", borderColor: "var(--ok)" }}
                onClick={() => handleDecision(a.id, "approved")}
              >
                ✓ Approve
              </button>
              <button
                className="btn deny"
                style={{ fontSize: 11, padding: "3px 10px", color: "var(--err)", borderColor: "var(--err)" }}
                onClick={() => handleDecision(a.id, "rejected")}
              >
                Reject
              </button>
              <button className="btn" style={{ fontSize: 11, padding: "3px 10px", marginLeft: "auto" }}>
                Discuss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── What's Been Happening Panel ──
interface LiveActivityItem {
  id: string;
  who: string;
  initials: string;
  color: string;
  action: string;
  subjectLabel: string;
  time: string;
}

function WhatsBeenHappeningPanel({ activity, onNavigate }: { activity: LiveActivityItem[] | null; onNavigate?: (page: string) => void }) {
  if (!activity) {
    // fall back to design-preview static data
    const shown = ACTIVITY.slice(0, 5);
    return (
      <div className="panel">
        <div className="panel-head">
          <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-2)", margin: 0 }}>
            WHAT'S BEEN HAPPENING
          </h3>
          <button className="ghost" style={{ marginLeft: "auto", fontSize: 11 }} onClick={() => onNavigate?.("activity")}>See all</button>
        </div>
        <div className="feed">
          {shown.map((a, i) => (
            <div className="feed-item" key={i}>
              <div className="feed-icon" style={{ background: a.color }}>{a.initials}</div>
              <div className="feed-text">
                <b>{a.who}</b>{" "}
                {a.textParts.map((part, j) => {
                  if (part.type === "pill") return <span key={j} className="pill">{part.content}</span>;
                  if (part.type === "bold") return <b key={j}>{part.content}</b>;
                  return <span key={j}>{part.content}</span>;
                })}
              </div>
              <div className="feed-time">{a.time}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const shown = activity.slice(0, 5);
  return (
    <div className="panel">
      <div className="panel-head">
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-2)", margin: 0 }}>
          WHAT'S BEEN HAPPENING
        </h3>
        <button className="ghost" style={{ marginLeft: "auto", fontSize: 11 }} onClick={() => onNavigate?.("activity")}>See all</button>
      </div>
      <div className="feed">
        {shown.length === 0 && (
          <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 12 }}>
            No recent activity yet.
          </div>
        )}
        {shown.map(a => (
          <div className="feed-item" key={a.id}>
            <div className="feed-icon" style={{ background: a.color }}>{a.initials}</div>
            <div className="feed-text">
              <b>{a.who}</b> {a.action} <b>{a.subjectLabel}</b>
            </div>
            <div className="feed-time">{a.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Create Task Modal ──
function CreateTaskModal({ open, companyId, agents, defaultAgentId, onClose, onCreated }: {
  open: boolean;
  companyId: string | null;
  agents: { id: string; name: string; title?: string | null }[];
  defaultAgentId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeAgentId, setAssigneeAgentId] = useState(defaultAgentId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(""); setDescription(""); setPriority("medium"); setAssigneeAgentId(defaultAgentId ?? ""); setError(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, defaultAgentId]);

  if (!open) return null;

  async function handleCreate() {
    if (!title.trim() || !companyId) return;
    setSubmitting(true); setError(null);
    try {
      await api.post(`/companies/${companyId}/issues`, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status: "backlog",
        assigneeAgentId: assigneeAgentId || null,
      });
      onCreated();
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} onClick={onClose} />
      <div style={{ position: "relative", zIndex: 1, background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 12, padding: "28px", width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--fg-0)" }}>새 업무 만들기</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
            제목 *
            <input ref={inputRef} type="text" value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleCreate(); if (e.key === "Escape") onClose(); }}
              placeholder="업무 제목"
              style={{ display: "block", width: "100%", marginTop: 5, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "8px 10px", color: "var(--fg-0)", fontSize: 13, boxSizing: "border-box" }}
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
            설명 (선택)
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="업무 설명..."
              style={{ display: "block", width: "100%", marginTop: 5, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "8px 10px", color: "var(--fg-0)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--fg-2)", flex: 1 }}>
              우선순위
              <select value={priority} onChange={e => setPriority(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 5, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "8px 10px", color: "var(--fg-0)", fontSize: 13 }}>
                <option value="urgent">긴급</option>
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)", flex: 1 }}>
              담당 에이전트 (선택)
              <select value={assigneeAgentId} onChange={e => setAssigneeAgentId(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 5, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "8px 10px", color: "var(--fg-0)", fontSize: 13 }}>
                <option value="">미배정</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}{a.title ? ` (${a.title})` : ""}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {error && <div style={{ fontSize: 12, color: "var(--err, #e55)", marginTop: 8 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid var(--border-1)", background: "transparent", color: "var(--fg-2)", fontSize: 13, cursor: "pointer" }}>취소</button>
          <button onClick={handleCreate} disabled={!title.trim() || submitting}
            style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: "var(--accent)", color: "white", fontSize: 13, fontWeight: 600, cursor: !title.trim() || submitting ? "not-allowed" : "pointer", opacity: !title.trim() || submitting ? 0.6 : 1 }}>
            {submitting ? "만드는 중..." : "만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Hire Modal ──
function DashboardHireModal({ open, companyId, ceoAgentId, onClose }: {
  open: boolean;
  companyId: string | null;
  ceoAgentId: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  function reset() { setName(""); setRole(""); setReason(""); setSubmitting(false); setError(null); setDone(false); }
  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!name.trim() || !role.trim() || !companyId) return;
    setSubmitting(true);
    setError(null);
    try {
      const description = [
        "## 고용 검토 요청",
        "",
        `**후보 역할**: ${role}`,
        `**이름 / 설명**: ${name}`,
        "",
        "## 요청 배경",
        "",
        reason.trim() || "(작성된 배경 없음)",
        "",
        "## CEO 검토 사항",
        "",
        "1. 해당 역할의 현재 필요성 평가",
        "2. 기존 에이전트로 커버 가능한지 확인",
        "3. 예산 적합성 및 ROI 검토",
        "4. 적합하다고 판단되면 → Approvals에서 Hire 요청 생성",
      ].join("\n");

      const issue = await api.post<{ id: string }>(`/companies/${companyId}/issues`, {
        title: `[고용 검토] ${role}: ${name}`,
        description,
        assigneeAgentId: ceoAgentId || null,
        status: "todo",
        priority: "high",
      });
      // Wake up the CEO so it processes the issue immediately
      if (ceoAgentId) {
        api.post(`/agents/${ceoAgentId}/wakeup`, {
          source: "assignment",
          payload: { issueId: issue.id },
        }).catch(() => {});
      }
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={handleClose} />
      <div style={{ position: "relative", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 10, padding: 24, width: 440, zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{done ? "요청 완료" : "Hire agent"}</h3>
          <button className="close-btn" onClick={handleClose}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)", marginBottom: 6 }}>CEO에게 검토 요청됨</div>
            <div style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 16 }}>CEO가 적합성을 평가 후 Approval 요청을 생성합니다.</div>
            <button className="btn primary" onClick={handleClose}>닫기</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
                역할 (Role) *
                <input
                  autoFocus
                  type="text"
                  placeholder="예: Backend Engineer, Data Analyst…"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "6px 10px", color: "var(--fg-0)", fontSize: 13, boxSizing: "border-box" }}
                />
              </label>
              <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
                이름 / 설명 *
                <input
                  type="text"
                  placeholder="예: Aria, Senior backend specialist…"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "6px 10px", color: "var(--fg-0)", fontSize: 13, boxSizing: "border-box" }}
                />
              </label>
              <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
                요청 배경 (선택)
                <textarea
                  placeholder="왜 이 에이전트가 필요한지 설명해주세요…"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  style={{ display: "block", width: "100%", marginTop: 4, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "6px 10px", color: "var(--fg-0)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
                />
              </label>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 8, padding: "8px 10px", background: "var(--bg-2)", borderRadius: 6 }}>
              CEO가 적합성 평가 후 Approval 요청을 생성합니다.
            </div>
            {error && <div style={{ fontSize: 12, color: "var(--err)", marginTop: 8 }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={handleClose}>취소</button>
              <button
                className="btn primary"
                disabled={!name.trim() || !role.trim() || submitting}
                onClick={handleSubmit}
              >{submitting ? "요청 중…" : "CEO에게 검토 요청"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Subbar ──
function Subbar({ onNewTask }: { onNewTask: () => void }) {
  const today = new Date();
  const dateStr = formatDate(today);
  return (
    <div className="subbar">
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>Dashboard 👋</span>
      <span style={{ fontSize: 13, color: "var(--fg-2)", marginLeft: 8 }}>{dateStr}</span>
      <div className="subbar-actions">
        <button className="btn primary" onClick={onNewTask}><Icon name="plus" size={12} /> New task</button>
      </div>
    </div>
  );
}

// ── Dashboard ──
export function Dashboard({ onNavigate }: { onNavigate?: (page: string) => void } = {}) {
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskAgentId, setCreateTaskAgentId] = useState<string | undefined>(undefined);
  const [hireOpen, setHireOpen] = useState(false);

  const { companyId, fetched } = useCompany();
  const { data: dashboard, loading: dashLoading } = useDashboard(companyId);
  const { data: rawAgents, loading: agentsLoading } = useAgents(companyId);
  const { data: rawApprovals, refetch: refetchApprovals } = useApprovals(companyId, "pending");
  const { data: rawActivity } = useActivity(companyId, 20);
  const { data: rawIssues } = useIssues(companyId);

  const ceoAgentId = useMemo(() => rawAgents?.find(a => a.role === "ceo")?.id ?? null, [rawAgents]);

  const liveAgents: Agent[] = useMemo(() => {
    if (!rawAgents) return [];
    const agentList = rawAgents.map(r => transformAgent(r));
    if (!rawIssues) return agentList;
    // Attach current task per agent (in_progress or in_review issue assigned to them)
    return agentList.map(a => {
      const issue = rawIssues.find(i => i.assigneeAgentId === a.id && (i.status === "in_progress" || i.status === "in_review"));
      if (issue) {
        return { ...a, task: { tag: issue.identifier || issue.id.slice(0, 8), text: issue.title } };
      }
      return { ...a, task: { tag: "—", text: "No active task" } };
    });
  }, [rawAgents, rawIssues]);

  const liveApprovals: LiveApproval[] | null = useMemo(() => {
    if (!rawApprovals) return fetched ? [] : null;
    return rawApprovals.map(raw => {
      const t = transformApproval(raw);
      const fromAgent = rawAgents?.find(ag => ag.id === t.from);
      return {
        id: t.id,
        type: t.type,
        from: fromAgent ? `${fromAgent.name} · ${fromAgent.title || fromAgent.role}` : t.from,
        title: t.title,
        detail: t.detail,
        age: t.age,
      };
    });
  }, [rawApprovals, rawAgents]);

  const liveActivity: LiveActivityItem[] | null = useMemo(() => {
    if (!rawActivity) return fetched ? [] : null;
    return rawActivity.map(raw => {
      const t = transformActivity(raw);
      const actorAgent = rawAgents?.find(ag => ag.id === t.actor);
      const who = actorAgent ? actorAgent.name : (raw.actorType === "user" ? "You" : "System");
      const initials = actorAgent ? agentInitials(actorAgent.name) : (raw.actorType === "user" ? "SA" : "SY");
      const color = actorAgent ? agentColor(actorAgent.id) : "#4A90E2";
      // Translate subject UUID -> readable
      let subjectLabel = "";
      if (t.subjectKind === "issue") {
        const issue = rawIssues?.find(i => i.id === t.subject);
        subjectLabel = issue ? (issue.identifier || issue.title.slice(0, 30)) : "an issue";
      } else if (t.subjectKind === "agent") {
        const ag = rawAgents?.find(x => x.id === t.subject);
        subjectLabel = ag ? ag.name : "an agent";
      } else if (t.subjectKind === "project") {
        subjectLabel = "a project";
      } else {
        subjectLabel = t.subjectKind || "";
      }
      return {
        id: t.id,
        who,
        initials,
        color,
        action: actionLabel(t.action),
        subjectLabel,
        time: relativeTime(raw.createdAt),
      };
    });
  }, [rawActivity, rawAgents, rawIssues]);

  const liveKpis: KPI[] = useMemo(() => {
    if (!dashboard) return fetched ? [] : KPIS;
    const activeAgentsValue = (dashboard.agents.active || 0) + (dashboard.agents.running || 0);
    const issuesValue = (dashboard.tasks.inProgress || 0) + (dashboard.tasks.open || 0);
    const approvalsValue = dashboard.pendingApprovals || 0;

    const agentsSpark = stableSpark("agents", 14, 6, 12);
    agentsSpark[agentsSpark.length - 1] = activeAgentsValue;
    const issuesSpark = stableSpark("issues", 14, 3, 15);
    issuesSpark[issuesSpark.length - 1] = issuesValue;
    const spendSpark = Array.from({ length: 14 }, () => 0);
    const approvalsSpark = stableSpark("approvals", 14, 0, 8);
    approvalsSpark[approvalsSpark.length - 1] = approvalsValue;

    return [
      { label: "Active agents", value: String(activeAgentsValue), sub: `of ${activeAgentsValue + (dashboard.agents.paused || 0) + (dashboard.agents.error || 0)}`, delta: "", deltaDir: "flat" as const, spark: agentsSpark },
      { label: "Issues in flight", value: String(issuesValue), sub: `${dashboard.tasks.blocked || 0} blocked`, delta: "", deltaDir: "flat" as const, spark: issuesSpark },
      { label: "Spend MTD", value: centsToDisplay(dashboard.costs.monthSpendCents || 0), sub: `of ${centsToDisplay(dashboard.costs.monthBudgetCents || 0)} cap`, delta: `${dashboard.costs.monthUtilizationPercent || 0}% of budget`, deltaDir: "flat" as const, spark: spendSpark },
      { label: "Approvals waiting", value: String(approvalsValue), sub: "", delta: "", deltaDir: "flat" as const, spark: approvalsSpark },
    ];
  }, [dashboard]);

  if (dashLoading && agentsLoading) {
    return <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--fg-3)" }}>Loading...</div></main>;
  }

  return (
    <main className="main beginner">
      <Subbar onNewTask={() => { setCreateTaskAgentId(undefined); setCreateTaskOpen(true); }} />
      <div className="content">
        <OnboardingChecklist agents={liveAgents} issues={rawIssues} activity={rawActivity} />
        <KPIStrip kpis={liveKpis} />
        <AgentsSection agents={liveAgents} onHireAgent={() => setHireOpen(true)} onNavigate={onNavigate} onAssignTask={(agentId) => { setCreateTaskAgentId(agentId); setCreateTaskOpen(true); }} />
        <div className="side-col">
          <ThingsToReviewPanel approvals={liveApprovals} companyId={companyId} onAction={refetchApprovals} />
          <WhatsBeenHappeningPanel activity={liveActivity} onNavigate={onNavigate} />
        </div>
      </div>
      <CreateTaskModal open={createTaskOpen} companyId={companyId} agents={rawAgents ?? []} defaultAgentId={createTaskAgentId} onClose={() => { setCreateTaskOpen(false); setCreateTaskAgentId(undefined); }} onCreated={() => { setCreateTaskOpen(false); setCreateTaskAgentId(undefined); }} />
      <DashboardHireModal open={hireOpen} companyId={companyId} ceoAgentId={ceoAgentId} onClose={() => setHireOpen(false)} />
    </main>
  );
}
