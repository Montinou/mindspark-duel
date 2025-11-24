ALTER TABLE "game_sessions" ADD COLUMN "game_state" json;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "action_history" json;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;