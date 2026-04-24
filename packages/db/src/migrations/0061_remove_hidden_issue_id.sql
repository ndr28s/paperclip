-- BYG-98: Remove hidden_issue_id from meeting_sessions (decouple from issue system)
ALTER TABLE "meeting_sessions" DROP CONSTRAINT IF EXISTS "meeting_sessions_hidden_issue_id_fk";
--> statement-breakpoint
ALTER TABLE "meeting_sessions" DROP COLUMN IF EXISTS "hidden_issue_id";
