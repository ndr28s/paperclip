import React, { useState, useMemo } from "react";
import { useCompany } from "../context/CompanyContext";
import { useGoals, useAgents, RawGoal } from "../api/hooks";
import { transformAgent, relativeTime } from "../api/transforms";
import { api } from "../api/client";

const LEVEL_COLORS: Record<string, string> = {
  company: "#4A90E2",
  team: "#A06CD5",
  personal: "#34C98A",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#4A90E2",
  achieved: "#34C98A",
  missed: "#E8524A",
  cancelled: "#5C667A",
};

function GoalLevelBadge({ level }: { level: string }) {
  const color = LEVEL_COLORS[level] || "#5C667A";
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
      padding: "2px 6px", borderRadius: 4,
      background: `color-mix(in oklab, ${color} 18%, transparent)`,
      color,
    }}>
      {level}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "var(--fg-3)";
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: color, flexShrink: 0,
    }} title={status} />
  );
}

interface GoalTreeNode extends RawGoal {
  children: GoalTreeNode[];
  depth: number;
}

function buildTree(goals: RawGoal[]): GoalTreeNode[] {
  const map = new Map<string, GoalTreeNode>();
  goals.forEach(g => map.set(g.id, { ...g, children: [], depth: 0 }));
  const roots: GoalTreeNode[] = [];
  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  function setDepth(node: GoalTreeNode, d: number) {
    node.depth = d;
    node.children.forEach(c => setDepth(c, d + 1));
  }
  roots.forEach(r => setDepth(r, 0));
  return roots;
}

function flattenTree(nodes: GoalTreeNode[]): GoalTreeNode[] {
  const result: GoalTreeNode[] = [];
  function walk(list: GoalTreeNode[]) {
    list.forEach(n => { result.push(n); walk(n.children); });
  }
  walk(nodes);
  return result;
}

// ── Create Goal Modal ──
interface CreateGoalModalProps {
  onClose: () => void;
  companyId: string;
  goals: RawGoal[];
  onCreated: () => void;
}

