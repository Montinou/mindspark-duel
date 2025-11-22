CREATE TYPE "public"."achievement_category" AS ENUM('Combat', 'Collection', 'Mastery', 'Social', 'Special');--> statement-breakpoint
CREATE TYPE "public"."achievement_tier" AS ENUM('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond');--> statement-breakpoint
CREATE TYPE "public"."rarity" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "achievement_category" NOT NULL,
	"tier" "achievement_tier" NOT NULL,
	"requirement_type" text NOT NULL,
	"requirement_count" integer NOT NULL,
	"icon" text NOT NULL,
	"reward_sparks" integer DEFAULT 0,
	"hidden" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"theme" text NOT NULL,
	"status" text DEFAULT 'generating' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"requirement_type" text NOT NULL,
	"requirement_count" integer NOT NULL,
	"reward_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"achievement_id" uuid NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"unlocked_at" timestamp,
	"claimed" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"mission_id" uuid NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "card_batches" ALTER COLUMN "created_by_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "created_by_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "player_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "enemy_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "winner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_cards" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "rarity" "rarity" DEFAULT 'common' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sparks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pity_counter" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "has_completed_onboarding" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery" ADD CONSTRAINT "mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;