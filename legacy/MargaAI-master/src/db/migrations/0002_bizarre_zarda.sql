CREATE TABLE "llm_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_hash" text NOT NULL,
	"response" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "llm_cache_prompt_hash_unique" UNIQUE("prompt_hash")
);
--> statement-breakpoint
CREATE INDEX "learner_status_idx" ON "learner_node_state" USING btree ("learner_id","status");--> statement-breakpoint
CREATE INDEX "learner_node_idx" ON "learner_node_state" USING btree ("learner_id","node_id");