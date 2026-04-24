import type { MeetingMessage, MeetingSession } from "@paperclipai/shared";
import { api } from "./client";

export const meetingsApi = {
  getActiveSession: (companyId: string) =>
    api.get<MeetingSession>(`/companies/${companyId}/meeting-sessions/active`),

  createSession: (companyId: string, agentId?: string | null) =>
    api.post<MeetingSession>(`/companies/${companyId}/meeting-sessions`, { agentId: agentId ?? null }),

  endSession: (companyId: string, sessionId: string) =>
    api.delete<MeetingSession>(`/companies/${companyId}/meeting-sessions/${sessionId}`),

  listMessages: (companyId: string, sessionId: string) =>
    api.get<MeetingMessage[]>(`/companies/${companyId}/meeting-sessions/${sessionId}/messages`),

  sendMessage: (companyId: string, sessionId: string, body: string) =>
    api.post<MeetingMessage>(`/companies/${companyId}/meeting-sessions/${sessionId}/messages`, { body }),
};
