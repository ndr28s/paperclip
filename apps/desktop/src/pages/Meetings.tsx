import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useCompany } from "../context/CompanyContext";
import { useActiveSession, useMeetingMessages, useAgents as useAgentsApi, RawMeetingMessage } from "../api/hooks";
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
  // Which agent is selected in the left panel (view-only, does NOT start a session)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  // Optimistic messages: shown immediately after send, cleared when server confirms
  const [optimisticMessages, setOptimisticMessages] = useState<RawMeetingMessage[]>([]);
  // Typing indicator: true after user sends, false when agent message arrives
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const lastAgentMsgIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { companyId } = useCompany();
  const { data: rawAgents } = useAgentsApi(companyId);
  const { data: session, refetch: refetchSession } = useActiveSession(companyId);
  const { data: messages, refetch: refetchMessages } = useMeetingMessages(companyId, session?.id ?? null);

  const agents = useMemo(() => {
    if (!rawAgents) return [];
    return rawAgents.map(r => transformAgent(r));
  }, [rawAgents]);

  const hasSession = !!(session && !session.endedAt);
  const sessionAgent = hasSession && session.agentId
    ? agents.find(a => a.id === session.agentId) ?? null
    : null;

  // The agent currently displayed in the right panel
  const viewAgent = selectedAgentId
    ? agents.find(a => a.id === selectedAgentId) ?? null
    : sessionAgent;
  // Is the displayed agent the one with the active session?
  const viewHasActiveSession = !!(viewAgent && hasSession && session?.agentId === viewAgent.id);

  // Auto-poll messages every 3s when session is active
  useEffect(() => {
    if (!hasSession) return;
    const id = setInterval(() => refetchMessages(), 3000);
    return () => clearInterval(id);
  }, [hasSession, refetchMessages]);

  // When new agent message arrives → clear typing indicator + optimistic messages
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    // Find the last agent message
    const agentMsgs = messages.filter(m => !!m.authorAgentId);
    if (agentMsgs.length === 0) return;
    const lastAgentMsg = agentMsgs[agentMsgs.length - 1];
    if (lastAgentMsg.id !== lastAgentMsgIdRef.current) {
      lastAgentMsgIdRef.current = lastAgentMsg.id;
      setIsAgentTyping(false);
      setOptimisticMessages([]);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  }, [messages]);

  // Clear optimistic messages when server messages include them
  useEffect(() => {
    if (!messages || optimisticMessages.length === 0) return;
    // If server messages now contain the user's latest message, clear optimistic
    const serverUserMsgs = messages.filter(m => !!m.authorUserId);
    if (serverUserMsgs.length > 0) {
      setOptimisticMessages([]);
    }
  }, [messages, optimisticMessages.length]);

  // Auto-scroll on new messages or typing indicator change
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages?.length, optimisticMessages.length, isAgentTyping]);

  // Reset typing/optimistic state only when session actually ends (not when just switching views)
  useEffect(() => {
    if (!hasSession) {
      setOptimisticMessages([]);
      setIsAgentTyping(false);
      lastAgentMsgIdRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  }, [hasSession]);

  const handleStartChat = useCallback(async (agentId: string) => {
    if (!companyId) return;
    setStarting(agentId);
    try {
      await api.post(`/companies/${companyId}/meeting-sessions`, { agentId });
      await refetchSession();
      setInputText("");
      setOptimisticMessages([]);
      setIsAgentTyping(false);
      lastAgentMsgIdRef.current = null;
      setSelectedAgentId(agentId);
    } catch (err) {
      console.error("Failed to start chat:", err);
    } finally {
      setStarting(null);
    }
  }, [companyId, refetchSession]);

  const handleEndChat = useCallback(async () => {
    if (!companyId || !session) return;
    try {
      await api.delete(`/companies/${companyId}/meeting-sessions/${session.id}`);
      refetchSession();
      setOptimisticMessages([]);
      setIsAgentTyping(false);
    } catch (err) {
      console.error("Failed to end chat:", err);
    }
  }, [companyId, session, refetchSession]);

  const handleSend = useCallback(async () => {
    if (!companyId || !session || !inputText.trim() || sending) return;
    const text = inputText.trim();
    setSending(true);
    // 1. Clear input immediately
    setInputText("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    // 2. Optimistically add message to transcript
    const optimisticMsg: RawMeetingMessage = {
      id: `optimistic-${Date.now()}`,
      sessionId: session.id,
      companyId: companyId,
      authorUserId: "me",
      authorAgentId: null,
      body: text,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessages(prev => [...prev, optimisticMsg]);
    try {
      await api.post(`/companies/${companyId}/meeting-sessions/${session.id}/messages`, { body: text });
      // 3. Show typing indicator — agent is being woken up
      setIsAgentTyping(true);
      // Safety timeout: hide typing indicator after 3 minutes
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsAgentTyping(false), 180000);
      refetchMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
      // Restore input and remove optimistic message on failure
      setInputText(text);
      setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  }, [companyId, session, inputText, sending, refetchMessages]);

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
              에이전트를 선택해 대화를 시작하세요
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {agents.length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 12 }}>
                에이전트가 없습니다
              </div>
            )}
            {agents.map(agent => {
              const isActiveSession = hasSession && session?.agentId === agent.id;
              const isSelected = viewAgent?.id === agent.id;
              const isStarting = starting === agent.id;
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
                    {isActiveSession && (
                      <span style={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 9, height: 9, borderRadius: "50%",
                        background: "#34C98A", border: "2px solid var(--bg-1)",
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: 11, color: isActiveSession ? "#34C98A" : "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isStarting ? "연결 중…" : isActiveSession ? "대화 중" : agent.role}
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
                    {viewHasActiveSession && (
                      isAgentTyping
                        ? <span style={{ color: "#F5A623", marginLeft: 8 }}>● 답변 작성 중</span>
                        : <span style={{ color: "#34C98A", marginLeft: 8 }}>● 대화 중</span>
                    )}
                  </div>
                </div>
                {viewHasActiveSession && (
                  <button
                    onClick={handleEndChat}
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
                {viewHasActiveSession ? (
                  <>
                    {(!messages || messages.length === 0) && optimisticMessages.length === 0 && (
                      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                        {viewAgent.name}와 대화를 시작하세요
                      </div>
                    )}
                    {messages?.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        agentName={viewAgent.name}
                        agentColor={viewAgent.color}
                        agentInitials={viewAgent.initials}
                      />
                    ))}
                    {optimisticMessages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        agentName={viewAgent.name}
                        agentColor={viewAgent.color}
                        agentInitials={viewAgent.initials}
                        optimistic
                      />
                    ))}
                    {isAgentTyping && (
                      <TypingIndicator
                        agentName={viewAgent.name}
                        agentColor={viewAgent.color}
                        agentInitials={viewAgent.initials}
                      />
                    )}
                  </>
                ) : (
                  /* Selected agent has no active session — show start button */
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
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)", marginBottom: 6 }}>
                        {viewAgent.name}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
                        {viewAgent.role}
                        {hasSession && sessionAgent && (
                          <div style={{ marginTop: 6, color: "var(--fg-3)", fontSize: 12 }}>
                            현재 {sessionAgent.name}과(와) 대화 중 — 새 대화를 시작하면 기존 대화가 종료됩니다
                          </div>
                        )}
                      </div>
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

              {/* Composer — only when active session */}
              {viewHasActiveSession && (
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
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      disabled={sending}
                      placeholder={`${viewAgent.name}에게 메시지 보내기…`}
                      rows={1}
                      style={{
                        flex: 1, background: "transparent", border: "none", outline: "none",
                        color: "var(--fg-0)", fontSize: 13, resize: "none",
                        lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                        fontFamily: "inherit",
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
                        opacity: sending || !inputText.trim() ? 0.5 : 1,
                        flexShrink: 0,
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
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-1)", marginBottom: 6 }}>
                  에이전트를 선택하세요
                </div>
                <div style={{ fontSize: 13 }}>
                  왼쪽에서 대화할 에이전트를 선택하세요
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