function CreateGoalModal({ onClose, companyId, goals, onCreated }: CreateGoalModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("company");
  const [parentId, setParentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.post(`/companies/${companyId}/goals`, {
        title: title.trim(),
        description: description.trim() || null,
        level,
        parentId: parentId || null,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{
        position: "relative", background: "var(--bg-1)", border: "1px solid var(--border-1)",
        borderRadius: 12, padding: 28, width: 440, zIndex: 1, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>새 목표</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
            제목
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") onClose(); }}
              placeholder="목표 제목을 입력하세요"
              style={{
                display: "block", width: "100%", marginTop: 6,
                background: "var(--bg-2)", border: "1px solid var(--border-1)",
                borderRadius: 7, padding: "9px 12px", color: "var(--fg-0)", fontSize: 13,
                boxSizing: "border-box", outline: "none",
              }}
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
            설명 (선택)
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="목표에 대한 설명을 입력하세요…"
              style={{
                display: "block", width: "100%", marginTop: 6, minHeight: 60,
                background: "var(--bg-2)", border: "1px solid var(--border-1)",
                borderRadius: 7, padding: "9px 12px", color: "var(--fg-0)", fontSize: 13,
                resize: "vertical", boxSizing: "border-box", outline: "none",
              }}
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
            레벨
            <select
              value={level}
              onChange={e => setLevel(e.target.value)}
              style={{
                display: "block", width: "100%", marginTop: 6,
                background: "var(--bg-2)", border: "1px solid var(--border-1)",
                borderRadius: 7, padding: "9px 12px", color: "var(--fg-0)", fontSize: 13, boxSizing: "border-box",
              }}
            >
              <option value="company">Company</option>
              <option value="team">Team</option>
              <option value="personal">Personal</option>
            </select>
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
            상위 목표 (선택)
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              style={{
                display: "block", width: "100%", marginTop: 6,
                background: "var(--bg-2)", border: "1px solid var(--border-1)",
                borderRadius: 7, padding: "9px 12px", color: "var(--fg-0)", fontSize: 13, boxSizing: "border-box",
              }}
            >
              <option value="">없음</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </label>
        </div>
        {error && <div style={{ fontSize: 12, color: "var(--err, #e55)", marginTop: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid var(--border-1)", background: "transparent", color: "var(--fg-2)", fontSize: 13, cursor: "pointer" }}>취소</button>
          <button
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: "var(--accent)", color: "white", fontSize: 13, fontWeight: 600, cursor: creating || !title.trim() ? "not-allowed" : "pointer", opacity: creating || !title.trim() ? 0.6 : 1 }}
          >
            {creating ? "생성 중…" : "만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Goal Detail Panel ──
interface GoalDetailPanelProps {
  goal: RawGoal;
  children: RawGoal[];
  agentName: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

function GoalDetailPanel({ goal, children, agentName, onClose, onSaved, onDeleted }: GoalDetailPanelProps) {
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDesc, setEditDesc] = useState(goal.description || "");
  const [editStatus, setEditStatus] = useState(goal.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/goals/${goal.id}`, {
        title: editTitle.trim() || goal.title,
        description: editDesc || null,
        status: editStatus,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/goals/${goal.id}`);
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <aside style={{
      width: 360, flexShrink: 0, borderLeft: "1px solid var(--border-1)",
      background: "var(--bg-1)", display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: "1px solid var(--border-1)" }}>
        <GoalLevelBadge level={goal.level} />
        <StatusDot status={goal.status} />
        <span style={{ flex: 1 }} />
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", padding: 4 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>제목</div>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            style={{
              width: "100%", background: "var(--bg-2)", border: "1px solid var(--border-1)",
              borderRadius: 6, padding: "7px 10px", color: "var(--fg-0)", fontSize: 14,
              fontWeight: 600, boxSizing: "border-box", outline: "none",
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>설명</div>
          <textarea
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            placeholder="설명을 입력하세요…"
            style={{
              width: "100%", minHeight: 72, background: "var(--bg-2)", border: "1px solid var(--border-1)",
              borderRadius: 6, padding: "7px 10px", color: "var(--fg-0)", fontSize: 13,
              resize: "vertical", boxSizing: "border-box", outline: "none",
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>상태</div>
          <select
            value={editStatus}
            onChange={e => setEditStatus(e.target.value)}
            style={{
              background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6,
              padding: "6px 10px", color: "var(--fg-0)", fontSize: 13,
            }}
          >
            <option value="active">Active</option>
            <option value="achieved">Achieved</option>
            <option value="missed">Missed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {agentName && (
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>담당 에이전트</div>
            <span style={{ fontSize: 13, color: "var(--fg-1)" }}>{agentName}</span>
          </div>
        )}
        {children.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 6 }}>하위 목표 ({children.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {children.map(c => (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 8px", background: "var(--bg-2)", borderRadius: 6,
                }}>
                  <StatusDot status={c.status} />
                  <span style={{ fontSize: 12, color: "var(--fg-1)", flex: 1 }}>{c.title}</span>
                  <GoalLevelBadge level={c.level} />
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <div style={{ fontSize: 12, color: "var(--err, #e55)" }}>{error}</div>}
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-1)", display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: "7px 12px", borderRadius: 7,
            border: `1px solid ${confirmDelete ? "#E8524A" : "var(--border-1)"}`,
            background: confirmDelete ? "color-mix(in oklab, #E8524A 15%, transparent)" : "transparent",
            color: confirmDelete ? "#E8524A" : "var(--fg-3)",
            fontSize: 12, cursor: deleting ? "not-allowed" : "pointer",
            opacity: deleting ? 0.7 : 1, transition: "all 0.15s",
          }}
          title="목표 삭제"
          onMouseLeave={() => setConfirmDelete(false)}
        >
          {deleting ? "삭제 중…" : confirmDelete ? "정말 삭제?" : "삭제"}
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--border-1)", background: "transparent", color: "var(--fg-2)", fontSize: 13, cursor: "pointer" }}>닫기</button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: "var(--accent)", color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </aside>
  );
}

// ── Goals Page ──
export function GoalsPage() {
  const { companyId } = useCompany();
  const { data: rawGoals, loading, refetch } = useGoals(companyId);
  const { data: rawAgents } = useAgents(companyId);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const agentMap = useMemo(() => {
    const m = new Map<string, string>();
    if (rawAgents) rawAgents.forEach(a => m.set(a.id, a.name));
    return m;
  }, [rawAgents]);

  const { flat, goalMap } = useMemo(() => {
    if (!rawGoals) return { flat: [], goalMap: new Map<string, RawGoal>() };
    const map = new Map<string, RawGoal>();
    rawGoals.forEach(g => map.set(g.id, g));
    const tree = buildTree(rawGoals);
    return { flat: flattenTree(tree), goalMap: map };
  }, [rawGoals]);

  const selectedGoal = selectedGoalId ? goalMap.get(selectedGoalId) ?? null : null;
  const childGoals = useMemo(() => {
    if (!selectedGoalId || !rawGoals) return [];
    return rawGoals.filter(g => g.parentId === selectedGoalId);
  }, [selectedGoalId, rawGoals]);

  if (loading) return <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--fg-3)" }}>Loading...</div></main>;

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--fg-0)" }}>Goals</h1>
            <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 3 }}>{flat.length}개 목표</div>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            style={{ padding: "8px 16px", background: "var(--accent)", color: "white", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + 새 목표
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Goal list */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {flat.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--fg-3)", marginTop: 60, fontSize: 14 }}>목표가 없습니다.</div>
            ) : flat.map(goal => (
              <div
                key={goal.id}
                onClick={() => setSelectedGoalId(goal.id === selectedGoalId ? null : goal.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px",
                  paddingLeft: 12 + goal.depth * 20,
                  borderRadius: 7, cursor: "pointer",
                  background: selectedGoalId === goal.id ? "var(--bg-3)" : "transparent",
                  borderBottom: "1px solid var(--border-0)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (selectedGoalId !== goal.id) (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
                onMouseLeave={e => { if (selectedGoalId !== goal.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {goal.depth > 0 && (
                  <span style={{ color: "var(--fg-3)", fontSize: 11 }}>└</span>
                )}
                <StatusDot status={goal.status} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--fg-0)", fontWeight: goal.depth === 0 ? 500 : 400 }}>{goal.title}</span>
                <GoalLevelBadge level={goal.level} />
                {goal.ownerAgentId && agentMap.has(goal.ownerAgentId) && (
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{agentMap.get(goal.ownerAgentId)}</span>
                )}
                <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{relativeTime(goal.updatedAt)}</span>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selectedGoal && (
            <GoalDetailPanel
              key={selectedGoal.id}
              goal={selectedGoal}
              children={childGoals}
              agentName={selectedGoal.ownerAgentId ? (agentMap.get(selectedGoal.ownerAgentId) ?? null) : null}
              onClose={() => setSelectedGoalId(null)}
              onSaved={() => { refetch(); }}
              onDeleted={() => { setSelectedGoalId(null); refetch(); }}
            />
          )}
        </div>
      </div>

      {createOpen && companyId && (
        <CreateGoalModal
          onClose={() => setCreateOpen(false)}
          companyId={companyId}
          goals={rawGoals ?? []}
          onCreated={() => { refetch(); }}
        />
      )}
    </main>
  );
}
