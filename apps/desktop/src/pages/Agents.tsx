import React, { useState, useMemo, useEffect } from "react";
import { AGENTS as STATIC_AGENTS, Agent } from "../data";
import { Icon } from "../components/Icon";
import { useCompany } from "../context/CompanyContext";
import { useAgents as useAgentsApi, useActivity as useActivityApi, useIssues as useIssuesApi, RawIssue } from "../api/hooks";
import { transformAgent } from "../api/transforms";
import { api } from "../api/client";
import { OrgChart } from "./OrgChart";

// ── Status Icon ──
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

const STATUS_LABELS: Record<string, string> = { active: "Active", thinking: "Thinking", idle: "Idle", paused: "Paused", blocked: "Needs help" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "thinking", label: "Thinking" },
  { id: "idle", label: "Idle" },
  { id: "paused", label: "Paused" },
  { id: "blocked", label: "Needs help" },
];

const TOOLS_BY_ROLE: Record<string, string[]> = {
  "Head of Engineering": ["github", "linear", "slack", "shell", "claude-cli"],
  "Backend Engineer": ["github", "linear", "shell", "postgres", "redis"],
  "Product Designer": ["figma", "linear", "slack", "loom"],
  "Data Analyst": ["snowflake", "looker", "python", "slack"],
  "Customer Success": ["intercom", "salesforce", "slack", "gmail"],
  "DevOps": ["aws", "terraform", "datadog", "shell", "github"],
  "Finance Ops": ["quickbooks", "stripe", "ramp", "google-sheets"],
  "Growth Marketer": ["hubspot", "google-ads", "ahrefs", "slack"],
  "QA Engineer": ["github", "playwright", "linear", "shell"],
  "Sales Engineer": ["salesforce", "loom", "slack", "gong"],
  "Security": ["aws", "1password", "vanta", "github"],
  "Recruiter": ["greenhouse", "linkedin", "gmail", "calendly"],
};

const RECENT_BY_ID: Record<string, { s: string; t: string; time: string }[]> = {
  "ag-aria":  [{ s: "shipped", t: "ENG-409 · Migrated billing event writer to queue", time: "2h ago · 4 commits" }, { s: "review", t: "ENG-410 · PR open for new retry policy", time: "yesterday · awaiting Sam" }, { s: "shipped", t: "ENG-401 · Hotfix for stuck job_runs", time: "2 days ago" }],
  "ag-juno":  [{ s: "shipped", t: "ENG-415 · Indexes on telemetry_events", time: "5h ago" }, { s: "review", t: "ENG-417 · Refactor: extract pricing module", time: "yesterday" }],
  "ag-mira":  [{ s: "review", t: "DSN-29 · Three options for OrgChart empty state", time: "1h ago · awaiting you" }, { s: "shipped", t: "DSN-27 · New status indicators (icon + word)", time: "yesterday" }],
  "ag-rex":   [{ s: "shipped", t: "OPS-08 · Weekly retention report (W16)", time: "yesterday" }, { s: "shipped", t: "OPS-07 · Cohort segmentation script", time: "3 days ago" }],
  "ag-tess":  [{ s: "shipped", t: "CS-127 · Replied to 12 tickets", time: "today" }, { s: "review", t: "CS-125 · Drafted Acme follow-up", time: "30m ago · awaiting you" }],
  "ag-otto":  [{ s: "failed", t: "INF-77 · Deploy blocked — needs approval", time: "1h ago" }, { s: "shipped", t: "INF-72 · Rotated DB credentials", time: "yesterday" }],
  "ag-finn":  [{ s: "shipped", t: "FIN-03 · Reconciled March Stripe payouts", time: "5 days ago" }],
  "ag-lyra":  [{ s: "shipped", t: "GRO-19 · Pricing competitive scan", time: "yesterday" }],
  "ag-kai":   [{ s: "shipped", t: "QA-202 · Regression on PR #2840", time: "today" }, { s: "failed", t: "QA-201 · 5 flaky tests retried", time: "today" }],
  "ag-velo":  [{ s: "shipped", t: "SE-07 · Halcyon eval prep", time: "2 days ago" }],
  "ag-nyx":   [{ s: "review", t: "SEC-12 · IAM policy diff for analytics WH", time: "1h ago · awaiting you" }, { s: "shipped", t: "SEC-10 · Quarterly access review", time: "1 week ago" }],
  "ag-iris":  [{ s: "shipped", t: "HR-01 · Closed Q1 hiring loop", time: "1 week ago" }],
};

