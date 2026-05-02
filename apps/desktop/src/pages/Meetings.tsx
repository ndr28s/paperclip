import React, { useState, useMemo, useCallback } from "react";
import { AGENTS as STATIC_AGENTS, Agent } from "../data";
import { Icon } from "../components/Icon";
import { useCompany } from "../context/CompanyContext";
import { useActiveSession, useMeetingMessages, useAgents as useAgentsApi, RawMeetingMessage } from "../api/hooks";
import { transformAgent, relativeTime } from "../api/transforms";
import { api } from "../api/client";

function LiveTranscriptMessage({ msg, agents }: { msg: RawMeetingMessage; agents: Agent[] }) {
  const isUser = !!msg.authorUserId && !msg.authorAgentId;
  const agent = msg.authorAgentId ? agents.find(a => a.id === msg.authorAgentId) : null;

  if (isUser) {
    return (
      <div className="mtg-msg user">
        <div className="mtg-msg-avatar" style={{ background: "#4A90E2" }}>SA</div>
        <div className="mtg-msg-body">
          <div className="mtg-msg-name">You</div>
          <div className="mtg-msg-bubble">{msg.body}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="mtg-msg">
      <div className="mtg-msg-avatar" style={{ background: agent?.color || "#5BA0E8" }}>{agent?.initials || "AI"}</div>
      <div className="mtg-msg-body">
        <div className="mtg-msg-name">{agent?.name || "Agent"}{agent ? ` · ${agent.role}` : ""}</div>
        <div className="mtg-msg-bubble">{msg.body}</div>
      </div>
    </div>
  );
}

export function MeetingsPage() {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  const { companyId } = useCompany();
  const { data: session, loading: sessionLoading, error: sessionError, refetch: refetchSession } = useActiveSession(companyId);
  const { data: rawAgents } = useAgentsApi(companyId);
  const { data: messages, refetch: refetchMessages } = useMeetingMessages(companyId, session?.id ?? null);

  const AGENTS: Agent[] = useMemo(() => {
    if (!rawAgents) return STATIC_AGENTS;
    return rawAgents.map(r => transformAgent(r));
  }, [rawAgents]);

  const sessionAgent = session?.agentId ? AGENTS.find(a => a.id === session.agentId) : null;

  const handleStartMeeting = useCallback(async () => {
    if (!companyId) return;
    try {
      await api.post(`/companies/${companyId}/meeting-sessions`, { agentId: null });
      refetchSession();
    } catch (err) {
      console.error("Failed to start meeting:", err);
    }
  }, [companyId, refetchSession]);

  const handleEndMeeting = useCallback(async () => {
    if (!companyId || !session) return;
    try {
      await api.delete(`/companies/${companyId}/meeting-sessions/${session.id}`);
      refetchSession();
    } catch (err) {
      console.error("Failed to end meeting:", err);
    }
  }, [companyId, session, refetchSession]);

  const handleSend = useCallback(async () => {
    if (!companyId || !session || !inputText.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/companies/${companyId}/meeting-sessions/${session.id}/messages`, { body: inputText.trim() });
      setInputText("");
      refetchMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }, [companyId, session, inputText, sending, refetchMessages]);

  if (sessionLoading) return <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--fg-3)" }}>Loading...</div></main>;

  // No active session
  const hasSession = session && !session.endedAt;

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div className="mtg-page">
        <aside className="mtg-list">
          <div className="mtg-list-head">
            <h1>Meetings</h1>
            <div className="mtg-list-sub">{hasSession ? "1 live" : "No active meetings"}</div>
            <div className="mtg-list-actions">
              <button className="btn primary" style={{ flex: 1 }} onClick={handleStartMeeting}><Icon name="plus" size={12}/> Start meeting</button>
            </div>
          </div>
          <div className="mtg-list-body">
            {hasSession && (
              <>
                <div className="mtg-list-section-label">
                  <span className="live-dot" /> Live now (1)
                </div>
                <div className="mtg-row selected">
                  <div className="mtg-row-avatar" style={{ background: sessionAgent?.color || "#5BA0E8" }}>{sessionAgent?.initials || "MT"}</div>
                  <div className="mtg-row-body">
                    <div className="mtg-row-top">
                      <span className="mtg-row-name">{sessionAgent?.name || "Meeting"}</span>
                      <span className="mtg-row-time">{relativeTime(session.createdAt)} ago</span>
                    </div>
                    <div className="mtg-row-topic">Active meeting</div>
                    <div className="mtg-row-status active">
                      <span className="dot" />
                      Live
                      <span style={{ color: "var(--fg-3)", marginLeft: 4 }}>· {messages?.length || 0} msgs</span>
                    </div>
                  </div>
                </div>
              </>
            )}
            {!hasSession && (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                No active meeting. Start one to begin a conversation.
              </div>
            )}
          </div>
        </aside>
        <div className="mtg-detail">
          {hasSession ? (
            <>
              <div className="mtg-detail-head">
                <div className="agent-avatar" style={{ background: sessionAgent?.color || "#5BA0E8" }}>{sessionAgent?.initials || "MT"}</div>
                <div className="meta">
                  <div className="topic">Active meeting</div>
                  <div className="sub">
                    {sessionAgent ? `${sessionAgent.name} · ${sessionAgent.role} · ` : ""}Started {relativeTime(session.createdAt)} ago
                    <span style={{ color: "var(--ok)", marginLeft: 8 }}>● Live</span>
                  </div>
                </div>
                <div className="mtg-detail-actions">
                  <button className="btn" onClick={() => refetchMessages()}>Refresh</button>
                  <button className="btn" onClick={handleEndMeeting}>End meeting</button>
                </div>
              </div>
              <div className="mtg-transcript">
                {(!messages || messages.length === 0) && (
                  <div className="mtg-system">Meeting started</div>
                )}
                {messages?.map((msg) => (
                  <LiveTranscriptMessage key={msg.id} msg={msg} agents={AGENTS} />
                ))}
              </div>
              <div className="mtg-composer">
                <div className="mtg-composer-inner">
                  <Icon name="user" size={14}/>
                  <input
                    type="text"
                    placeholder={sessionAgent ? `Reply to ${sessionAgent.name}...` : "Type a message..."}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
                    disabled={sending}
                  />
                  <button className="btn primary" style={{ padding: "5px 12px" }} onClick={handleSend} disabled={sending || !inputText.trim()}>
                    {sending ? "..." : "Send"}
                  </button>
                </div>
                <div className="mtg-composer-hint">
                  <span>Press <span className="kbd-inline-mtg">Ctrl Enter</span> to send</span>
                  {sessionAgent && <span style={{ marginLeft: "auto" }}>{sessionAgent.name} is in this meeting</span>}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--fg-3)", fontSize: 14 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>💬</div>
                <div style={{ fontWeight: 600, color: "var(--fg-1)", marginBottom: 6 }}>No active meeting</div>
                <div>Start a meeting to begin a conversation with your agents.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
