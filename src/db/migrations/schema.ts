import { pgTable, index, foreignKey, unique, uuid, integer, timestamp, text, json, boolean, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const achievementCategory = pgEnum("achievement_category", ['Combat', 'Collection', 'Mastery', 'Social', 'Special'])
export const achievementTier = pgEnum("achievement_tier", ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'])
export const cardStatus = pgEnum("card_status", ['pending', 'generating', 'completed', 'failed'])
export const deckStatus = pgEnum("deck_status", ['pending', 'generating', 'completed', 'completed_with_errors', 'failed'])
export const elementType = pgEnum("element_type", ['Fire', 'Water', 'Earth', 'Air'])
export const problemCategory = pgEnum("problem_category", ['Math', 'Logic', 'Science'])
export const rarity = pgEnum("rarity", ['common', 'uncommon', 'rare', 'epic', 'legendary'])


export const deckCards = pgTable("deck_cards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	deckId: uuid("deck_id").notNull(),
	cardId: uuid("card_id").notNull(),
	quantity: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("deck_cards_card_id_idx").using("btree", table.cardId.asc().nullsLast().op("uuid_ops")),
	index("deck_cards_deck_id_idx").using("btree", table.deckId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.deckId],
			foreignColumns: [decks.id],
			name: "deck_cards_deck_id_decks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cardId],
			foreignColumns: [cards.id],
			name: "deck_cards_card_id_cards_id_fk"
		}).onDelete("cascade"),
	unique("deck_cards_deck_id_card_id_unique").on(table.deckId, table.cardId),
]);

export const cards = pgTable("cards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	flavorText: text("flavor_text"),
	effectDescription: text("effect_description"),
	cost: integer().notNull(),
	power: integer().notNull(),
	defense: integer().notNull(),
	element: elementType().notNull(),
	problemCategory: problemCategory("problem_category").notNull(),
	rarity: rarity().default('common').notNull(),
	imageUrl: text("image_url"),
	imagePrompt: text("image_prompt"),
	theme: text(),
	tags: json(),
	batchId: uuid("batch_id"),
	batchOrder: integer("batch_order"),
	createdById: text("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	problemHints: json("problem_hints"),
	generationStatus: cardStatus("generation_status").default('pending'),
	generationError: text("generation_error"),
}, (table) => [
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [cardBatches.id],
			name: "cards_batch_id_card_batches_id_fk"
		}),
	foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "cards_created_by_id_users_id_fk"
		}),
]);

export const decks = pgTable("decks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	theme: text().notNull(),
	status: text().default('generating').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	errorCount: integer("error_count").default(0),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	index("decks_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "decks_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const mastery = pgTable("mastery", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	category: text().notNull(),
	xp: integer().default(0).notNull(),
	level: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("mastery_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "mastery_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const problems = pgTable("problems", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	cardId: uuid("card_id").notNull(),
	question: text().notNull(),
	options: json().notNull(),
	correctAnswer: text("correct_answer").notNull(),
	difficulty: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.cardId],
			foreignColumns: [cards.id],
			name: "problems_card_id_cards_id_fk"
		}),
]);

export const gameSessions = pgTable("game_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: text("player_id"),
	enemyId: text("enemy_id"),
	isAiOpponent: boolean("is_ai_opponent").default(true).notNull(),
	winnerId: text("winner_id"),
	turnsCount: integer("turns_count").default(0).notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	endedAt: timestamp("ended_at", { mode: 'string' }),
	gameState: json("game_state"),
	actionHistory: json("action_history"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("game_sessions_enemy_id_idx").using("btree", table.enemyId.asc().nullsLast().op("text_ops")),
	index("game_sessions_player_id_idx").using("btree", table.playerId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [users.id],
			name: "game_sessions_player_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.enemyId],
			foreignColumns: [users.id],
			name: "game_sessions_enemy_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.winnerId],
			foreignColumns: [users.id],
			name: "game_sessions_winner_id_users_id_fk"
		}).onDelete("set null"),
]);

export const missions = pgTable("missions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	type: text().notNull(),
	requirementType: text("requirement_type").notNull(),
	requirementCount: integer("requirement_count").notNull(),
	rewardAmount: integer("reward_amount").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const cardBatches = pgTable("card_batches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	theme: text().notNull(),
	description: text(),
	styleGuidelines: text("style_guidelines"),
	createdById: text("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "card_batches_created_by_id_users_id_fk"
		}),
]);

export const userCards = pgTable("user_cards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	cardId: uuid("card_id").notNull(),
	acquiredAt: timestamp("acquired_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_cards_card_id_idx").using("btree", table.cardId.asc().nullsLast().op("uuid_ops")),
	index("user_cards_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_cards_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cardId],
			foreignColumns: [cards.id],
			name: "user_cards_card_id_cards_id_fk"
		}).onDelete("cascade"),
]);

export const userMissions = pgTable("user_missions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	missionId: uuid("mission_id").notNull(),
	progress: integer().default(0).notNull(),
	completed: boolean().default(false).notNull(),
	claimed: boolean().default(false).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("user_missions_mission_id_idx").using("btree", table.missionId.asc().nullsLast().op("uuid_ops")),
	index("user_missions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_missions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.missionId],
			foreignColumns: [missions.id],
			name: "user_missions_mission_id_missions_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	sparks: integer().default(0).notNull(),
	pityCounter: integer("pity_counter").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
	age: integer(),
	educationLevel: text("education_level"),
	interests: json(),
	preferredDifficulty: integer("preferred_difficulty").default(5),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const userAchievements = pgTable("user_achievements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	achievementId: uuid("achievement_id").notNull(),
	progress: integer().default(0).notNull(),
	unlockedAt: timestamp("unlocked_at", { mode: 'string' }),
	claimed: boolean().default(false),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("user_achievements_achievement_id_idx").using("btree", table.achievementId.asc().nullsLast().op("uuid_ops")),
	index("user_achievements_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_achievements_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.achievementId],
			foreignColumns: [achievements.id],
			name: "user_achievements_achievement_id_achievements_id_fk"
		}).onDelete("cascade"),
]);

export const achievements = pgTable("achievements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	category: achievementCategory().notNull(),
	tier: achievementTier().notNull(),
	requirementType: text("requirement_type").notNull(),
	requirementCount: integer("requirement_count").notNull(),
	icon: text().notNull(),
	rewardSparks: integer("reward_sparks").default(0),
	hidden: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});
