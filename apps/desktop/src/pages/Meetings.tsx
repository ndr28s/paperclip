import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useCompany } from "../context/CompanyContext";
import { useActiveSession, useMeetingMessages, useAgents as useAgentsApi, RawMeetingMessage } from "../api/hooks";
import { transformAgent, relativeTime } from "../api/transforms";
import { api } from "../api/client";

// ── Message bubble ──
function MessageBubble({ msg, agentName, agentColor, agentInitials }: {
  msg: RawMeetingMessage;
  agentName: string;
  agentColor: string;
  agentInitials: string;
}) {
  const isUser = !!msg.authorUserId && !msg.authorAgentId;
  return (
    <div style={{
      display: "flex", gap: 10, padding: "6px 20px",
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start",
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
        <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 3 }}>
          {relativeTime(msg.createdAt)}
        </div>
      </div>
    </div>
  );
}

export function MeetingsPage() {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState<string | null>(null); // agentId being started
  const transcriptRef = useRef<HTMLDivElement>(null);

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

  // Auto-poll messages every 3s when session is active
  useEffect(() => {
    if (!hasSession) return;
    const id = setInterval(() => refetchMessages(), 3000);
    return () => clearInterval(id);
  }, [hasSession, refetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages?.length]);

  const handleStartChat = useCallback(async (agentId: string) => {
    if (!companyId) return;
    setStarting(agentId);
    try {
      await api.post(`/companies/${companyId}/meeting-sessions`, { agentId });
      refetchSession();
      setInputText("");
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
    } catch (err) {
      console.error("Failed to end chat:", err);
    }
  }, [companyId, session, refetchSession]);

  const handleSend = useCallback(async () => {
    if (!companyId || !session || !inputText.trim() || sending) return;
    setSending(true);
    const text = inputText.trim();
    setInputText("");
    try {
      await api.post(`/companies/${companyId}/meeting-sessions/${session.id}/messages`, { body: text });
      refetchMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
      setInputText(text);
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
              const isActive = hasSession && session.agentId === agent.id;
              const isStarting = starting === agent.id;
              return (
                <div
                  key={agent.id}
                  onClick={() => !isStarting && handleStartChat(agent.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 14px", cursor: isStarting ? "wait" : "pointer",
                    background: isActive ? "var(--bg-3)" : "transparent",
                    borderLeft: `3px solid ${isActive ? "var(--accent)" : "transparent"}`,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
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
                    {isActive && (
                      <span style={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 9, height: 9, borderRadius: "50%",
                        background: "#34C98A", border: "2px solid var(--bg-1)",
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isStarting ? "연결 중…" : isActive ? "대화 중" : agent.role}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Right: Chat panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {hasSession && sessionAgent ? (
            <>
              {/* Header */}
              <div style={{
                padding: "12px 20px", borderBottom: "1px solid var(--border-1)",
                display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
                background: "var(--bg-1)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: sessionAgent.color, color: "#fff",
                  fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {sessionAgent.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>{sessionAgent.name}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
                    {sessionAgent.role}
                    <span style={{ color: "#34C98A", marginLeft: 8 }}>● 대화 중</span>
                  </div>
                </div>
                <button
                  onClick={handleEndChat}
                  style={{
                    padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border-1)",
                    background: "transparent", color: "var(--fg-2)", fontSize: 12, cursor: "pointer",
                  }}
                >
                  대화 종료
                </button>
              </div>

              {/* Transcript */}
              <div
                ref={transcriptRef}
                style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}
              >
                {(!messages || messages.length === 0) && (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                    {sessionAgent.name}와 대화를 시작하세요
                  </div>
                )}
                {messages?.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    agentName={sessionAgent.name}
                    agentColor={sessionAgent.color}
                    agentInitials={sessionAgent.initials}
                  />
                ))}
                {sending && (
                  <div style={{ padding: "6px 20px", display: "flex", justifyContent: "flex-end" }}>
                    <div style={{
                      padding: "9px 13px", borderRadius: "12px 4px 12px 12px",
                      background: "var(--accent)", color: "white", fontSize: 13, opacity: 0.5,
                    }}>
                      전송 중…
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
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
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sending}
                    placeholder={`${sessionAgent.name}에게 메시지 보내기…`}
                    rows={1}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      color: "var(--fg-0)", fontSize: 13, resize: "none",
                      lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                      fontFamily: "inherit",
                    }}
                    onInput={e => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = Math.min(el.scrollHeight, 120) + "px";
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
            </>
          ) : (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--fg-3)",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>💬</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-1)", marginBottom: 6 }}>
                  에이전트를 선택하세요
                </div>
                <div style={{ fontSize: 13 }}>
                  왼쪽에서 대화할 에이전트를 클릭하면 채팅이 시작됩니다
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
