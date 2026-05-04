import { and, asc, eq, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, meetingMessages, meetingSessions } from "@paperclipai/db";
import type { MeetingMessage, MeetingSession } from "@paperclipai/shared";
import { notFound } from "../errors.js";

export function meetingService(db: Db) {
  return {
    getActiveSession: async (companyId: string): Promise<MeetingSession | null> => {
      const [row] = await db
        .select()
        .from(meetingSessions)
        .where(
          and(eq(meetingSessions.companyId, companyId), isNull(meetingSessions.endedAt)),
        )
        .orderBy(asc(meetingSessions.createdAt))
        .limit(1);
      return row ?? null;
    },

    /**
     * Returns the active session for a specific (company, agent) pair.
     * `agentId === null` matches sessions that are not bound to any agent.
     */
    getActiveSessionForAgent: async (
      companyId: string,
      agentId: string | null,
    ): Promise<MeetingSession | null> => {
      const [row] = await db
        .select()
        .from(meetingSessions)
        .where(
          and(
            eq(meetingSessions.companyId, companyId),
            isNull(meetingSessions.endedAt),
            agentId === null
              ? isNull(meetingSessions.agentId)
              : eq(meetingSessions.agentId, agentId),
          ),
        )
        .orderBy(asc(meetingSessions.createdAt))
        .limit(1);
      return row ?? null;
    },

    listActiveSessions: async (companyId: string): Promise<MeetingSession[]> => {
      return db
        .select()
        .from(meetingSessions)
        .where(
          and(eq(meetingSessions.companyId, companyId), isNull(meetingSessions.endedAt)),
        )
        .orderBy(asc(meetingSessions.createdAt));
    },

    createSession: async (companyId: string, agentId?: string | null): Promise<MeetingSession> => {
      const [row] = await db
        .insert(meetingSessions)
        .values({ companyId, agentId: agentId ?? null })
        .returning();
      return row;
    },

    endSession: async (sessionId: string, companyId: string): Promise<MeetingSession> => {
      const [row] = await db
        .update(meetingSessions)
        .set({ endedAt: new Date() })
        .where(
          and(eq(meetingSessions.id, sessionId), eq(meetingSessions.companyId, companyId)),
        )
        .returning();
      if (!row) throw notFound("Meeting session not found");
      return row;
    },

    getSession: async (sessionId: string, companyId: string) => {
      const [row] = await db
        .select()
        .from(meetingSessions)
        .where(
          and(eq(meetingSessions.id, sessionId), eq(meetingSessions.companyId, companyId)),
        )
        .limit(1);
      return row ?? null;
    },

    listMessages: async (sessionId: string, companyId: string): Promise<MeetingMessage[]> => {
      const [session] = await db
        .select()
        .from(meetingSessions)
        .where(
          and(eq(meetingSessions.id, sessionId), eq(meetingSessions.companyId, companyId)),
        )
        .limit(1);
      if (!session) throw notFound("Meeting session not found");

      const rows = await db
        .select({
          id: meetingMessages.id,
          sessionId: meetingMessages.sessionId,
          companyId: meetingMessages.companyId,
          body: meetingMessages.body,
          createdAt: meetingMessages.createdAt,
          authorUserId: meetingMessages.authorUserId,
          authorAgentId: meetingMessages.authorAgentId,
          agentName: agents.name,
        })
        .from(meetingMessages)
        .leftJoin(agents, eq(agents.id, meetingMessages.authorAgentId))
        .where(eq(meetingMessages.sessionId, sessionId))
        .orderBy(asc(meetingMessages.createdAt));

      return rows.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        companyId: r.companyId,
        body: r.body,
        createdAt: r.createdAt,
        authorType: r.authorAgentId ? "agent" : "user",
        authorUserId: r.authorUserId ?? null,
        authorAgentId: r.authorAgentId ?? null,
        agentName: r.agentName ?? null,
      }));
    },

    addUserMessage: async (
      sessionId: string,
      companyId: string,
      userId: string,
      body: string,
    ): Promise<MeetingMessage> => {
      const [row] = await db
        .insert(meetingMessages)
        .values({ sessionId, companyId, authorUserId: userId, body })
        .returning();
      return {
        id: row.id,
        sessionId: row.sessionId,
        companyId: row.companyId,
        body: row.body,
        createdAt: row.createdAt,
        authorType: "user",
        authorUserId: row.authorUserId ?? null,
        authorAgentId: null,
        agentName: null,
      };
    },

    addAgentMessage: async (
      sessionId: string,
      companyId: string,
      agentId: string,
      body: string,
    ): Promise<MeetingMessage> => {
      const [row] = await db
        .insert(meetingMessages)
        .values({ sessionId, companyId, authorAgentId: agentId, body })
        .returning();

      const [agentRow] = await db
        .select({ name: agents.name })
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);

      return {
        id: row.id,
        sessionId: row.sessionId,
        companyId: row.companyId,
        body: row.body,
        createdAt: row.createdAt,
        authorType: "agent",
        authorUserId: null,
        authorAgentId: agentId,
        agentName: agentRow?.name ?? null,
      };
    },
  };
}
