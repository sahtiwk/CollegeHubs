ALTER TABLE "content_item" ALTER COLUMN "embedding" SET DATA TYPE vector(3072);--> statement-breakpoint
ALTER TABLE "learner_node_state" ADD COLUMN "personalized_prerequisite_ids" text[];