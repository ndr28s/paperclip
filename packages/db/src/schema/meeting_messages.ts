import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { meetingSessions } from "./meeting_sessions.js";

export const meetingMessages = pgTable(
  "meeting_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => meetingSessions.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id"),
    authorAgentId: uuid("author_agent_id").references(() => agents.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index("meeting_messages_session_idx").on(table.sessionId),
    companyIdx: index("meeting_messages_company_idx").on(table.companyId),
    sessionCreatedAtIdx: index("meeting_messages_session_created_at_idx").on(
      table.sessionId,
      table.createdAt,
    ),
    authorAgentIdx: index("meeting_messages_author_agent_idx").on(table.authorAgentId),
  }),
);
