import React, { useState, useMemo } from "react";
import { useCompany } from "../context/CompanyContext";
import { useRoutines, useRoutineRuns, useAgents, RawRoutine, RawRoutineRun } from "../api/hooks";
import { relativeTime } from "../api/transforms";
import { api } from "../api/client";

const STATUS_COLORS: Record<string, string> = {
  active: "#34C98A",
  paused: "#F5A623",
  archived: "#5C667A",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "var(--fg-3)";
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
      padding: "2px 6px", borderRadius: 4,
      background: `color-mix(in oklab, ${color} 18%, transparent)`,
      color,
    }}>
      {status}
    </span>
  );
}

function RunStatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: "var(--fg-3)",
    running: "#4A90E2",
    success: "#34C98A",
    failed: "#E8524A",
    cancelled: "#5C667A",
  };
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: colorMap[status] || "var(--fg-3)", flexShrink: 0,
    }} />
  );
}

function durationLabel(run: RawRoutineRun): string {
  if (!run.startedAt || !run.finishedAt) return "—";
  const ms = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── Run History ──
function RunHistory({ routineId }: { routineId: string }) {
  const { data: runs, loading, refetch } = useRoutineRuns(routineId);
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    try {
      await api.post(`/routines/${routineId}/run`);
      setTimeout(() => refetch(), 1500);
    } catch {
      // silent
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>실행 기록</span>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            padding: "4px 10px", borderRadius: 5, border: "1px solid var(--border-1)",
            background: "var(--bg-2)", color: "var(--fg-1)", fontSize: 12, cursor: running ? "not-allowed" : "pointer",
            opacity: running ? 0.7 : 1,
          }}
        >
          {running ? "실행 중…" : "지금 실행"}
        </button>
      </div>
      {loading ? (
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Loading…</div>
      ) : !runs || runs.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--fg-3)", fontStyle: "italic" }}>실행 기록 없음</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {runs.map(run => (
            <div key={run.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--border-0)" }}>
              <RunStatusDot status={run.status} />
              <span style={{ fontSize: 12, color: "var(--fg-1)", textTransform: "capitalize", width: 60 }}>{run.status}</span>
              <span style={{ fontSize: 11, color: "var(--fg-3)", flex: 1 }}>
                {run.startedAt ? new Date(run.startedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
              </span>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{durationLabel(run)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Routine Detail Panel ──
interface RoutineDetailPanelProps {
  routine: RawRoutine;
  agentName: string | null;
  onClose: () => void;
  onToggle: () => void;
}

function RoutineDetailPanel({ routine, agentName, onClose, onToggle }: RoutineDetailPanelProps) {
  const cronExpr = routine.triggers?.[0]?.config?.cron as string | undefined;

  return (
    <aside style={{
      width: 380, flexShrink: 0, borderLeft: "1px solid var(--border-1)",
      background: "var(--bg-1)", display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: "1px solid var(--border-1)" }}>
        <StatusBadge status={routine.status} />
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{routine.name}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", padding: 4, flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {routine.description && (
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>설명</div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--fg-1)", lineHeight: 1.5 }}>{routine.description}</p>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>프롬프트</div>
          <pre style={{
            margin: 0, fontSize: 12, color: "var(--fg-1)", background: "var(--bg-0)",
            border: "1px solid var(--border-0)", borderRadius: 5, padding: "8px 10px",
            whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 160, overflowY: "auto",
          }}>{routine.prompt || "—"}</pre>
        </div>
        {agentName && (
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>담당 에이전트</div>
            <span style={{ fontSize: 13, color: "var(--fg-1)" }}>{agentName}</span>
          </div>
        )}
        {cronExpr && (
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>스케줄 (Cron)</div>
            <code style={{ fontSize: 12, color: "var(--fg-1)", background: "var(--bg-2)", padding: "3px 7px", borderRadius: 4 }}>{cronExpr}</code>
          </div>
        )}
        {routine.lastRunAt && (
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 2 }}>최근 실행</div>
            <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{relativeTime(routine.lastRunAt)} 전</span>
          </div>
        )}
        <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: 12 }}>
          <RunHistory routineId={routine.id} />
        </div>
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-1)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onToggle}
          style={{
            padding: "7px 14px", borderRadius: 7, border: "1px solid var(--border-1)",
            background: "transparent", color: "var(--fg-1)", fontSize: 13, cursor: "pointer",
          }}
        >
          {routine.status === "active" ? "일시 중지" : "활성화"}
        </button>
        <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--border-1)", background: "transparent", color: "var(--fg-2)", fontSize: 13, cursor: "pointer" }}>닫기</button>
      </div>
    </aside>
  );
}

// ── Create Routine Modal ──
interface CreateRoutineModalProps {
  onClose: () => void;
  companyId: string;
  agentOptions: { id: string; name: string }[];
  onCreated: () => void;
}

