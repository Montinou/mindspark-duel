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

// ============================================================================
// USER STATS TABLE - Sistema de Estadísticas y Dificultad Adaptativa
// ============================================================================
// PROPÓSITO: Almacenar el rendimiento educativo del usuario para:
// 1. Calcular dificultad adaptativa por categoría (Math/Logic/Science)
// 2. Trackear SkillScore tipo Elo para matchmaking futuro
// 3. Mantener estadísticas de precisión y velocidad de respuesta
// 4. Sistema de streak (racha) para gamificación
// ============================================================================
export const userStats = pgTable('user_stats', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relación con usuario (1:1)
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(), // Un registro por usuario

  // ─────────────────────────────────────────────────────────────────────────
  // SKILL SCORES (0-100) - Sistema tipo Elo simplificado
  // ─────────────────────────────────────────────────────────────────────────
  // Estos valores representan la "habilidad" del usuario en cada categoría
  // Se actualizan usando fórmula Elo: change = K * (resultado - expected) + bonus
  // Valor inicial: 50 (punto medio)
  mathSkillScore: integer('math_skill_score').default(50).notNull(),
  logicSkillScore: integer('logic_skill_score').default(50).notNull(),
  scienceSkillScore: integer('science_skill_score').default(50).notNull(),

  // ─────────────────────────────────────────────────────────────────────────
  // CONTADORES DE PROBLEMAS - Para calcular precisión
  // ─────────────────────────────────────────────────────────────────────────
  // Total global
  totalProblemsAttempted: integer('total_problems_attempted').default(0).notNull(),
  totalProblemsCorrect: integer('total_problems_correct').default(0).notNull(),

  // Por categoría - permite calcular % acierto por área
  mathProblemsAttempted: integer('math_problems_attempted').default(0).notNull(),
  mathProblemsCorrect: integer('math_problems_correct').default(0).notNull(),
  logicProblemsAttempted: integer('logic_problems_attempted').default(0).notNull(),
  logicProblemsCorrect: integer('logic_problems_correct').default(0).notNull(),
  scienceProblemsAttempted: integer('science_problems_attempted').default(0).notNull(),
  scienceProblemsCorrect: integer('science_problems_correct').default(0).notNull(),

  // ─────────────────────────────────────────────────────────────────────────
  // TIEMPOS DE RESPUESTA (promedio en milisegundos)
  // ─────────────────────────────────────────────────────────────────────────
  // Permite identificar áreas donde el usuario es más lento/rápido
  // Se actualiza con media móvil: newAvg = (oldAvg * 0.9) + (newTime * 0.1)
  avgResponseTimeMs: integer('avg_response_time_ms').default(15000), // 15 segundos default
  mathAvgResponseTimeMs: integer('math_avg_response_time_ms').default(15000),
  logicAvgResponseTimeMs: integer('logic_avg_response_time_ms').default(15000),
  scienceAvgResponseTimeMs: integer('science_avg_response_time_ms').default(15000),

  // ─────────────────────────────────────────────────────────────────────────
  // SISTEMA DE STREAK (Racha)
  // ─────────────────────────────────────────────────────────────────────────
  // currentStreak: Cantidad de respuestas correctas consecutivas actuales
  // longestStreak: Récord personal del usuario
  // lastStreakDate: Para resetear streak si pasa mucho tiempo
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastStreakDate: timestamp('last_streak_date'),

  // ─────────────────────────────────────────────────────────────────────────
  // DIFICULTAD ADAPTATIVA (1-10) - Calculada dinámicamente
  // ─────────────────────────────────────────────────────────────────────────
  // Estos valores se recalculan después de cada problema:
  // - Si últimos 20 problemas >80% aciertos → subir +0.5
  // - Si últimos 20 problemas <50% aciertos → bajar -0.5
  // Objetivo: Mantener al usuario en "zona de flujo" (50-80% aciertos)
  mathAdaptiveDifficulty: integer('math_adaptive_difficulty').default(5).notNull(),
  logicAdaptiveDifficulty: integer('logic_adaptive_difficulty').default(5).notNull(),
  scienceAdaptiveDifficulty: integer('science_adaptive_difficulty').default(5).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Índice para búsquedas rápidas por usuario
  userIdIdx: index('user_stats_user_id_idx').on(table.userId),
}));

// ============================================================================
// PROBLEM HISTORY TABLE - Historial Detallado de Problemas Generados
// ============================================================================
// PROPÓSITO: Guardar cada problema generado con contexto completo para:
// 1. Tracking de rendimiento histórico del usuario
// 2. Análisis de qué cartas generan problemas difíciles/fáciles
// 3. Identificar problemas problemáticos (muy fáciles/difíciles)
// 4. Datos para entrenar/mejorar el generador de problemas IA
// 5. Debugging y auditoría del sistema de generación
// ============================================================================

// Enum para la fase del juego donde se generó el problema
export const problemPhaseEnum = pgEnum('problem_phase', [
  'play_card',    // Al jugar una carta desde la mano
  'attack',       // Al declarar un ataque
  'defend',       // Al declarar defensa (futuro PvP)
  'ability',      // Al usar una habilidad de carta
]);

