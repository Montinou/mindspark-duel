CREATE TYPE "public"."card_status" AS ENUM('pending', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."deck_status" AS ENUM('pending', 'generating', 'completed', 'completed_with_errors', 'failed');--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "generation_status" "card_status" DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "generation_error" text;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "error_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "completed_at" timestamp;