// ── Filter Tabs ──
function FilterTabs({ value, onChange, counts }: { value: string; onChange: (v: string) => void; counts: Record<string, number> }) {
  return (
    <div className="filter-tabs" role="tablist">
      {FILTERS.map(f => (
        <button key={f.id} className={`filter-tab ${value === f.id ? "active" : ""}`} onClick={() => onChange(f.id)}>
          {f.id !== "all" && <span className="ft-icon" style={{ color: `var(--${f.id === "blocked" ? "err" : f.id === "active" ? "ok" : f.id === "thinking" ? "info" : "fg-2"})` }}><StatusIcon status={f.id} size={11} /></span>}
          {f.label}
          <span className="ft-count">{counts[f.id] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

// ── Hire CEO Modal ──
function HireCeoModal({ open, companyId, onClose, onHired }: {
  open: boolean;
  companyId: string | null;
  onClose: () => void;
  onHired: () => void;
}) {
  const [name, setName] = useState("Alex");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleHire() {
    if (!name.trim() || !companyId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/companies/${companyId}/agents`, {
        name: name.trim(),
        role: "ceo",
        adapterType: "process",
        budgetMonthlyCents: 100000,
      });
      onHired();
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 10, padding: 28, width: 400, zIndex: 1 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>🎉 조직을 만들었습니다!</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
          조직을 이끌 CEO 에이전트를 바로 고용하세요. CEO가 다른 구성원 고용과 업무를 조율합니다.
        </p>
        <label style={{ fontSize: 12, color: "var(--fg-2)", display: "block", marginBottom: 12 }}>
          CEO 이름
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleHire(); if (e.key === "Escape") onClose(); }}
            style={{ display: "block", width: "100%", marginTop: 4, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "8px 10px", color: "var(--fg-0)", fontSize: 13, boxSizing: "border-box" }}
          />
        </label>
        {error && <div style={{ fontSize: 12, color: "var(--err)", marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>나중에</button>
          <button
            className="btn primary"
            disabled={!name.trim() || submitting || !companyId}
            onClick={handleHire}
          >{submitting ? "고용 중…" : "CEO 고용"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Hire Agent Modal ──
function HireAgentModal({ open, companyId, ceoAgentId, onClose }: {
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

      await api.post(`/companies/${companyId}/issues`, {
        title: `[고용 검토] ${role}: ${name}`,
        description,
        assigneeAgentId: ceoAgentId || null,
        status: "backlog",
        priority: "medium",
      });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

// ── Assign Task Modal ──
function AssignTaskModal({ agent, rawIssues, companyId, onClose }: {
  agent: Agent | null;
  rawIssues: RawIssue[] | null;
  companyId: string | null;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  if (!agent) return null;

  const candidates = (rawIssues || []).filter(i =>
    !i.assigneeAgentId &&
    (i.status === "backlog" || i.status === "todo" || i.status === "in_progress") &&
    (search.trim() === "" || i.title.toLowerCase().includes(search.toLowerCase()) || (i.identifier || "").toLowerCase().includes(search.toLowerCase()))
  );

  async function assign(issue: RawIssue) {
    if (!companyId || assigning) return;
    setAssigning(issue.id);
    try {
      await api.patch(`/issues/${issue.id}`, { assigneeAgentId: agent!.id });
      // Wakeup is best-effort — close the modal even if it fails
      api.post(`/agents/${agent!.id}/wakeup`, {
        source: "assignment",
        payload: { issueId: issue.id },
      }).catch(e => console.warn("Wakeup failed (non-blocking):", e));
      onClose();
    } catch (e) {
      console.error("Assign failed:", e);
      setAssigning(null);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 10, padding: 20, width: 480, maxHeight: "60vh", display: "flex", flexDirection: "column", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Assign task to {agent.name}</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <input
          autoFocus
          type="text"
          placeholder="Search issues…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "6px 10px", color: "var(--fg-0)", fontSize: 13, marginBottom: 10 }}
        />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {candidates.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>No unassigned issues found.</div>
          ) : candidates.map(i => (
            <div
              key={i.id}
              onClick={() => assign(i)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: assigning ? "not-allowed" : "pointer", opacity: assigning && assigning !== i.id ? 0.5 : 1 }}
              className="assign-issue-row"
            >
              <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "monospace", minWidth: 60 }}>{i.identifier || i.id.slice(0, 8)}</span>
              <span style={{ flex: 1, fontSize: 13, color: "var(--fg-0)" }}>{i.title}</span>
              <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "capitalize" }}>{i.status.replace("_", " ")}</span>
              {assigning === i.id && <span style={{ fontSize: 11, color: "var(--accent)" }}>Assigning…</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Agent Row ──
function AgentRow({ agent, selected, onSelect, onOpenChat }: { agent: Agent; selected: boolean; onSelect: (id: string) => void; onOpenChat: (agent: Agent) => void }) {
  const pct = Math.min(100, (agent.spent / agent.budget) * 100);
  const barClass = pct >= 100 ? "over" : pct >= 80 ? "warn" : "";
  return (
    <div className={`agent-row ${selected ? "selected" : ""}`} onClick={() => onSelect(agent.id)}>
      <div className="who">
        <div className="who-avatar" style={{ background: agent.color }}>{agent.initials}</div>
        <div className="who-meta">
          <div className="who-name">{agent.name}</div>
          <div className="who-role">{agent.role}</div>
        </div>
      </div>
      <div className="row-task">
        <span className="task-tag">{agent.task.tag}</span>
        <span className="task-text">{agent.task.text}</span>
      </div>
      <div className={`agent-status status-${agent.status}`} style={{ justifySelf: "start" }}>
        <StatusIcon status={agent.status} />
        {STATUS_LABELS[agent.status]}
      </div>
      <div className="row-spend">
        <div className="row-spend-text">
          <span>${agent.spent.toFixed(0)}</span>
          <span className="of">/ ${agent.budget}</span>
        </div>
        <div className="bar"><div className={barClass} style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="row-actions" onClick={(e) => e.stopPropagation()}>
        <button className="btn" title="Open chat" onClick={() => onOpenChat(agent)}>Chat</button>
        <button className="btn" onClick={() => onSelect(agent.id)} title="View details">Details</button>
      </div>
    </div>
  );
}

// ── Agent Detail ──
function AgentDetail({ agent, onClose, onOpenChat, onAssignTask }: { agent: Agent; onClose: () => void; onOpenChat: (agent: Agent) => void; onAssignTask: () => void }) {
  const pct = Math.min(100, (agent.spent / agent.budget) * 100);
  const barClass = pct >= 100 ? "over" : pct >= 80 ? "warn" : "";
  const tools = TOOLS_BY_ROLE[agent.role] || ["slack", "github"];
  const recent = RECENT_BY_ID[agent.id] || [];

  return (
    <div className="agent-detail">
      <div className="detail-head">
        <div className="top-row">
          <div className={`agent-status status-${agent.status}`}>
            <StatusIcon status={agent.status} />
            {STATUS_LABELS[agent.status]}
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close detail">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="detail-identity">
          <div className="detail-avatar" style={{ background: agent.color }}>{agent.initials}</div>
          <div>
            <h2>{agent.name}</h2>
            <div className="role">{agent.role}</div>
            <div className="id-meta">{agent.id} · {agent.model}</div>
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn primary" onClick={() => onOpenChat(agent)}>Open chat</button>
          <button className="btn" onClick={onAssignTask}>Assign task</button>
          <button className="btn" title="More"><Icon name="more" size={12} /></button>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-section">
          <h3>Current task</h3>
          <div className="detail-current-task">
            <span className="task-tag">{agent.task.tag}</span>
            <p>{agent.task.text}</p>
          </div>
        </div>

        <div className="detail-section">
          <h3>Last 24 hours</h3>
          <div className="detail-stats">
            <div className="detail-stat"><div className="lbl">Tasks</div><div className="val">{agent.tasks24h}</div></div>
            <div className="detail-stat"><div className="lbl">Tokens</div><div className="val">{(agent.tasks24h * 18.7).toFixed(0)}k</div></div>
            <div className="detail-stat"><div className="lbl">Spent</div><div className="val">${(agent.spent / 30).toFixed(2)}</div></div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Monthly budget</h3>
          <div className="detail-budget">
            <div className="row">
              <span>${agent.spent.toFixed(2)}</span>
              <span className="of">/ ${agent.budget.toFixed(2)} cap</span>
            </div>
            <div className="bar"><div className={barClass} style={{ width: `${pct}%` }} /></div>
            <div className="meta">{pct.toFixed(0)}% used · resets May 1 · <a style={{ color: "var(--accent)", cursor: "pointer" }}>Edit budget</a></div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Tools &amp; integrations</h3>
          <div className="detail-tools">
            {tools.map(t => <span key={t} className="tool-chip">{t}</span>)}
          </div>
        </div>

        <div className="detail-section">
          <h3>Recent work</h3>
          <div className="detail-recent">
            {recent.length === 0 ? (
              <div style={{ padding: 16, color: "var(--fg-2)", fontSize: 12.5 }}>No recent tasks. Assign one to get started.</div>
            ) : recent.map((r, i) => (
              <div className="recent-item" key={i}>
                <div className={`recent-status ${r.s}`}>
                  {r.s === "shipped" ? <Icon name="check" size={9} /> :
                   r.s === "failed" ? <span style={{ fontSize: 10, fontWeight: 700 }}>!</span> :
                   <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "block" }} />}
                </div>
                <div className="recent-meta">
                  <div className="recent-title">{r.t}</div>
                  <div className="recent-sub">{r.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Agents Page ──
export function Agents({ onNavigate, initialAction, onActionHandled }: {
  onNavigate?: (page: string) => void;
  initialAction?: string | null;
  onActionHandled?: () => void;
}) {
  const [view, setView] = useState<"list" | "org">("list");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("status");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignModalAgent, setAssignModalAgent] = useState<Agent | null>(null);
  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [ceoHireOpen, setCeoHireOpen] = useState(false);

  const { companyId, fetched } = useCompany();
  const { data: rawAgents, loading, refetch: refetchAgents } = useAgentsApi(companyId);
  const { data: rawActivity } = useActivityApi(companyId, 500);
  const { data: rawIssues } = useIssuesApi(companyId);

  const ceoAgentId = useMemo(() => {
    if (!rawAgents) return null;
    return rawAgents.find(r => r.role === "ceo")?.id ?? null;
  }, [rawAgents]);

  useEffect(() => {
    if (initialAction === "hire-ceo" && !loading) {
      setCeoHireOpen(true);
      onActionHandled?.();
    }
  }, [initialAction, loading]);

  const AGENTS: Agent[] = useMemo(() => {
    if (!rawAgents) return [];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const counts = new Map<string, number>();
    if (rawActivity) {
      for (const ev of rawActivity) {
        const ts = new Date(ev.createdAt).getTime();
        if (!ev.agentId || ts < cutoff) continue;
        counts.set(ev.agentId, (counts.get(ev.agentId) || 0) + 1);
      }
    }
    return rawAgents.map(r => {
      const a = transformAgent(r);
      return { ...a, tasks24h: counts.get(r.id) || 0 };
    });
  }, [rawAgents, rawActivity]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: AGENTS.length };
    for (const f of FILTERS) if (f.id !== "all") c[f.id] = AGENTS.filter(a => a.status === f.id).length;
    return c;
  }, [AGENTS]);

  const filtered = useMemo(() => {
    let list = AGENTS.filter(a => filter === "all" || a.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.task.text.toLowerCase().includes(q) ||
        a.task.tag.toLowerCase().includes(q)
      );
    }
    const order = ["blocked", "active", "thinking", "paused", "idle"];
    if (sort === "status") list = [...list].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
    else if (sort === "spend") list = [...list].sort((a, b) => (b.spent / b.budget) - (a.spent / a.budget));
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [AGENTS, filter, search, sort]);

  const selected = AGENTS.find(a => a.id === selectedId);

  const handleOpenChat = async (agent: Agent) => {
    if (!companyId) return;
    try {
      await api.post(`/companies/${companyId}/meeting-sessions`, { agentId: agent.id });
    } catch {
      // session might already exist — navigate anyway
    }
    onNavigate?.("meetings");
  };

  if (loading) return <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--fg-3)" }}>Loading...</div></main>;

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div className={`agents-page-wrap ${selected ? "" : "no-detail"}`}>
        <div className="agents-page">
          <div className="agents-header">
            <div>
              <h1>Agents</h1>
              <div className="subhead">{counts.all} agents across your company · {(counts.active || 0) + (counts.thinking || 0)} working right now</div>
            </div>
            <div className="agents-header-actions">
              {/* View toggle */}
              <div className="view-toggle">
                <button
                  className={`view-toggle-item ${view === "list" ? "active" : ""}`}
                  onClick={() => setView("list")}
                  title="List view"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  List
                </button>
                <button
                  className={`view-toggle-item ${view === "org" ? "active" : ""}`}
                  onClick={() => setView("org")}
                  title="Org chart view"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="1" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="1" y="11" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="10" y="11" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M8 5v3M8 8H3v3M8 8h5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Org
                </button>
              </div>
              <button className="btn">Export</button>
              <button className="btn primary" onClick={() => setHireModalOpen(true)}><Icon name="plus" size={12} /> Hire agent</button>
            </div>
          </div>

          {view === "org" ? (
            <OrgChart embedded />
          ) : (
            <>
              <FilterTabs value={filter} onChange={setFilter} counts={counts} />

              <div className="agents-toolbar">
                <div className="agents-search">
                  <span className="search-icon"><Icon name="search" size={14} /></span>
                  <input type="text" placeholder="Search by name, role, or task…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="toolbar-right">
                  <span>Sort by</span>
                  <select value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="status">Status</option>
                    <option value="spend">Budget used</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>

              <div className="agent-list">
                <div className="agent-list-header">
                  <span>Agent</span>
                  <span>Current task</span>
                  <span>Status</span>
                  <span>Monthly spend</span>
                  <span style={{ textAlign: "right" }}>Actions</span>
                </div>
                {filtered.length === 0 ? (
                  <div className="list-empty">
                    <h4>No agents match those filters.</h4>
                    <p>Try clearing the search or selecting "All".</p>
                    <button className="btn" onClick={() => { setFilter("all"); setSearch(""); }}>Clear filters</button>
                  </div>
                ) : filtered.map(a => (
                  <AgentRow key={a.id} agent={a} selected={a.id === selectedId} onSelect={setSelectedId} onOpenChat={handleOpenChat} />
                ))}
              </div>
            </>
          )}
        </div>

        {view === "list" && selected && <AgentDetail agent={selected} onClose={() => setSelectedId(null)} onOpenChat={handleOpenChat} onAssignTask={() => setAssignModalAgent(selected)} />}
      </div>
      <AssignTaskModal
        agent={assignModalAgent}
        rawIssues={rawIssues}
        companyId={companyId}
        onClose={() => setAssignModalAgent(null)}
      />
      <HireAgentModal
        open={hireModalOpen}
        companyId={companyId}
        ceoAgentId={ceoAgentId}
        onClose={() => setHireModalOpen(false)}
      />
      <HireCeoModal
        open={ceoHireOpen}
        companyId={companyId}
        onClose={() => setCeoHireOpen(false)}
        onHired={() => { setCeoHireOpen(false); refetchAgents(); }}
      />
    </main>
  );
}
