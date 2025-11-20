CREATE TABLE "card_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"theme" text NOT NULL,
	"description" text,
	"style_guidelines" text,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "flavor_text" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "effect_description" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "image_prompt" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "theme" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "tags" json;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "batch_order" integer;--> statement-breakpoint
ALTER TABLE "card_batches" ADD CONSTRAINT "card_batches_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_batch_id_card_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."card_batches"("id") ON DELETE no action ON UPDATE no action;