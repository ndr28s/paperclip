export interface MeetingSession {
  id: string;
  companyId: string;
  agentId: string | null;
  createdAt: Date;
  endedAt: Date | null;
}

export interface MeetingMessage {
  id: string;
  sessionId: string;
  companyId: string;
  body: string;
  createdAt: Date;
  authorType: "user" | "agent";
  authorUserId: string | null;
  authorAgentId: string | null;
  agentName: string | null;
}
