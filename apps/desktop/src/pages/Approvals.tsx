import React, { useState, useMemo } from "react";
import { AGENTS as STATIC_AGENTS, APPROVALS as STATIC_APPROVALS, Approval, Agent } from "../data";
import { useCompany } from "../context/CompanyContext";
import { useApprovals as useApprovalsApi, useAgents as useAgentsApi } from "../api/hooks";
import { transformApproval, transformAgent, relativeTime } from "../api/transforms";
import { api } from "../api/client";

// ── Type metadata ──
const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  deploy: { label: "Deploy",  color: "#34C98A", icon: "deploy" },
  spend:  { label: "Spend",   color: "#F5A623", icon: "coin" },
  access: { label: "Access",  color: "#4A90E2", icon: "key" },
  hire:   { label: "Hire",    color: "#A06CD5", icon: "user" },
};

// ── Approval-specific icons ──
function ApIcon({ name, size = 12 }: { name: string; size?: number }) {
  const s = size, sw = 1.5, stroke = "currentColor";
  switch (name) {
    case "deploy": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3.5 12.5L8 4l4.5 8.5M5 11h6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "key":    return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="5" cy="11" r="2.5" stroke={stroke} strokeWidth={sw}/><path d="M7 9l5-5M10 4h2.5v2.5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "coin":   return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke={stroke} strokeWidth={sw}/><path d="M8 5v6M6 7h3a1.5 1.5 0 0 1 0 3H6" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "user":   return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="2.5" stroke={stroke} strokeWidth={sw}/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "alert":  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 2.5L14 13H2L8 2.5z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M8 7v3" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.6" fill={stroke}/></svg>;
    case "clock":  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke={stroke} strokeWidth={sw}/><path d="M8 5v3l2 1.5" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "chat":   return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7l-3 2.5V11H4a1 1 0 0 1-1-1V4z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/></svg>;
    case "x":      return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "check":  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>;
    default: return null;
  }
}

// Module-level dynamic agents reference
let _approvalAgents: Agent[] = STATIC_AGENTS;

// ── Approval Row ──
function ApprovalRow({ approval, selected, onSelect, onAction }: { approval: Approval; selected: boolean; onSelect: (id: string) => void; onAction: (id: string, action: string) => void }) {
  const t = TYPE_META[approval.type] || TYPE_META.deploy;
  const agent = _approvalAgents.find(a => a.id === approval.agent);
  return (
    <div
      className={`ap-row ${selected ? "selected" : ""} ${approval.urgent ? "urgent" : ""}`}
      onClick={() => onSelect(approval.id)}
    >
      <div className="ap-row-body">
        <div className="ap-row-top">
          <span className="ap-type-badge" style={{ background: `color-mix(in oklab, ${t.color} 18%, transparent)`, color: t.color }}>
            <ApIcon name={t.icon} size={11} />
            {t.label}
          </span>
          {approval.urgent && (
            <span className="ap-urgent-flag" title="Urgent">
              <ApIcon name="alert" size={11} />
              <span>Urgent</span>
            </span>
          )}
          <span className="ap-id">{approval.id}</span>
          <span className="ap-row-spacer" />
          <span className="ap-age"><ApIcon name="clock" size={10} />{approval.age}</span>
        </div>
        <div className="ap-row-title">{approval.title}</div>
        <div className="ap-row-meta">
          <span className="ap-from">
            {agent && <span className="mini-avatar" style={{ background: agent.color }}>{agent.initials}</span>}
            <span>{approval.from || (agent && `${agent.name} · ${agent.role}`)}</span>
          </span>
          <span className="ap-impact" data-tone={approval.impact.tone}>
            <span className="ap-impact-k">{approval.impact.label}</span>
            <span className="ap-impact-v">{approval.impact.value}</span>
          </span>
        </div>
      </div>
      <div className="ap-row-actions" onClick={e => e.stopPropagation()}>
        <button className="btn ap-approve" onClick={() => onAction(approval.id, "approve")}><ApIcon name="check" size={11} />Approve</button>
        <button className="btn ap-reject" onClick={() => onAction(approval.id, "reject")}><ApIcon name="x" size={11} />Reject</button>
        <button className="btn ap-discuss" onClick={() => onAction(approval.id, "discuss")}><ApIcon name="chat" size={11} />Discuss</button>
      </div>
    </div>
  );
}

