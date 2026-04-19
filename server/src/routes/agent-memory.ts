import { Router } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import { agentMemoryService } from "../services/agent-memory.js";
import { instanceSettingsService } from "../services/instance-settings.js";
import { forbidden, unprocessable } from "../errors.js";
import { assertCompanyAccess } from "./authz.js";

const writeBodySchema = z.object({
  body: z.string().min(1).max(10_000),
  sessionId: z.string().optional(),
  embeddingHint: z.string().max(500).optional(),
});

export function agentMemoryRoutes(db: Db) {
  const router = Router();
  const memorySvc = agentMemoryService(db);
  const instanceSettings = instanceSettingsService(db);

  async function assertMemoryEnabled() {
    const { enableAgentMemory } = await instanceSettings.getExperimental();
    if (!enableAgentMemory) {
      throw forbidden("Agent memory is not enabled on this instance. Enable it in Experimental Settings.");
    }
  }

  // POST /api/companies/:companyId/agents/:agentId/memory
  router.post(
    "/companies/:companyId/agents/:agentId/memory",
    validate(writeBodySchema),
    async (req, res) => {
      const companyId = req.params["companyId"] as string;
      const agentId = req.params["agentId"] as string;
      assertCompanyAccess(req, companyId);
      await assertMemoryEnabled();

      if (req.actor.type === "agent" && req.actor.agentId !== agentId) {
        throw forbidden("Agents can only write their own memory");
      }

      const { body, sessionId, embeddingHint } = req.body as z.infer<typeof writeBodySchema>;
      const entry = await memorySvc.write({
        agentId,
        companyId,
        sessionId: sessionId ?? null,
        body,
        embeddingHint: embeddingHint ?? null,
      });
      res.status(201).json(entry);
    },
  );

  // GET /api/companies/:companyId/agents/:agentId/memory/search
  router.get(
    "/companies/:companyId/agents/:agentId/memory/search",
    async (req, res) => {
      const companyId = req.params["companyId"] as string;
      const agentId = req.params["agentId"] as string;
      assertCompanyAccess(req, companyId);
      await assertMemoryEnabled();

      const rawQ = req.query["q"];
      if (typeof rawQ !== "string" || rawQ.trim().length === 0) {
        throw unprocessable("Query parameter 'q' is required");
      }
      const rawLimit = req.query["limit"];
      const limit = rawLimit !== undefined ? Math.min(Number(rawLimit), 50) : 10;
      if (Number.isNaN(limit) || limit < 1) throw unprocessable("Invalid limit");

      const results = await memorySvc.search({
        agentId,
        companyId,
        query: rawQ,
        limit,
      });
      res.json({ results });
    },
  );

  // GET /api/companies/:companyId/agents/:agentId/memory
  router.get(
    "/companies/:companyId/agents/:agentId/memory",
    async (req, res) => {
      const companyId = req.params["companyId"] as string;
      const agentId = req.params["agentId"] as string;
      assertCompanyAccess(req, companyId);
      await assertMemoryEnabled();

      const rawLimit = req.query["limit"];
      const limit = rawLimit !== undefined ? Math.min(Number(rawLimit), 50) : 10;
      if (Number.isNaN(limit) || limit < 1) throw unprocessable("Invalid limit");

      const results = await memorySvc.listRecent({ agentId, companyId, limit });
      res.json({ results });
    },
  );

  return router;
}
