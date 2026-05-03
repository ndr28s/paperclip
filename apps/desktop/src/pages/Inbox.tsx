import React, { useState, useMemo } from "react";
import { useCompany } from "../context/CompanyContext";
import { useIssues, useApprovals, useActivity, useAgents, RawActivity } from "../api/hooks";
import { transformAgent, relativeTime, actionLabel } from "../api/transforms";
import { api } from "../api/client";

interface InboxProps {
  onNavigate: (page: string) => void;
}

const ISSUE_STATUS_COLORS: Record<string, string> = {
  backlog: "#5C667A",
  todo: "#A06CD5",
  in_progress: "#4A90E2",
  in_review: "#F5A623",
  done: "#34C98A",
  blocked: "#E8524A",
  cancelled: "#5C667A",
};

const ISSUE_STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High", med: "Med", medium: "Med", low: "Low",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "#E8524A", med: "#F5A623", medium: "#F5A623", low: "#5C667A",
};

const ENTITY_COLORS: Record<string, string> = {
  issue: "#4A90E2",
  approval: "#F5A623",
  agent: "#A06CD5",
  project: "#34C98A",
  meeting: "#E8856A",
};

function Tab({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer",
        fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-0)" : "var(--fg-2)",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        transition: "all 0.1s",
      }}
    >
      {label}
    </button>
  );
}

