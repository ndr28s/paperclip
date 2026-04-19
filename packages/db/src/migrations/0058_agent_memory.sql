CREATE TABLE "agent_memory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "session_id" text,
  "body" text NOT NULL,
  "embedding_hint" text,
  "search_vector" tsvector,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "agent_memory_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE,
  CONSTRAINT "agent_memory_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "agent_memory_agent_idx" ON "agent_memory" ("agent_id");
--> statement-breakpoint
CREATE INDEX "agent_memory_company_idx" ON "agent_memory" ("company_id");
--> statement-breakpoint
CREATE INDEX "agent_memory_created_at_idx" ON "agent_memory" ("created_at");
--> statement-breakpoint
CREATE INDEX "agent_memory_search_vector_idx" ON "agent_memory" USING GIN ("search_vector");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION agent_memory_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', NEW.body);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER agent_memory_search_vector_trigger
  BEFORE INSERT OR UPDATE OF body ON "agent_memory"
  FOR EACH ROW EXECUTE FUNCTION agent_memory_search_vector_update();