// ── Detail Panel ──
function DetailPanel({ approval, onAction }: { approval: Approval | undefined; onAction: (id: string, action: string) => void }) {
  if (!approval) {
    return (
      <aside className="ap-detail empty">
        <div className="empty-inner">
          <div className="empty-icon"><ApIcon name="check" size={20} /></div>
          <div className="empty-title">Select a request</div>
          <div className="empty-sub">Pick an item from the queue to review the agent's full rationale before acting.</div>
        </div>
      </aside>
    );
  }
  const t = TYPE_META[approval.type] || TYPE_META.deploy;
  const agent = _approvalAgents.find(a => a.id === approval.agent);
  return (
    <aside className="ap-detail">
      <header className="ap-detail-head">
        <div className="ap-detail-title-row">
          <span className="ap-type-badge lg" style={{ background: `color-mix(in oklab, ${t.color} 18%, transparent)`, color: t.color }}>
            <ApIcon name={t.icon} size={12} />{t.label}
          </span>
          <span className="ap-id mono">{approval.id}</span>
          {approval.urgent && <span className="ap-urgent-tag"><ApIcon name="alert" size={10} />Urgent</span>}
        </div>
        <h2>{approval.title}</h2>
        <div className="ap-detail-from">
          {agent && <span className="mini-avatar lg" style={{ background: agent.color }}>{agent.initials}</span>}
          <div>
            <div className="ap-detail-from-name">{agent ? agent.name : (approval.from || "")}</div>
            <div className="ap-detail-from-role">{agent ? agent.role : ""}</div>
          </div>
          <div className="ap-detail-age"><ApIcon name="clock" size={11} />requested {approval.age} ago</div>
        </div>
      </header>

      <div className="ap-detail-body">
        <section className="ap-section">
          <div className="ap-section-label">Agent's summary</div>
          <p className="ap-summary">{approval.summary}</p>
        </section>
        <section className="ap-section">
          <div className="ap-section-label">Why they're asking</div>
          <ul className="ap-rationale">
            {approval.rationale.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </section>
        <section className="ap-section">
          <div className="ap-section-label">Details</div>
          <dl className="ap-meta-grid">
            {approval.meta.map((m, i) => (
              <div className="ap-meta-pair" key={i}>
                <dt>{m.k}</dt>
                <dd>{m.v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className={`ap-impact-block tone-${approval.impact.tone}`}>
          <div className="ap-section-label">{approval.impact.label}</div>
          <div className="ap-impact-value">{approval.impact.value}</div>
        </section>
      </div>

      <footer className="ap-detail-foot">
        <button className="btn ap-discuss lg" onClick={() => onAction(approval.id, "discuss")}><ApIcon name="chat" size={12} />Discuss</button>
        <button className="btn ap-reject lg" onClick={() => onAction(approval.id, "reject")}><ApIcon name="x" size={12} />Reject</button>
        <button className="btn ap-approve lg primary" onClick={() => onAction(approval.id, "approve")}><ApIcon name="check" size={12} />Approve</button>
      </footer>
    </aside>
  );
}

// ── Approvals Page ──
export function ApprovalsPage() {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; tone: string } | null>(null);
  const [discussId, setDiscussId] = useState<string | null>(null);
  const [autoApproveOpen, setAutoApproveOpen] = useState(false);
  const [discussText, setDiscussText] = useState("");
  const [discussSending, setDiscussSending] = useState(false);

  const { companyId, fetched } = useCompany();
  const { data: rawApprovals, loading: approvalsLoading, refetch } = useApprovalsApi(companyId, "pending");
  const { data: rawAgents } = useAgentsApi(companyId);

  const AGENTS: Agent[] = useMemo(() => {
    if (!rawAgents) return fetched ? [] : STATIC_AGENTS;
    return rawAgents.map(r => transformAgent(r));
  }, [rawAgents]);

  // Keep module-level reference in sync
  _approvalAgents = AGENTS;

  // Convert live approvals into the Approval shape the UI expects
  const list: Approval[] = useMemo(() => {
    if (!rawApprovals) return fetched ? [] : STATIC_APPROVALS;
    return rawApprovals.map(raw => {
      const transformed = transformApproval(raw);
      const agent = AGENTS.find(a => a.id === raw.requestedByAgentId);
      return {
        id: raw.id,
        type: (({ hire_agent: "hire", hire: "hire", deploy: "deploy", spend: "spend", access: "access" })[raw.type] || "deploy") as "deploy" | "spend" | "hire" | "access",
        urgent: false,
        agent: raw.requestedByAgentId || "",
        title: transformed.title,
        summary: (raw.payload?.summary as string) || (raw.payload?.detail as string) || "",
        impact: {
          label: "Impact",
          value: (raw.payload?.impact as string) || "—",
          tone: "info" as const,
        },
        meta: Object.entries(raw.payload || {})
          .filter(([k]) => !["title", "name", "summary", "detail", "impact"].includes(k))
          .slice(0, 4)
          .map(([k, v]) => ({ k, v: String(v) })),
        rationale: ((raw.payload?.rationale as string[]) || []),
        age: transformed.age,
        ageMinutes: Math.floor((Date.now() - new Date(raw.createdAt).getTime()) / 60000),
        from: agent ? `${agent.name} · ${agent.role}` : transformed.from,
        detail: transformed.detail,
      };
    });
  }, [rawApprovals, AGENTS]);

  const counts = useMemo(() => ({
    all: list.length,
    urgent: list.filter(a => a.urgent).length,
    deploy: list.filter(a => a.type === "deploy").length,
    spend: list.filter(a => a.type === "spend").length,
    access: list.filter(a => a.type === "access").length,
    hire: list.filter(a => a.type === "hire").length,
  }), [list]);

  const visible = useMemo(() => {
    if (filter === "all") return list;
    if (filter === "urgent") return list.filter(a => a.urgent);
    return list.filter(a => a.type === filter);
  }, [filter, list]);

  const selected = list.find(a => a.id === selectedId);

  // Set initial selection when list loads
  useMemo(() => {
    if (list.length > 0 && selectedId === null) {
      setSelectedId(list[0].id);
    }
  }, [list.length > 0]);

  const handleAction = async (id: string, action: string) => {
    const item = list.find(a => a.id === id);
    if (!item) return;
    const labels: Record<string, { verb: string; tone: string }> = {
      approve: { verb: "Approved", tone: "ok" },
      reject:  { verb: "Rejected", tone: "danger" },
      discuss: { verb: "Opened a thread on", tone: "info" },
    };
    const { verb, tone } = labels[action];

    if (action === "approve" || action === "reject") {
      try {
        await api.post(`/approvals/${id}/${action}`, { note: "" });
        setToast({ id: Date.now(), text: `${verb} ${item.id.slice(0, 8)} — ${item.title}`, tone });
        setTimeout(() => setToast(null), 3200);
        refetch();
        if (selectedId === id) {
          const remaining = list.filter(a => a.id !== id);
          setSelectedId(remaining.length ? remaining[0].id : null);
        }
      } catch (err) {
        setToast({ id: Date.now(), text: `Failed to ${action}: ${(err as Error).message}`, tone: "danger" });
        setTimeout(() => setToast(null), 3200);
      }
    } else if (action === "discuss") {
      setDiscussId(id);
    }
  };

  const FILTERS = [
    { id: "all", label: "All", count: counts.all },
    { id: "urgent", label: "Urgent", count: counts.urgent, accent: true },
    { id: "deploy", label: "Deploy", count: counts.deploy, color: TYPE_META.deploy.color },
    { id: "spend", label: "Spend", count: counts.spend, color: TYPE_META.spend.color },
    { id: "access", label: "Access", count: counts.access, color: TYPE_META.access.color },
    { id: "hire", label: "Hire", count: counts.hire, color: TYPE_META.hire.color },
  ];

  if (approvalsLoading) return <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--fg-3)" }}>Loading...</div></main>;

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div className="ap-page">
        <div className="ap-header">
          <div>
            <h1>Approvals</h1>
            <div className="ap-subhead">{list.length} pending · {counts.urgent} urgent · agents won't act on these without you</div>
          </div>
          <div className="ap-header-actions">
            <button className="btn" onClick={() => setAutoApproveOpen(true)}>Auto-approve rules…</button>
            <button className="btn" onClick={() => {
              const rows = visible.map(a => `${a.id}\t${a.type}\t${a.title}\t${a.age}`).join("\n");
              const header = "ID\tType\tTitle\tAge\n";
              const blob = new Blob([header + rows], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url; link.download = "approvals-queue.tsv"; link.click();
              URL.revokeObjectURL(url);
              setToast({ id: Date.now(), text: "Queue exported as TSV", tone: "ok" });
              setTimeout(() => setToast(null), 2500);
            }}>Export queue</button>
          </div>
        </div>

        <div className="ap-toolbar">
          <div className="ap-filters">
            {FILTERS.map(f => (
              <button key={f.id} className={`ap-filter ${filter === f.id ? "active" : ""} ${f.accent ? "accent" : ""}`} onClick={() => setFilter(f.id)}>
                {f.color && <span className="ap-filter-dot" style={{ background: f.color }} />}
                {f.id === "urgent" && f.count > 0 && <ApIcon name="alert" size={11} />}
                <span>{f.label}</span>
                <span className="ap-filter-count">{f.count}</span>
              </button>
            ))}
          </div>
          <div className="ap-toolbar-right">
            <span className="ap-bulk-hint">
              Tip: keyboard <span className="kbd-inline">A</span> approve · <span className="kbd-inline">R</span> reject · <span className="kbd-inline">D</span> discuss
            </span>
          </div>
        </div>

        <div className="ap-body">
          <div className="ap-list">
            {visible.length === 0 ? (
              <div className="ap-list-empty">
                <div className="empty-icon"><ApIcon name="check" size={20} /></div>
                <div className="empty-title">Inbox zero</div>
                <div className="empty-sub">Nothing to review in this filter. Your agents will queue requests here when they need a decision.</div>
              </div>
            ) : visible.map(a => (
              <ApprovalRow key={a.id} approval={a} selected={selectedId === a.id} onSelect={setSelectedId} onAction={handleAction} />
            ))}
          </div>
          <DetailPanel approval={selected} onAction={handleAction} />
        </div>

        {toast && (
          <div className={`ap-toast tone-${toast.tone}`} key={toast.id}>{toast.text}</div>
        )}
      </div>
      {autoApproveOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setAutoApproveOpen(false)} />
          <div style={{ position: "relative", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 12, padding: "28px", width: 440, zIndex: 1, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Auto-approve rules</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
              Auto-approve rules let agents act on low-risk requests without manual review. Define conditions by type, amount, and agent trust level.
            </p>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🚧</span>
              <span>Rule configuration is coming soon. Your approval queue is fully functional in the meantime.</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn primary" onClick={() => setAutoApproveOpen(false)} style={{ padding: "8px 20px" }}>Got it</button>
            </div>
          </div>
        </div>
      )}
      {discussId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => { setDiscussId(null); setDiscussText(""); }} />
          <div style={{ position: "relative", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 10, padding: 20, width: 400, zIndex: 1 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>Add comment</h3>
            <textarea
              autoFocus
              placeholder="Write your comment…"
              value={discussText}
              onChange={e => setDiscussText(e.target.value)}
              style={{ width: "100%", minHeight: 80, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6, padding: 8, color: "var(--fg-0)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <button className="btn" onClick={() => { setDiscussId(null); setDiscussText(""); }}>Cancel</button>
              <button
                className="btn primary"
                disabled={!discussText.trim() || discussSending}
                onClick={async () => {
                  if (!discussText.trim()) return;
                  setDiscussSending(true);
                  try {
                    await api.post(`/approvals/${discussId}/comments`, { body: discussText.trim() });
                    setToast({ id: Date.now(), text: `Comment added to ${discussId.slice(0, 8)}`, tone: "ok" });
                    setTimeout(() => setToast(null), 3200);
                  } catch (e) {
                    setToast({ id: Date.now(), text: `Failed to post comment: ${(e as Error).message}`, tone: "danger" });
                    setTimeout(() => setToast(null), 3200);
                  } finally {
                    setDiscussId(null);
                    setDiscussText("");
                    setDiscussSending(false);
                  }
                }}
              >
                {discussSending ? "Posting…" : "Post comment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
