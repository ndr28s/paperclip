import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agentMemory } from "@paperclipai/db";

export interface AgentMemoryEntry {
  id: string;
  agentId: string;
  companyId: string;
  sessionId: string | null;
  body: string;
  embeddingHint: string | null;
  createdAt: Date;
}

export interface WriteMemoryParams {
  agentId: string;
  companyId: string;
  sessionId?: string | null;
  body: string;
  embeddingHint?: string | null;
}

export interface SearchMemoryParams {
  agentId: string;
  companyId: string;
  query: string;
  limit?: number;
}

function toEntry(row: typeof agentMemory.$inferSelect): AgentMemoryEntry {
  return {
    id: row.id,
    agentId: row.agentId,
    companyId: row.companyId,
    sessionId: row.sessionId,
    body: row.body,
    embeddingHint: row.embeddingHint,
    createdAt: row.createdAt,
  };
}

export function agentMemoryService(db: Db) {
  return {
    write: async (params: WriteMemoryParams): Promise<AgentMemoryEntry> => {
      const [row] = await db
        .insert(agentMemory)
        .values({
          agentId: params.agentId,
          companyId: params.companyId,
          sessionId: params.sessionId ?? null,
          body: params.body,
          embeddingHint: params.embeddingHint ?? null,
        })
        .returning();
      return toEntry(row);
    },

    search: async (params: SearchMemoryParams): Promise<AgentMemoryEntry[]> => {
      const limit = Math.min(params.limit ?? 10, 50);
      // Normalize query: replace non-alphanumeric with spaces, then join with &
      const tsQuery = params.query
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => `${word}:*`)
        .join(" & ");

      if (!tsQuery) {
        // If query is empty after normalization, return recent entries
        const rows = await db
          .select()
          .from(agentMemory)
          .where(
            and(
              eq(agentMemory.agentId, params.agentId),
              eq(agentMemory.companyId, params.companyId),
            ),
          )
          .orderBy(desc(agentMemory.createdAt))
          .limit(limit);
        return rows.map(toEntry);
      }

      const rows = await db
        .select()
        .from(agentMemory)
        .where(
          and(
            eq(agentMemory.agentId, params.agentId),
            eq(agentMemory.companyId, params.companyId),
            sql`${agentMemory.searchVector} @@ to_tsquery('simple', ${tsQuery})`,
          ),
        )
        .orderBy(
          desc(sql`ts_rank(${agentMemory.searchVector}, to_tsquery('simple', ${tsQuery}))`),
          desc(agentMemory.createdAt),
        )
        .limit(limit);
      return rows.map(toEntry);
    },

    listRecent: async (params: {
      agentId: string;
      companyId: string;
      limit?: number;
    }): Promise<AgentMemoryEntry[]> => {
      const limit = Math.min(params.limit ?? 10, 50);
      const rows = await db
        .select()
        .from(agentMemory)
        .where(
          and(
            eq(agentMemory.agentId, params.agentId),
            eq(agentMemory.companyId, params.companyId),
          ),
        )
        .orderBy(desc(agentMemory.createdAt))
        .limit(limit);
      return rows.map(toEntry);
    },
  };
}
