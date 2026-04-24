import { pgTable, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

export const meetingSessions = pgTable(
  "meeting_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => ({
    companyIdx: index("meeting_sessions_company_idx").on(table.companyId),
    companyEndedAtIdx: index("meeting_sessions_company_ended_at_idx").on(
      table.companyId,
      table.endedAt,
    ),
  }),
);