// ── Issues Tab ──
function IssuesTab({ companyId, onNavigate }: { companyId: string | null; onNavigate: (page: string) => void }) {
  const { data: rawIssues, loading } = useIssues(companyId);
  const { data: rawAgents } = useAgents(companyId);

  const agentMap = useMemo(() => {
    const m = new Map<string, string>();
    if (rawAgents) rawAgents.map(a => transformAgent(a)).forEach(a => m.set(a.id, a.name));
    return m;
  }, [rawAgents]);

  const issues = useMemo(() => {
    if (!rawIssues) return [];
    return rawIssues
      .filter(i => i.status !== "cancelled" && i.status !== "done")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [rawIssues]);

  if (loading) return <div style={{ padding: 20, color: "var(--fg-3)", fontSize: 13 }}>Loading…</div>;
  if (!issues.length) return <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>진행 중인 이슈가 없습니다.</div>;

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      <div style={{ padding: "8px 20px 4px", display: "grid", gridTemplateColumns: "80px 1fr 120px 100px 80px 60px", fontSize: 11, color: "var(--fg-3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border-1)" }}>
        <span>ID</span><span>제목</span><span>상태</span><span>담당자</span><span>우선순위</span><span>시간</span>
      </div>
      {issues.map(issue => {
        const statusColor = ISSUE_STATUS_COLORS[issue.status] || "var(--fg-3)";
        const statusLabel = ISSUE_STATUS_LABELS[issue.status] || issue.status;
        const priorityColor = PRIORITY_COLORS[issue.priority] || "var(--fg-3)";
        const priorityLabel = PRIORITY_LABELS[issue.priority] || issue.priority;
        const assigneeName = issue.assigneeAgentId ? (agentMap.get(issue.assigneeAgentId) ?? "—") : "—";

        return (
          <div
            key={issue.id}
            onClick={() => onNavigate("issues")}
            style={{
              display: "grid", gridTemplateColumns: "80px 1fr 120px 100px 80px 60px",
              padding: "10px 20px", borderBottom: "1px solid var(--border-0)", cursor: "pointer",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "monospace" }}>{issue.identifier || issue.id.slice(0, 8)}</span>
            <span style={{ fontSize: 13, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{issue.title}</span>
            <span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: statusColor }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
                {statusLabel}
              </span>
            </span>
            <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{assigneeName}</span>
            <span style={{ fontSize: 12, color: priorityColor, fontWeight: 500 }}>{priorityLabel}</span>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{relativeTime(issue.updatedAt)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Approvals Tab ──
function ApprovalsTab({ companyId }: { companyId: string | null }) {
  const { data: rawApprovals, loading, refetch } = useApprovals(companyId, "pending");
  const { data: rawAgents } = useAgents(companyId);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const agentMap = useMemo(() => {
    const m = new Map<string, string>();
    if (rawAgents) rawAgents.forEach(a => m.set(a.id, a.name));
    return m;
  }, [rawAgents]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActing(id);
    try {
      await api.post(`/approvals/${id}/${action}`, { note: "" });
      setToast({ text: `${action === "approve" ? "승인" : "거절"}되었습니다.`, ok: action === "approve" });
      setTimeout(() => setToast(null), 3000);
      refetch();
    } catch (e) {
      setToast({ text: `실패: ${(e as Error).message}`, ok: false });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setActing(null);
    }
  }

  if (loading) return <div style={{ padding: 20, color: "var(--fg-3)", fontSize: 13 }}>Loading…</div>;
  if (!rawApprovals || !rawApprovals.length) return <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>대기 중인 승인 요청이 없습니다.</div>;

  return (
    <div style={{ overflowY: "auto", flex: 1, position: "relative" }}>
      {rawApprovals.map(approval => {
        const payload = approval.payload || {};
        const title = (payload.title as string) || (payload.name as string) || approval.type.replace(/_/g, " ");
        const fromName = approval.requestedByAgentId ? (agentMap.get(approval.requestedByAgentId) ?? "Unknown") : "Unknown";
        const isActing = acting === approval.id;

        return (
          <div key={approval.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>
                {fromName} · {relativeTime(approval.createdAt)} 전
              </div>
            </div>
            <button
              onClick={() => handleAction(approval.id, "approve")}
              disabled={isActing}
              style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid #34C98A", background: "transparent", color: "#34C98A", fontSize: 12, cursor: isActing ? "not-allowed" : "pointer", opacity: isActing ? 0.6 : 1 }}
            >
              승인
            </button>
            <button
              onClick={() => handleAction(approval.id, "reject")}
              disabled={isActing}
              style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid #E8524A", background: "transparent", color: "#E8524A", fontSize: 12, cursor: isActing ? "not-allowed" : "pointer", opacity: isActing ? 0.6 : 1 }}
            >
              거절
            </button>
          </div>
        );
      })}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? "#34C98A" : "#E8524A", color: "white",
          padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 200,
        }}>{toast.text}</div>
      )}
    </div>
  );
}

// ── Activity Tab ──
function ActivityTab({ companyId }: { companyId: string | null }) {
  const { data: rawActivity, loading } = useActivity(companyId, 50);
  const { data: rawAgents } = useAgents(companyId);

  const agentMap = useMemo(() => {
    const m = new Map<string, string>();
    if (rawAgents) rawAgents.forEach(a => m.set(a.id, a.name));
    return m;
  }, [rawAgents]);

  function actorLabel(item: RawActivity): string {
    if (item.actorType === "user") return "You";
    return item.agentId ? (agentMap.get(item.agentId) ?? item.actorId.slice(0, 8)) : item.actorId.slice(0, 8);
  }

  if (loading) return <div style={{ padding: 20, color: "var(--fg-3)", fontSize: 13 }}>Loading…</div>;
  if (!rawActivity || !rawActivity.length) return <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>활동 기록이 없습니다.</div>;

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {rawActivity.map(item => {
        const entityColor = ENTITY_COLORS[item.entityType] || "var(--fg-3)";
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 20px", borderBottom: "1px solid var(--border-0)" }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: entityColor,
              flexShrink: 0, marginTop: 6,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--fg-0)" }}>
                <span style={{ fontWeight: 500 }}>{actorLabel(item)}</span>
                {" "}<span style={{ color: "var(--fg-2)" }}>{actionLabel(item.action)}</span>
                {" "}<span style={{ color: "var(--fg-1)" }}>{item.entityId.slice(0, 12)}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{relativeTime(item.createdAt)} 전</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Inbox Page ──
export function InboxPage({ onNavigate }: InboxProps) {
  const { companyId } = useCompany();
  const [tab, setTab] = useState<"issues" | "approvals" | "activity">("issues");

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 0", borderBottom: "1px solid var(--border-1)", flexShrink: 0 }}>
          <h1 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700, color: "var(--fg-0)" }}>Inbox</h1>
          <div style={{ display: "flex", gap: 0 }}>
            <Tab id="issues" label="내 이슈" active={tab === "issues"} onClick={() => setTab("issues")} />
            <Tab id="approvals" label="승인 요청" active={tab === "approvals"} onClick={() => setTab("approvals")} />
            <Tab id="activity" label="최근 활동" active={tab === "activity"} onClick={() => setTab("activity")} />
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {tab === "issues" && <IssuesTab companyId={companyId} onNavigate={onNavigate} />}
          {tab === "approvals" && <ApprovalsTab companyId={companyId} />}
          {tab === "activity" && <ActivityTab companyId={companyId} />}
        </div>
      </div>
    </main>
  );
}
