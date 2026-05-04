import { Router } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import { assertCompanyAccess } from "./authz.js";
import { heartbeatService } from "../services/index.js";
import { meetingService } from "../services/meetings.js";
import { logger } from "../middleware/logger.js";

const createSessionSchema = z.object({
  agentId: z.string().uuid().nullish(),
});

const addMessageSchema = z.object({
  body: z.string().trim().min(1),
});

export function meetingRoutes(db: Db) {
  const router = Router();
  const svc = meetingService(db);
  const heartbeat = heartbeatService(db);

  // GET active session for company (legacy: first active session, no agent filter)
  router.get("/companies/:companyId/meeting-sessions/active", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const session = await svc.getActiveSession(companyId);
    if (!session) {
      res.status(404).json({ error: "No active meeting session" });
      return;
    }
    res.json(session);
  });

  // GET all active sessions for company (one per agent under the new model)
  router.get("/companies/:companyId/meeting-sessions/active-all", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const sessions = await svc.listActiveSessions(companyId);
    res.json(sessions);
  });

  // POST create a new session — ends only the existing active session for the
  // same (company, agent) pair so concurrent per-agent rooms can coexist.
  router.post(
    "/companies/:companyId/meeting-sessions",
    validate(createSessionSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const agentId = (req.body.agentId as string | null | undefined) ?? null;
      const existing = await svc.getActiveSessionForAgent(companyId, agentId);
      if (existing) {
        await svc.endSession(existing.id, companyId);
      }

      const session = await svc.createSession(companyId, agentId);
      res.status(201).json(session);
    },
  );

  // DELETE end a session
  router.delete("/companies/:companyId/meeting-sessions/:sessionId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const sessionId = req.params.sessionId as string;
    assertCompanyAccess(req, companyId);

    const session = await svc.endSession(sessionId, companyId);
    res.json(session);
  });

  // GET messages for a session (unified user + agent)
  router.get("/companies/:companyId/meeting-sessions/:sessionId/messages", async (req, res) => {
    const companyId = req.params.companyId as string;
    const sessionId = req.params.sessionId as string;
    assertCompanyAccess(req, companyId);

    const messages = await svc.listMessages(sessionId, companyId);
    res.json(messages);
  });

  // POST add user message to session
  router.post(
    "/companies/:companyId/meeting-sessions/:sessionId/messages",
    validate(addMessageSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const sessionId = req.params.sessionId as string;
      assertCompanyAccess(req, companyId);

      if (req.actor.type !== "board" || !req.actor.userId) {
        res.status(403).json({ error: "Board user context required" });
        return;
      }
      const userId = req.actor.userId;
      const body = req.body.body as string;

      const session = await svc.getSession(sessionId, companyId);
      if (!session) {
        res.status(404).json({ error: "Meeting session not found" });
        return;
      }

      const message = await svc.addUserMessage(sessionId, companyId, userId, body);

      void (async () => {
        try {
          const assigneeId = session.agentId;
          if (!assigneeId) return;
          await heartbeat.wakeup(assigneeId, {
            source: "automation",
            triggerDetail: "system",
            reason: "meeting_message",
            payload: { sessionId, messageId: message.id, mutation: "meeting_message" },
            requestedByActorType: "user",
            requestedByActorId: userId,
            contextSnapshot: {
              sessionId,
              messageId: message.id,
              source: "meeting.message",
              wakeReason: "meeting_message",
            },
          });
        } catch (err) {
          logger.warn({ err, sessionId }, "failed to wake agent for meeting message");
        }
      })();

      res.status(201).json(message);
    },
  );

  // POST add agent reply to session (agent-authenticated)
  router.post(
    "/companies/:companyId/meeting-sessions/:sessionId/agent-messages",
    validate(addMessageSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const sessionId = req.params.sessionId as string;
      assertCompanyAccess(req, companyId);

      const session = await svc.getSession(sessionId, companyId);
      if (!session) {
        res.status(404).json({ error: "Meeting session not found" });
        return;
      }

      // Hermes (and other adapters that issue API calls without injecting
      // PAPERCLIP_API_KEY) reach this route under local_trusted as
      // local_implicit. In that case, fall back to the session's bound
      // agentId — localhost is already trusted by the deployment mode and
      // the session itself scopes the write.
      const agentId =
        req.actor.type === "agent" && req.actor.agentId
          ? req.actor.agentId
          : req.actor.source === "local_implicit" && session.agentId
            ? session.agentId
            : null;

      if (!agentId) {
        res.status(403).json({ error: "Agent authentication required" });
        return;
      }
      const body = req.body.body as string;

      const message = await svc.addAgentMessage(sessionId, companyId, agentId, body);
      res.status(201).json(message);
    },
  );

  return router;
}
