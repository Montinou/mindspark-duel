CREATE TABLE "deck_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "deck_cards_deck_id_card_id_unique" UNIQUE("deck_id","card_id")
);
--> statement-breakpoint
ALTER TABLE "decks" DROP CONSTRAINT "decks_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "game_sessions" DROP CONSTRAINT "game_sessions_player_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "game_sessions" DROP CONSTRAINT "game_sessions_enemy_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "game_sessions" DROP CONSTRAINT "game_sessions_winner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "mastery" DROP CONSTRAINT "mastery_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_achievement_id_achievements_id_fk";
--> statement-breakpoint
ALTER TABLE "user_cards" DROP CONSTRAINT "user_cards_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_cards" DROP CONSTRAINT "user_cards_card_id_cards_id_fk";
--> statement-breakpoint
ALTER TABLE "user_missions" DROP CONSTRAINT "user_missions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_missions" DROP CONSTRAINT "user_missions_mission_id_missions_id_fk";
--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "player_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_cards" ADD CONSTRAINT "deck_cards_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_cards" ADD CONSTRAINT "deck_cards_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_cards_deck_id_idx" ON "deck_cards" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "deck_cards_card_id_idx" ON "deck_cards" USING btree ("card_id");--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_enemy_id_users_id_fk" FOREIGN KEY ("enemy_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery" ADD CONSTRAINT "mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "decks_user_id_idx" ON "decks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_sessions_player_id_idx" ON "game_sessions" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "game_sessions_enemy_id_idx" ON "game_sessions" USING btree ("enemy_id");--> statement-breakpoint
CREATE INDEX "mastery_user_id_idx" ON "mastery" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_achievements_achievement_id_idx" ON "user_achievements" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX "user_cards_user_id_idx" ON "user_cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_cards_card_id_idx" ON "user_cards" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "user_missions_user_id_idx" ON "user_missions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_missions_mission_id_idx" ON "user_missions" USING btree ("mission_id");