import { pgTable, text, integer, timestamp, uuid, pgEnum, json, boolean, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const elementEnum = pgEnum('element_type', ['Fire', 'Water', 'Earth', 'Air']);
export const problemCategoryEnum = pgEnum('problem_category', ['Math', 'Logic', 'Science']);
export const rarityEnum = pgEnum('rarity', ['common', 'uncommon', 'rare', 'epic', 'legendary']);

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Stack Auth uses string IDs (e.g., "user_xyz")
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  sparks: integer('sparks').default(0).notNull(),
  pityCounter: integer('pity_counter').default(0).notNull(),
  hasCompletedOnboarding: boolean('has_completed_onboarding').default(false).notNull(),

  // User profile fields for personalized problem generation
  age: integer('age'), // Optional, 5-99 years
  educationLevel: text('education_level'), // 'elementary', 'middle', 'high', 'college', 'other'
  interests: json('interests').$type<string[]>(), // Array of interest categories, max 5
  preferredDifficulty: integer('preferred_difficulty').default(5), // 1-10, default 5

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Card Batches table - for thematic card sets
export const cardBatches = pgTable('card_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // e.g., "Elemental Warriors"
  theme: text('theme').notNull(), // e.g., "Ancient Japanese Warriors"
  description: text('description'),
  styleGuidelines: text('style_guidelines'), // For consistent AI generation
  createdById: text('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Problem hints type for dynamic problem generation
// NOTE: This type should be compatible with ProblemHints in src/types/game.ts
export interface ProblemHintsDB {
  keywords: string[]; // 3-5 thematic keywords
  topics: string[]; // Required topics for problem generation
  difficulty?: number; // 1-10
  subCategory?: string; // e.g., "algebra", "geometry", "physics"
  contextType?: 'fantasy' | 'real_world' | 'abstract';
  suggestedTopics?: string[]; // 2-3 specific concepts
  examples?: string[]; // Optional example problems
}

// Card generation status enum
export const cardStatusEnum = pgEnum('card_status', ['pending', 'generating', 'completed', 'failed']);

// Cards table
export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(), // Keep for backwards compatibility
  flavorText: text('flavor_text'), // Thematic narrative text
  effectDescription: text('effect_description'), // Game mechanics description
  cost: integer('cost').notNull(), // 1-10
  power: integer('power').notNull(), // 1-10
  defense: integer('defense').notNull(), // 1-10
  element: elementEnum('element').notNull(),
  problemCategory: problemCategoryEnum('problem_category').notNull(),
  rarity: rarityEnum('rarity').default('common').notNull(),
  imageUrl: text('image_url'), // R2 URL
  imagePrompt: text('image_prompt'), // For regeneration/debugging
  theme: text('theme'), // Thematic category (e.g., "Dragons", "Samurai")
  tags: json('tags').$type<string[]>(), // Array of thematic tags
  problemHints: json('problem_hints').$type<ProblemHintsDB>(), // Dynamic problem generation metadata
  batchId: uuid('batch_id').references(() => cardBatches.id), // Link to batch
  batchOrder: integer('batch_order'), // Position in batch (1-10)
  createdById: text('created_by_id').references(() => users.id),
  // Generation tracking fields (ONB-04)
  generationStatus: cardStatusEnum('generation_status').default('pending'), // pending, generating, completed, failed
  generationError: text('generation_error'), // Error message if generation failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Problems table - stores AI-generated problems for cards
export const problems = pgTable('problems', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').references(() => cards.id).notNull(),
  question: text('question').notNull(),
  options: json('options').$type<string[]>().notNull(), // Array of answer options
  correctAnswer: text('correct_answer').notNull(),
  difficulty: integer('difficulty').notNull(), // 1-10
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User Cards (many-to-many relationship)
export const userCards = pgTable('user_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).notNull(),
  acquiredAt: timestamp('acquired_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_cards_user_id_idx').on(table.userId),
  cardIdIdx: index('user_cards_card_id_idx').on(table.cardId),
}));

// Deck status enum
export const deckStatusEnum = pgEnum('deck_status', ['pending', 'generating', 'completed', 'completed_with_errors', 'failed']);

// Decks table - tracks user decks and generation status
export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  theme: text('theme').notNull(), // 'technomancer', 'nature', 'arcane'
  status: text('status').notNull().default('generating'), // 'generating', 'completed', 'completed_with_errors', 'failed'
  // Generation tracking fields (ONB-04)
  errorCount: integer('error_count').default(0), // Number of cards that failed to generate
  completedAt: timestamp('completed_at'), // When all cards finished generating
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('decks_user_id_idx').on(table.userId),
}));

// Deck Cards table - many-to-many relationship between decks and cards
export const deckCards = pgTable('deck_cards', {
  id: uuid('id').defaultRandom().primaryKey(),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueDeckCard: unique().on(table.deckId, table.cardId),
  deckIdIdx: index('deck_cards_deck_id_idx').on(table.deckId),
  cardIdIdx: index('deck_cards_card_id_idx').on(table.cardId),
}));

