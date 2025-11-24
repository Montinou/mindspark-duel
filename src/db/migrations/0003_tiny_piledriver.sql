ALTER TABLE "users" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "education_level" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "interests" json;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_difficulty" integer DEFAULT 5;