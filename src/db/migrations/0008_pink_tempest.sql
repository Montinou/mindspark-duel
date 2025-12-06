CREATE TYPE "public"."opponent_type" AS ENUM('ai', 'human');--> statement-breakpoint
CREATE TYPE "public"."problem_generator" AS ENUM('ai_worker', 'fallback_bank');--> statement-breakpoint
CREATE TYPE "public"."problem_phase" AS ENUM('play_card', 'attack', 'defend', 'ability');--> statement-breakpoint
CREATE TABLE "problem_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category" "problem_category" NOT NULL,
	"difficulty" integer NOT NULL,
	"question" text NOT NULL,
	"options" json,
	"correct_answer" text NOT NULL,
	"hints" json,
	"user_answer" text,
	"is_correct" boolean NOT NULL,
	"response_time_ms" integer NOT NULL,
	"timed_out" boolean DEFAULT false NOT NULL,
	"card_id" uuid,
	"card_name" text,
	"card_element" "element_type",
	"card_cost" integer,
	"card_power" integer,
	"game_session_id" uuid,
	"phase" "problem_phase",
	"turn_number" integer,
	"opponent_type" "opponent_type",
	"generated_by" "problem_generator",
	"ai_model" text,
	"problem_hints_used" json,
	"generation_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"math_skill_score" integer DEFAULT 50 NOT NULL,
	"logic_skill_score" integer DEFAULT 50 NOT NULL,
	"science_skill_score" integer DEFAULT 50 NOT NULL,
	"total_problems_attempted" integer DEFAULT 0 NOT NULL,
	"total_problems_correct" integer DEFAULT 0 NOT NULL,
	"math_problems_attempted" integer DEFAULT 0 NOT NULL,
	"math_problems_correct" integer DEFAULT 0 NOT NULL,
	"logic_problems_attempted" integer DEFAULT 0 NOT NULL,
	"logic_problems_correct" integer DEFAULT 0 NOT NULL,
	"science_problems_attempted" integer DEFAULT 0 NOT NULL,
	"science_problems_correct" integer DEFAULT 0 NOT NULL,
	"avg_response_time_ms" integer DEFAULT 15000,
	"math_avg_response_time_ms" integer DEFAULT 15000,
	"logic_avg_response_time_ms" integer DEFAULT 15000,
	"science_avg_response_time_ms" integer DEFAULT 15000,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_streak_date" timestamp,
	"math_adaptive_difficulty" integer DEFAULT 5 NOT NULL,
	"logic_adaptive_difficulty" integer DEFAULT 5 NOT NULL,
	"science_adaptive_difficulty" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "problem_history" ADD CONSTRAINT "problem_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_history" ADD CONSTRAINT "problem_history_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_history" ADD CONSTRAINT "problem_history_game_session_id_game_sessions_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "problem_history_user_id_idx" ON "problem_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "problem_history_category_idx" ON "problem_history" USING btree ("category");--> statement-breakpoint
CREATE INDEX "problem_history_created_at_idx" ON "problem_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "problem_history_game_session_idx" ON "problem_history" USING btree ("game_session_id");--> statement-breakpoint
CREATE INDEX "problem_history_card_id_idx" ON "problem_history" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "user_stats_user_id_idx" ON "user_stats" USING btree ("user_id");