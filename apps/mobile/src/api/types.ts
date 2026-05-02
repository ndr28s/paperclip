export interface RawCompany {
  id: string;
  name: string;
  status?: string;
  plan?: string;
}

export interface RawMeetingSession {
  id: string;
  companyId: string;
  agentId?: string | null;
  createdAt: string;
  endedAt?: string | null;
}

export interface RawMeetingMessage {
  id: string;
  sessionId: string;
  companyId: string;
  authorUserId?: string | null;
  authorAgentId?: string | null;
  body: string;
  createdAt: string;
}