// Game Sessions table
export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: text('player_id').references(() => users.id, { onDelete: 'set null' }),
  enemyId: text('enemy_id').references(() => users.id, { onDelete: 'set null' }), // null for AI opponent
  isAiOpponent: boolean('is_ai_opponent').default(true).notNull(),
  winnerId: text('winner_id').references(() => users.id, { onDelete: 'set null' }),
  turnsCount: integer('turns_count').default(0).notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),

  // Turn Manager state persistence (added for prompt #13)
  gameState: json('game_state'), // Full ExtendedGameState (includes decks, hands, boards, HP, etc.)
  actionHistory: json('action_history'), // Array of GameAction[] for debugging/replay
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  playerIdIdx: index('game_sessions_player_id_idx').on(table.playerId),
  enemyIdIdx: index('game_sessions_enemy_id_idx').on(table.enemyId),
}));

export const mastery = pgTable("mastery", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  category: text("category").notNull(), // 'Fire', 'Water', 'Math', 'Logic', etc.
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index('mastery_user_id_idx').on(table.userId),
}));

export const missions = pgTable("missions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'daily', 'weekly', 'achievement'
  requirementType: text("requirement_type").notNull(), // 'win_game', 'play_cards', 'solve_problems'
  requirementCount: integer("requirement_count").notNull(),
  rewardAmount: integer("reward_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userMissions = pgTable("user_missions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  missionId: uuid("mission_id").references(() => missions.id, { onDelete: 'cascade' }).notNull(),
  progress: integer("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  claimed: boolean("claimed").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index('user_missions_user_id_idx').on(table.userId),
  missionIdIdx: index('user_missions_mission_id_idx').on(table.missionId),
}));

export const achievementCategoryEnum = pgEnum('achievement_category', ['Combat', 'Collection', 'Mastery', 'Social', 'Special']);
export const achievementTierEnum = pgEnum('achievement_tier', ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']);

export const achievements = pgTable("achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: achievementCategoryEnum("category").notNull(),
  tier: achievementTierEnum("tier").notNull(),
  requirementType: text("requirement_type").notNull(),
  requirementCount: integer("requirement_count").notNull(),
  icon: text("icon").notNull(),
  rewardSparks: integer("reward_sparks").default(0),
  hidden: boolean("hidden").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  achievementId: uuid("achievement_id").references(() => achievements.id, { onDelete: 'cascade' }).notNull(),
  progress: integer("progress").default(0).notNull(),
  unlockedAt: timestamp("unlocked_at"),
  claimed: boolean("claimed").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index('user_achievements_user_id_idx').on(table.userId),
  achievementIdIdx: index('user_achievements_achievement_id_idx').on(table.achievementId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userCards: many(userCards),
  createdCards: many(cards),
  createdBatches: many(cardBatches),
  gamesAsPlayer: many(gameSessions, { relationName: 'player' }),
  gamesAsEnemy: many(gameSessions, { relationName: 'enemy' }),
  gamesWon: many(gameSessions, { relationName: 'winner' }),
  userAchievements: many(userAchievements),
}));

export const cardBatchesRelations = relations(cardBatches, ({ one, many }) => ({
  creator: one(users, {
    fields: [cardBatches.createdById],
    references: [users.id],
  }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  creator: one(users, {
    fields: [cards.createdById],
    references: [users.id],
  }),
  batch: one(cardBatches, {
    fields: [cards.batchId],
    references: [cardBatches.id],
  }),
  problems: many(problems),
  userCards: many(userCards),
}));

export const problemsRelations = relations(problems, ({ one }) => ({
  card: one(cards, {
    fields: [problems.cardId],
    references: [cards.id],
  }),
}));

export const userCardsRelations = relations(userCards, ({ one }) => ({
  user: one(users, {
    fields: [userCards.userId],
    references: [users.id],
  }),
  card: one(cards, {
    fields: [userCards.cardId],
    references: [cards.id],
  }),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  player: one(users, {
    fields: [gameSessions.playerId],
    references: [users.id],
    relationName: 'player',
  }),
  enemy: one(users, {
    fields: [gameSessions.enemyId],
    references: [users.id],
    relationName: 'enemy',
  }),
  winner: one(users, {
    fields: [gameSessions.winnerId],
    references: [users.id],
    relationName: 'winner',
  }),
}));

export const decksRelations = relations(decks, ({ one, many }) => ({
  user: one(users, {
    fields: [decks.userId],
    references: [users.id],
  }),
  deckCards: many(deckCards),
}));

export const deckCardsRelations = relations(deckCards, ({ one }) => ({
  deck: one(decks, {
    fields: [deckCards.deckId],
    references: [decks.id],
  }),
  card: one(cards, {
    fields: [deckCards.cardId],
    references: [cards.id],
  }),
}));

export const masteryRelations = relations(mastery, ({ one }) => ({
  user: one(users, {
    fields: [mastery.userId],
    references: [users.id],
  }),
}));

export const userMissionsRelations = relations(userMissions, ({ one }) => ({
  user: one(users, {
    fields: [userMissions.userId],
    references: [users.id],
  }),
  mission: one(missions, {
    fields: [userMissions.missionId],
    references: [missions.id],
  }),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type CardBatch = typeof cardBatches.$inferSelect;
export type NewCardBatch = typeof cardBatches.$inferInsert;

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;

export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;

export type UserCard = typeof userCards.$inferSelect;
export type NewUserCard = typeof userCards.$inferInsert;

export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;

export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;

export type DeckCard = typeof deckCards.$inferSelect;
export type NewDeckCard = typeof deckCards.$inferInsert;

export type Mastery = typeof mastery.$inferSelect;
export type Mission = typeof missions.$inferSelect;
export type UserMission = typeof userMissions.$inferSelect;

export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
