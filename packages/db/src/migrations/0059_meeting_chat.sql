CREATE TABLE "meeting_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "agent_id" uuid,
  "hidden_issue_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ended_at" timestamp with time zone,
  CONSTRAINT "meeting_sessions_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "meeting_sessions_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL,
  CONSTRAINT "meeting_sessions_hidden_issue_id_fk" FOREIGN KEY ("hidden_issue_id") REFERENCES "issues"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "author_user_id" text,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "meeting_messages_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE,
  CONSTRAINT "meeting_messages_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "meeting_sessions_company_idx" ON "meeting_sessions" ("company_id");
--> statement-breakpoint
CREATE INDEX "meeting_sessions_company_ended_at_idx" ON "meeting_sessions" ("company_id", "ended_at");
--> statement-breakpoint
CREATE INDEX "meeting_messages_session_idx" ON "meeting_messages" ("session_id");
--> statement-breakpoint
CREATE INDEX "meeting_messages_company_idx" ON "meeting_messages" ("company_id");
--> statement-breakpoint
CREATE INDEX "meeting_messages_session_created_at_idx" ON "meeting_messages" ("session_id", "created_at");
