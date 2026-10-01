CREATE TYPE "public"."answer_type" AS ENUM('mcq', 'short_answer');--> statement-breakpoint
CREATE TYPE "public"."aura_event_type" AS ENUM('checkpoint_pass', 'milestone_complete', 'path_complete', 'test_out_pass', 'streak_bonus');--> statement-breakpoint
CREATE TYPE "public"."aura_tier" AS ENUM('Spark', 'Ember', 'Flame', 'Blaze', 'Aurora');--> statement-breakpoint
CREATE TYPE "public"."domain" AS ENUM('backend', 'frontend', 'data_science', 'dsa', 'devops');--> statement-breakpoint
CREATE TYPE "public"."node_status" AS ENUM('locked', 'unlocked', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."quiz_mode" AS ENUM('checkpoint', 'test_out');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('roadmap_sh', 'manual');--> statement-breakpoint
CREATE TABLE "aura_event" (
	"id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"node_id" text,
	"type" "aura_event_type" NOT NULL,
	"points_awarded" double precision NOT NULL,
	"breakdown" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_item" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "source" NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"resource_summary" text,
	"domain" "domain" NOT NULL,
	"topic_tags" text[],
	"estimated_difficulty" double precision,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "learner" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"skill_vector" json,
	"completed_nodes" text[],
	"aura_points" integer DEFAULT 0 NOT NULL,
	"aura_tier" "aura_tier" DEFAULT 'Spark' NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"last_active" timestamp
);
--> statement-breakpoint
CREATE TABLE "learner_node_state" (
	"learner_id" text NOT NULL,
	"node_id" text NOT NULL,
	"status" "node_status" DEFAULT 'locked' NOT NULL,
	"test_out_eligible" boolean DEFAULT false NOT NULL,
	"test_out_attempted" boolean DEFAULT false NOT NULL,
	"theta_estimate" double precision,
	"last_checkpoint_score" double precision,
	"attempts" integer DEFAULT 0 NOT NULL,
	"seen_quiz_item_ids" text[]
);
--> statement-breakpoint
CREATE TABLE "quiz_item" (
	"id" text PRIMARY KEY NOT NULL,
	"node_id" text NOT NULL,
	"mode" "quiz_mode" NOT NULL,
	"prompt" text NOT NULL,
	"answer_type" "answer_type" NOT NULL,
	"correct_answer_or_rubric" json NOT NULL,
	"irt_difficulty_b" double precision NOT NULL,
	"point_value" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_source_cache" (
	"trajectory_slug" text PRIMARY KEY NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"raw_topic_tree" json NOT NULL,
	"matched_roadmap_ids" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_node" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" "domain" NOT NULL,
	"label" text NOT NULL,
	"difficulty" double precision NOT NULL,
	"prerequisite_ids" text[],
	"linked_content_ids" text[],
	"checkpoint_item_bank" text[]
);
--> statement-breakpoint
ALTER TABLE "aura_event" ADD CONSTRAINT "aura_event_learner_id_learner_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aura_event" ADD CONSTRAINT "aura_event_node_id_skill_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."skill_node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_node_state" ADD CONSTRAINT "learner_node_state_learner_id_learner_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_node_state" ADD CONSTRAINT "learner_node_state_node_id_skill_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."skill_node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_item" ADD CONSTRAINT "quiz_item_node_id_skill_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."skill_node"("id") ON DELETE no action ON UPDATE no action;