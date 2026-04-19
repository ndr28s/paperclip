import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockMemoryService = vi.hoisted(() => ({
  write: vi.fn(),
  search: vi.fn(),
  listRecent: vi.fn(),
}));

const mockInstanceSettings = vi.hoisted(() => ({
  getExperimental: vi.fn(),
}));

vi.mock("../services/agent-memory.js", () => ({
  agentMemoryService: () => mockMemoryService,
}));

vi.mock("../services/instance-settings.js", () => ({
  instanceSettingsService: () => mockInstanceSettings,
}));

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

type ActorOverride = Record<string, unknown>;

async function createApp(actor: ActorOverride = {
  type: "board",
  userId: "user-1",
  companyIds: ["company-1"],
  source: "session",
  isInstanceAdmin: false,
}) {
  const [{ errorHandler }, { agentMemoryRoutes }] = await Promise.all([
    import("../middleware/index.js"),
    import("../routes/agent-memory.js"),
  ]);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use("/api", agentMemoryRoutes({} as any));
  app.use(errorHandler);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("agent memory routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  // --- flag disabled ---

  describe("when enableAgentMemory is false", () => {
    beforeEach(() => {
      mockInstanceSettings.getExperimental.mockResolvedValue({ enableAgentMemory: false });
    });

    it("POST /memory returns 403", async () => {
      const app = await createApp();
      const res = await request(app)
        .post("/api/companies/company-1/agents/agent-1/memory")
        .send({ body: "some memory" });
      expect(res.status).toBe(403);
      expect(mockMemoryService.write).not.toHaveBeenCalled();
    });

    it("GET /memory/search returns 403", async () => {
      const app = await createApp();
      const res = await request(app)
        .get("/api/companies/company-1/agents/agent-1/memory/search?q=test");
      expect(res.status).toBe(403);
      expect(mockMemoryService.search).not.toHaveBeenCalled();
    });

    it("GET /memory returns 403", async () => {
      const app = await createApp();
      const res = await request(app)
        .get("/api/companies/company-1/agents/agent-1/memory");
      expect(res.status).toBe(403);
      expect(mockMemoryService.listRecent).not.toHaveBeenCalled();
    });
  });

  // --- flag enabled ---

  describe("when enableAgentMemory is true", () => {
    beforeEach(() => {
      mockInstanceSettings.getExperimental.mockResolvedValue({ enableAgentMemory: true });
    });

    describe("POST /memory", () => {
      it("writes a memory entry and returns 201", async () => {
        const entry = {
          id: "mem-1",
          agentId: "agent-1",
          companyId: "company-1",
          sessionId: "run-abc",
          body: "Task BYG-7: deployed memory layer",
          embeddingHint: "BYG-7",
          createdAt: new Date().toISOString(),
        };
        mockMemoryService.write.mockResolvedValue(entry);

        const app = await createApp();
        const res = await request(app)
          .post("/api/companies/company-1/agents/agent-1/memory")
          .send({ body: "Task BYG-7: deployed memory layer", sessionId: "run-abc", embeddingHint: "BYG-7" });

        expect(res.status).toBe(201);
        expect(mockMemoryService.write).toHaveBeenCalledWith({
          agentId: "agent-1",
          companyId: "company-1",
          sessionId: "run-abc",
          body: "Task BYG-7: deployed memory layer",
          embeddingHint: "BYG-7",
        });
        expect(res.body).toMatchObject({ id: "mem-1", body: "Task BYG-7: deployed memory layer" });
      });

      it("returns 400 when body is empty", async () => {
        const app = await createApp();
        const res = await request(app)
          .post("/api/companies/company-1/agents/agent-1/memory")
          .send({ body: "" });
        expect(res.status).toBe(400);
        expect(mockMemoryService.write).not.toHaveBeenCalled();
      });

      it("returns 400 when body is missing", async () => {
        const app = await createApp();
        const res = await request(app)
          .post("/api/companies/company-1/agents/agent-1/memory")
          .send({});
        expect(res.status).toBe(400);
      });

      it("agent cannot write to another agent's memory", async () => {
        const app = await createApp({
          type: "agent",
          agentId: "agent-2",
          companyId: "company-1",
        });
        const res = await request(app)
          .post("/api/companies/company-1/agents/agent-1/memory")
          .send({ body: "sneaky write" });
        expect(res.status).toBe(403);
        expect(mockMemoryService.write).not.toHaveBeenCalled();
      });

      it("agent can write its own memory", async () => {
        mockMemoryService.write.mockResolvedValue({
          id: "mem-2",
          agentId: "agent-1",
          companyId: "company-1",
          sessionId: null,
          body: "my own memory",
          embeddingHint: null,
          createdAt: new Date().toISOString(),
        });
        const app = await createApp({
          type: "agent",
          agentId: "agent-1",
          companyId: "company-1",
        });
        const res = await request(app)
          .post("/api/companies/company-1/agents/agent-1/memory")
          .send({ body: "my own memory" });
        expect(res.status).toBe(201);
      });
    });

    describe("GET /memory/search", () => {
      it("returns search results", async () => {
        const results = [
          { id: "mem-1", body: "Task BYG-5 done", agentId: "agent-1", companyId: "company-1", sessionId: null, embeddingHint: null, createdAt: new Date().toISOString() },
        ];
        mockMemoryService.search.mockResolvedValue(results);

        const app = await createApp();
        const res = await request(app)
          .get("/api/companies/company-1/agents/agent-1/memory/search?q=BYG-5");

        expect(res.status).toBe(200);
        expect(mockMemoryService.search).toHaveBeenCalledWith({
          agentId: "agent-1",
          companyId: "company-1",
          query: "BYG-5",
          limit: 10,
        });
        expect(res.body.results).toHaveLength(1);
      });

      it("returns 422 when q is missing", async () => {
        const app = await createApp();
        const res = await request(app)
          .get("/api/companies/company-1/agents/agent-1/memory/search");
        expect(res.status).toBe(422);
      });

      it("respects custom limit", async () => {
        mockMemoryService.search.mockResolvedValue([]);
        const app = await createApp();
        await request(app)
          .get("/api/companies/company-1/agents/agent-1/memory/search?q=test&limit=5");
        expect(mockMemoryService.search).toHaveBeenCalledWith(
          expect.objectContaining({ limit: 5 }),
        );
      });
    });

    describe("GET /memory", () => {
      it("returns recent memory entries", async () => {
        const results = [
          { id: "mem-1", body: "recent memory", agentId: "agent-1", companyId: "company-1", sessionId: null, embeddingHint: null, createdAt: new Date().toISOString() },
        ];
        mockMemoryService.listRecent.mockResolvedValue(results);

        const app = await createApp();
        const res = await request(app)
          .get("/api/companies/company-1/agents/agent-1/memory");

        expect(res.status).toBe(200);
        expect(res.body.results).toHaveLength(1);
        expect(mockMemoryService.listRecent).toHaveBeenCalledWith({
          agentId: "agent-1",
          companyId: "company-1",
          limit: 10,
        });
      });
    });
  });
});