function CreateRoutineModal({ onClose, companyId, agentOptions, onCreated }: CreateRoutineModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agentId, setAgentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim() || !prompt.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.post(`/companies/${companyId}/routines`, {
        name: name.trim(),
        description: description.trim() || null,
        prompt: prompt.trim(),
        agentId: agentId || null,
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
        borderRadius: 12, padding: 28, width: 480, zIndex: 1, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>새 루틴</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
            이름
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="루틴 이름"
              style={{ display: "block", width: "100%", marginTop: 6, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 7, padding: "9px 12px", color: "var(--fg-0)", fontSize: 13, boxSizing: "border-box", outline: "none" }}
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
            설명 (선택)
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="간단한 설명"
              style={{ display: "block", width: "100%", marginTop: 6, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 7, padding: "9px 12px", color: "var(--fg-0)", fontSize: 13, boxSizing: "border-box", outline: "none" }}
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
            프롬프트
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="에이전트에게 전달할 지시사항을 입력하세요…"
              style={{ display: "block", width: "100%", marginTop: 6, minHeight: 90, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 7, padding: "9px 12px", color: "var(--fg-0)", fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none" }}
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>
            에이전트 (선택)
            <select
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 7, padding: "9px 12px", color: "var(--fg-0)", fontSize: 13, boxSizing: "border-box" }}
            >
              <option value="">에이전트 선택 안 함</option>
              {agentOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        </div>
        {error && <div style={{ fontSize: 12, color: "var(--err, #e55)", marginTop: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid var(--border-1)", background: "transparent", color: "var(--fg-2)", fontSize: 13, cursor: "pointer" }}>취소</button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !prompt.trim()}
            style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: "var(--accent)", color: "white", fontSize: 13, fontWeight: 600, cursor: creating || !name.trim() || !prompt.trim() ? "not-allowed" : "pointer", opacity: creating || !name.trim() || !prompt.trim() ? 0.6 : 1 }}
          >
            {creating ? "생성 중…" : "만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Routines Page ──
export function RoutinesPage() {
  const { companyId } = useCompany();
  const { data: rawRoutines, loading, refetch } = useRoutines(companyId);
  const { data: rawAgents } = useAgents(companyId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const agentMap = useMemo(() => {
    const m = new Map<string, string>();
    if (rawAgents) rawAgents.forEach(a => m.set(a.id, a.name));
    return m;
  }, [rawAgents]);

  const agentOptions = useMemo(() => {
    if (!rawAgents) return [];
    return rawAgents.map(a => ({ id: a.id, name: a.name }));
  }, [rawAgents]);

  const selectedRoutine = useMemo(() => rawRoutines?.find(r => r.id === selectedId) ?? null, [rawRoutines, selectedId]);

  async function toggleStatus(routine: RawRoutine) {
    setTogglingId(routine.id);
    try {
      const newStatus = routine.status === "active" ? "paused" : "active";
      await api.patch(`/routines/${routine.id}`, { status: newStatus });
      refetch();
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) return <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--fg-3)" }}>Loading...</div></main>;

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--fg-0)" }}>Routines</h1>
            <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 3 }}>
              {rawRoutines ? `${rawRoutines.filter(r => r.status === "active").length}개 활성 · 15초마다 자동 갱신` : "Loading…"}
            </div>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            style={{ padding: "8px 16px", background: "var(--accent)", color: "white", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + 새 루틴
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {!rawRoutines || rawRoutines.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--fg-3)", marginTop: 60, fontSize: 14 }}>루틴이 없습니다.</div>
            ) : (
              <>
                {/* List header */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 100px 140px 120px 90px",
                  padding: "8px 16px", borderBottom: "1px solid var(--border-1)",
                  fontSize: 11, color: "var(--fg-3)", fontWeight: 500,
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  <span>이름</span>
                  <span>상태</span>
                  <span>스케줄</span>
                  <span>에이전트</span>
                  <span>최근 실행</span>
                </div>
                {rawRoutines.map(routine => {
                  const cronExpr = routine.triggers?.[0]?.config?.cron as string | undefined;
                  const agentName = routine.agentId ? (agentMap.get(routine.agentId) ?? "—") : "—";
                  const isSelected = selectedId === routine.id;
                  const isToggling = togglingId === routine.id;

                  return (
                    <div
                      key={routine.id}
                      onClick={() => setSelectedId(isSelected ? null : routine.id)}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr 100px 140px 120px 90px",
                        padding: "10px 16px", borderBottom: "1px solid var(--border-0)",
                        cursor: "pointer",
                        background: isSelected ? "var(--bg-3)" : "transparent",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{routine.name}</span>
                      <span>
                        <button
                          onClick={e => { e.stopPropagation(); toggleStatus(routine); }}
                          disabled={isToggling}
                          style={{
                            fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                            padding: "2px 6px", borderRadius: 4, border: "none", cursor: "pointer",
                            background: `color-mix(in oklab, ${STATUS_COLORS[routine.status] || "#5C667A"} 18%, transparent)`,
                            color: STATUS_COLORS[routine.status] || "var(--fg-3)",
                            opacity: isToggling ? 0.6 : 1,
                          }}
                          title="클릭해서 상태 변경"
                        >
                          {routine.status}
                        </button>
                      </span>
                      <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{cronExpr || "manual"}</span>
                      <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{agentName}</span>
                      <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
                        {routine.lastRunAt ? relativeTime(routine.lastRunAt) : "—"}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Detail panel */}
          {selectedRoutine && (
            <RoutineDetailPanel
              key={selectedRoutine.id}
              routine={selectedRoutine}
              agentName={selectedRoutine.agentId ? (agentMap.get(selectedRoutine.agentId) ?? null) : null}
              onClose={() => setSelectedId(null)}
              onToggle={() => toggleStatus(selectedRoutine)}
            />
          )}
        </div>
      </div>

      {createOpen && companyId && (
        <CreateRoutineModal
          onClose={() => setCreateOpen(false)}
          companyId={companyId}
          agentOptions={agentOptions}
          onCreated={() => refetch()}
        />
      )}
    </main>
  );
}
