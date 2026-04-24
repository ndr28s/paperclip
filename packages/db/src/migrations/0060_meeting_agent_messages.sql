-- Add authorAgentId to meeting_messages for agent replies
ALTER TABLE "meeting_messages" ADD COLUMN IF NOT EXISTS "author_agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_messages_author_agent_idx" ON "meeting_messages" ("author_agent_id");
