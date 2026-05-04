import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useCompany } from "../context/CompanyContext";
import { useActiveSessions, useMeetingMessages, useAgents as useAgentsApi, RawMeetingMessage, RawMeetingSession } from "../api/hooks";
import { transformAgent, relativeTime } from "../api/transforms";
import { api } from "../api/client";

// ── Message bubble ──
function MessageBubble({ msg, agentName, agentColor, agentInitials, optimistic }: {
  msg: RawMeetingMessage;
  agentName: string;
  agentColor: string;
  agentInitials: string;
  optimistic?: boolean;
}) {
  const isUser = !!msg.authorUserId && !msg.authorAgentId;
  return (
    <div style={{
      display: "flex", gap: 10, padding: "6px 20px",
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start",
      opacity: optimistic ? 0.55 : 1,
      transition: "opacity 0.2s",
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        background: isUser ? "#4A90E2" : agentColor,
        color: "#fff", fontSize: 11, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isUser ? "나" : agentInitials}
      </div>
      <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 3 }}>
          {isUser ? "나" : agentName}
        </div>
        <div style={{
          padding: "9px 13px", borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
          background: isUser ? "var(--accent)" : "var(--bg-2)",
          color: isUser ? "white" : "var(--fg-0)",
          fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {msg.body}
        </div>
        {!optimistic && (
          <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 3 }}>
            {relativeTime(msg.createdAt)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator (animated dots) ──
function TypingIndicator({ agentName, agentColor, agentInitials }: {
  agentName: string;
  agentColor: string;
  agentInitials: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "6px 20px", alignItems: "flex-start" }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        background: agentColor, color: "#fff", fontSize: 11, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {agentInitials}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 3 }}>{agentName}</div>
        <div style={{
          padding: "10px 14px", borderRadius: "4px 12px 12px 12px",
          background: "var(--bg-2)", display: "flex", alignItems: "center", gap: 4,
        }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--fg-3)",
              display: "inline-block",
              animation: `typing-dot 1.2s ${i * 0.2}s infinite ease-in-out`,
            }} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 3 }}>답변 작성 중…</div>
      </div>
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function MeetingsPage() {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Per-agent state: typing indicator + optimistic messages
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const [optimisticMap, setOptimisticMap] = useState<Record<string, RawMeetingMessage[]>>({});
  const lastMsgIdRef = useRef<Record<string, string | null>>({});
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const transcriptRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { companyId } = useCompany();
  const { data: rawAgents } = useAgentsApi(companyId);
  const { data: activeSessions, refetch: refetchSessions } = useActiveSessions(companyId);

  const agents = useMemo(() => {
    if (!rawAgents) return [];
    return rawAgents.map(r => transformAgent(r));
  }, [rawAgents]);

  // Active session for each agent
  const sessionByAgentId = useMemo(() => {
    const map: Record<string, RawMeetingSession> = {};
    if (!activeSessions) return map;
    for (const s of activeSessions) {
      if (s.agentId) map[s.agentId] = s;
    }
    return map;
  }, [activeSessions]);

  const viewAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) ?? null : null;
  const viewSession = viewAgent ? sessionByAgentId[viewAgent.id] ?? null : null;
  const viewIsTyping = viewAgent ? (typingMap[viewAgent.id] ?? false) : false;
  const viewOptimistic = viewAgent ? (optimisticMap[viewAgent.id] ?? []) : [];

  const { data: messages, refetch: refetchMessages } = useMeetingMessages(companyId, viewSession?.id ?? null);

  // Auto-poll sessions every 5s to keep green dots updated
  useEffect(() => {
    const id = setInterval(() => refetchSessions(), 5000);
    return () => clearInterval(id);
  }, [refetchSessions]);

  // Auto-poll messages every 3s when viewing an active session
  useEffect(() => {
    if (!viewSession) return;
    const id = setInterval(() => refetchMessages(), 3000);
    return () => clearInterval(id);
  }, [viewSession?.id, refetchMessages]);

  // Detect new agent message → clear typing + optimistic for that agent
  useEffect(() => {
    if (!messages || !viewAgent) return;
    const agentMsgs = messages.filter(m => !!m.authorAgentId);
    if (agentMsgs.length === 0) return;
    const lastMsg = agentMsgs[agentMsgs.length - 1];
    const agentId = viewAgent.id;
    if (lastMsg.id !== (lastMsgIdRef.current[agentId] ?? null)) {
      lastMsgIdRef.current[agentId] = lastMsg.id;
      setTypingMap(prev => ({ ...prev, [agentId]: false }));
      setOptimisticMap(prev => ({ ...prev, [agentId]: [] }));
      if (typingTimeoutRef.current[agentId]) clearTimeout(typingTimeoutRef.current[agentId]);
    }
  }, [messages, viewAgent]);

  // Clear optimistic when server confirms user message
  useEffect(() => {
    if (!messages || !viewAgent || viewOptimistic.length === 0) return;
    if (messages.some(m => !!m.authorUserId)) {
      setOptimisticMap(prev => ({ ...prev, [viewAgent.id]: [] }));
    }
  }, [messages, viewAgent, viewOptimistic.length]);

  // Auto-scroll
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages?.length, viewOptimistic.length, viewIsTyping]);

  const handleStartChat = useCallback(async (agentId: string) => {
    if (!companyId) return;
    setStarting(agentId);
    try {
      await api.post(`/companies/${companyId}/meeting-sessions`, { agentId });
      await refetchSessions();
      setSelectedAgentId(agentId);
      setInputText("");
      // Reset per-agent state
      lastMsgIdRef.current[agentId] = null;
      setTypingMap(prev => ({ ...prev, [agentId]: false }));
      setOptimisticMap(prev => ({ ...prev, [agentId]: [] }));
    } catch (err) {
      console.error("Failed to start chat:", err);
    } finally {
      setStarting(null);
    }
  }, [companyId, refetchSessions]);

  const handleEndChat = useCallback(async (sessionId: string, agentId: string) => {
    if (!companyId) return;
    try {
      await api.delete(`/companies/${companyId}/meeting-sessions/${sessionId}`);
      await refetchSessions();
      setTypingMap(prev => ({ ...prev, [agentId]: false }));
      setOptimisticMap(prev => ({ ...prev, [agentId]: [] }));
      if (typingTimeoutRef.current[agentId]) clearTimeout(typingTimeoutRef.current[agentId]);
    } catch (err) {
      console.error("Failed to end chat:", err);
    }
  }, [companyId, refetchSessions]);

  const handleSend = useCallback(async () => {
    if (!companyId || !viewSession || !viewAgent || !inputText.trim() || sending) return;
    const text = inputText.trim();
    const agentId = viewAgent.id;
    setSending(true);
    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const optimisticMsg: RawMeetingMessage = {
      id: `optimistic-${Date.now()}`,
      sessionId: viewSession.id,
      companyId,
      authorUserId: "me",
      authorAgentId: null,
      body: text,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMap(prev => ({ ...prev, [agentId]: [...(prev[agentId] ?? []), optimisticMsg] }));

    try {
      await api.post(`/companies/${companyId}/meeting-sessions/${viewSession.id}/messages`, { body: text });
      setTypingMap(prev => ({ ...prev, [agentId]: true }));
      if (typingTimeoutRef.current[agentId]) clearTimeout(typingTimeoutRef.current[agentId]);
      typingTimeoutRef.current[agentId] = setTimeout(() => {
        setTypingMap(prev => ({ ...prev, [agentId]: false }));
      }, 180000);
      refetchMessages();
    } catch (err) {
      console.error("Failed to send:", err);
      setInputText(text);
      setOptimisticMap(prev => ({ ...prev, [agentId]: (prev[agentId] ?? []).filter(m => m.id !== optimisticMsg.id) }));
    } finally {
      setSending(false);
    }
  }, [companyId, viewSession, viewAgent, inputText, sending, refetchMessages]);

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

        {/* ── Left: Agent list ── */}
        <aside style={{
          width: 240, flexShrink: 0, borderRight: "1px solid var(--border-1)",
          background: "var(--bg-1)", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid var(--border-1)", flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--fg-0)" }}>Meetings</h1>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>
              {activeSessions && activeSessions.length > 0
                ? `${activeSessions.length}개 대화 진행 중`
                : "에이전트를 선택해 대화를 시작하세요"}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {agents.length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 12 }}>
                에이전트가 없습니다
              </div>
            )}
            {agents.map(agent => {
              const hasActive = !!sessionByAgentId[agent.id];
              const isSelected = selectedAgentId === agent.id;
              const isStarting = starting === agent.id;
              const isTyping = typingMap[agent.id] ?? false;
              return (
                <div
                  key={agent.id}
                  onClick={() => !isStarting && setSelectedAgentId(agent.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 14px", cursor: isStarting ? "wait" : "pointer",
                    background: isSelected ? "var(--bg-3)" : "transparent",
                    borderLeft: `3px solid ${isSelected ? "var(--accent)" : "transparent"}`,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: agent.color, color: "#fff",
                      fontSize: 12, fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {agent.initials}
                    </div>
                    {hasActive && (
                      <span style={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 9, height: 9, borderRadius: "50%",
                        background: isTyping ? "#F5A623" : "#34C98A",
                        border: "2px solid var(--bg-1)",
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: 11, color: hasActive ? (isTyping ? "#F5A623" : "#34C98A") : "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isStarting ? "연결 중…" : isTyping ? "답변 작성 중…" : hasActive ? "대화 중" : agent.role}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Right: Chat panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {viewAgent ? (
            <>
              {/* Header */}
              <div style={{
                padding: "12px 20px", borderBottom: "1px solid var(--border-1)",
                display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
                background: "var(--bg-1)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: viewAgent.color, color: "#fff",
                  fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {viewAgent.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>{viewAgent.name}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
                    {viewAgent.role}
                    {viewSession && (
                      viewIsTyping
                        ? <span style={{ color: "#F5A623", marginLeft: 8 }}>● 답변 작성 중</span>
                        : <span style={{ color: "#34C98A", marginLeft: 8 }}>● 대화 중</span>
                    )}
                  </div>
                </div>
                {viewSession && (
                  <button
                    onClick={() => handleEndChat(viewSession.id, viewAgent.id)}
                    style={{
                      padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border-1)",
                      background: "transparent", color: "var(--fg-2)", fontSize: 12, cursor: "pointer",
                    }}
                  >
                    대화 종료
                  </button>
                )}
              </div>

              {/* Transcript */}
              <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
                {viewSession ? (
                  <>
                    {(!messages || messages.length === 0) && viewOptimistic.length === 0 && (
                      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                        {viewAgent.name}와 대화를 시작하세요
                      </div>
                    )}
                    {messages?.map(msg => (
                      <MessageBubble key={msg.id} msg={msg}
                        agentName={viewAgent.name} agentColor={viewAgent.color} agentInitials={viewAgent.initials} />
                    ))}
                    {viewOptimistic.map(msg => (
                      <MessageBubble key={msg.id} msg={msg}
                        agentName={viewAgent.name} agentColor={viewAgent.color} agentInitials={viewAgent.initials} optimistic />
                    ))}
                    {viewIsTyping && (
                      <TypingIndicator agentName={viewAgent.name} agentColor={viewAgent.color} agentInitials={viewAgent.initials} />
                    )}
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: viewAgent.color, color: "#fff",
                        fontSize: 22, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 16px",
                      }}>
                        {viewAgent.initials}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)", marginBottom: 4 }}>{viewAgent.name}</div>
                      <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>{viewAgent.role}</div>
                      <button
                        onClick={() => handleStartChat(viewAgent.id)}
                        disabled={starting === viewAgent.id}
                        style={{
                          padding: "9px 24px", borderRadius: 8, border: "none",
                          background: "var(--accent)", color: "white",
                          fontSize: 13, fontWeight: 600,
                          cursor: starting === viewAgent.id ? "wait" : "pointer",
                          opacity: starting === viewAgent.id ? 0.7 : 1,
                        }}
                      >
                        {starting === viewAgent.id ? "연결 중…" : "대화 시작"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
              {viewSession && (
                <div style={{
                  padding: "12px 16px", borderTop: "1px solid var(--border-1)",
                  background: "var(--bg-1)", flexShrink: 0,
                }}>
                  <div style={{
                    display: "flex", gap: 8, alignItems: "flex-end",
                    background: "var(--bg-2)", border: "1px solid var(--border-1)",
                    borderRadius: 10, padding: "8px 12px",
                  }}>
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={e => {
                        setInputText(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                      disabled={sending}
                      placeholder={`${viewAgent.name}에게 메시지 보내기…`}
                      rows={1}
                      style={{
                        flex: 1, background: "transparent", border: "none", outline: "none",
                        color: "var(--fg-0)", fontSize: 13, resize: "none",
                        lineHeight: 1.5, maxHeight: 120, overflowY: "auto", fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={sending || !inputText.trim()}
                      style={{
                        padding: "5px 14px", borderRadius: 7, border: "none",
                        background: "var(--accent)", color: "white",
                        fontSize: 13, fontWeight: 600,
                        cursor: sending || !inputText.trim() ? "not-allowed" : "pointer",
                        opacity: sending || !inputText.trim() ? 0.5 : 1, flexShrink: 0,
                      }}
                    >
                      전송
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 5, paddingLeft: 2 }}>
                    Enter로 전송 · Shift+Enter 줄바꿈
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-3)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>💬</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-1)", marginBottom: 6 }}>에이전트를 선택하세요</div>
                <div style={{ fontSize: 13 }}>왼쪽에서 대화할 에이전트를 선택하세요</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