// Enum para el generador que creó el problema
export const problemGeneratorEnum = pgEnum('problem_generator', [
  'ai_worker',     // Generado por Cloudflare Worker con LLM
  'fallback_bank', // Problema del banco de respaldo
]);

// Enum para tipo de oponente
export const opponentTypeEnum = pgEnum('opponent_type', ['ai', 'human']);

export const problemHistory = pgTable('problem_history', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relación con usuario
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  // ─────────────────────────────────────────────────────────────────────────
  // PROBLEMA GENERADO - Datos del problema en sí
  // ─────────────────────────────────────────────────────────────────────────
  category: problemCategoryEnum('category').notNull(), // Math, Logic, Science
  difficulty: integer('difficulty').notNull(),         // 1-10
  question: text('question').notNull(),                // Texto completo de la pregunta
  options: json('options').$type<string[]>(),          // Opciones de respuesta (si aplica)
  correctAnswer: text('correct_answer').notNull(),     // Respuesta correcta
  hints: json('hints').$type<string[]>(),              // Pistas generadas (si las hubo)

  // ─────────────────────────────────────────────────────────────────────────
  // RESPUESTA DEL USUARIO - Qué respondió y cómo le fue
  // ─────────────────────────────────────────────────────────────────────────
  userAnswer: text('user_answer'),                     // Lo que respondió el usuario
  isCorrect: boolean('is_correct').notNull(),          // ¿Acertó?
  responseTimeMs: integer('response_time_ms').notNull(), // Tiempo que tardó en ms
  timedOut: boolean('timed_out').default(false).notNull(), // ¿Se agotó el tiempo?

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXTO DE LA CARTA - Qué carta generó este problema
  // ─────────────────────────────────────────────────────────────────────────
  // Guardamos datos desnormalizados para queries rápidos sin JOINs
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'set null' }),
  cardName: text('card_name'),                         // Nombre de la carta
  cardElement: elementEnum('card_element'),            // Fire, Water, Earth, Air
  cardCost: integer('card_cost'),                      // Costo de maná
  cardPower: integer('card_power'),                    // Poder de ataque

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXTO DEL JUEGO - En qué momento del juego ocurrió
  // ─────────────────────────────────────────────────────────────────────────
  gameSessionId: uuid('game_session_id')
    .references(() => gameSessions.id, { onDelete: 'set null' }),
  phase: problemPhaseEnum('phase'),                    // play_card, attack, defend, ability
  turnNumber: integer('turn_number'),                  // Número de turno
  opponentType: opponentTypeEnum('opponent_type'),     // ai o human

  // ─────────────────────────────────────────────────────────────────────────
  // METADATA DE GENERACIÓN - Cómo se creó el problema
  // ─────────────────────────────────────────────────────────────────────────
  // Útil para debugging y mejora del sistema de IA
  generatedBy: problemGeneratorEnum('generated_by'),   // ai_worker o fallback_bank
  aiModel: text('ai_model'),                           // Modelo usado (ej: "llama-3.1-8b")
  problemHintsUsed: json('problem_hints_used').$type<ProblemHintsDB>(), // Hints de carta usados
  generationTimeMs: integer('generation_time_ms'),     // Tiempo que tardó en generarse

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Índices para queries frecuentes
  userIdIdx: index('problem_history_user_id_idx').on(table.userId),
  categoryIdx: index('problem_history_category_idx').on(table.category),
  createdAtIdx: index('problem_history_created_at_idx').on(table.createdAt),
  gameSessionIdx: index('problem_history_game_session_idx').on(table.gameSessionId),
  cardIdIdx: index('problem_history_card_id_idx').on(table.cardId),
}));

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

// ============================================================================
// RELACIONES PARA TABLAS DE ESTADÍSTICAS
// ============================================================================

export const userStatsRelations = relations(userStats, ({ one }) => ({
  // Relación 1:1 con usuario
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));

export const problemHistoryRelations = relations(problemHistory, ({ one }) => ({
  // Usuario que resolvió el problema
  user: one(users, {
    fields: [problemHistory.userId],
    references: [users.id],
  }),
  // Carta que generó el problema (puede ser null si se eliminó)
  card: one(cards, {
    fields: [problemHistory.cardId],
    references: [cards.id],
  }),
  // Sesión de juego donde ocurrió (puede ser null)
  gameSession: one(gameSessions, {
    fields: [problemHistory.gameSessionId],
    references: [gameSessions.id],
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

// ============================================================================
// TIPOS PARA TABLAS DE ESTADÍSTICAS
// ============================================================================
export type UserStats = typeof userStats.$inferSelect;
export type NewUserStats = typeof userStats.$inferInsert;

export type ProblemHistory = typeof problemHistory.$inferSelect;
export type NewProblemHistory = typeof problemHistory.$inferInsert;

// Tipos para enums de problem_history
export type ProblemPhase = 'play_card' | 'attack' | 'defend' | 'ability';
export type ProblemGenerator = 'ai_worker' | 'fallback_bank';
export type OpponentType = 'ai' | 'human';
