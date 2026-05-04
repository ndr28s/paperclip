-- Switch primary auth identifier from email to username (better-auth username plugin).
-- Email becomes optional so existing email-only accounts keep their address but
-- new signups can omit it entirely.

ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_username" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_username_unique" ON "user" ("username");
