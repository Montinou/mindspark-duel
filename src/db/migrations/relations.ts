import { relations } from "drizzle-orm/relations";
import { decks, deckCards, cards, cardBatches, users, mastery, problems, gameSessions, userCards, userMissions, missions, userAchievements, achievements } from "./schema";

export const deckCardsRelations = relations(deckCards, ({one}) => ({
	deck: one(decks, {
		fields: [deckCards.deckId],
		references: [decks.id]
	}),
	card: one(cards, {
		fields: [deckCards.cardId],
		references: [cards.id]
	}),
}));

export const decksRelations = relations(decks, ({one, many}) => ({
	deckCards: many(deckCards),
	user: one(users, {
		fields: [decks.userId],
		references: [users.id]
	}),
}));

export const cardsRelations = relations(cards, ({one, many}) => ({
	deckCards: many(deckCards),
	cardBatch: one(cardBatches, {
		fields: [cards.batchId],
		references: [cardBatches.id]
	}),
	user: one(users, {
		fields: [cards.createdById],
		references: [users.id]
	}),
	problems: many(problems),
	userCards: many(userCards),
}));

export const cardBatchesRelations = relations(cardBatches, ({one, many}) => ({
	cards: many(cards),
	user: one(users, {
		fields: [cardBatches.createdById],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	cards: many(cards),
	decks: many(decks),
	masteries: many(mastery),
	gameSessions_playerId: many(gameSessions, {
		relationName: "gameSessions_playerId_users_id"
	}),
	gameSessions_enemyId: many(gameSessions, {
		relationName: "gameSessions_enemyId_users_id"
	}),
	gameSessions_winnerId: many(gameSessions, {
		relationName: "gameSessions_winnerId_users_id"
	}),
	cardBatches: many(cardBatches),
	userCards: many(userCards),
	userMissions: many(userMissions),
	userAchievements: many(userAchievements),
}));

export const masteryRelations = relations(mastery, ({one}) => ({
	user: one(users, {
		fields: [mastery.userId],
		references: [users.id]
	}),
}));

export const problemsRelations = relations(problems, ({one}) => ({
	card: one(cards, {
		fields: [problems.cardId],
		references: [cards.id]
	}),
}));

export const gameSessionsRelations = relations(gameSessions, ({one}) => ({
	user_playerId: one(users, {
		fields: [gameSessions.playerId],
		references: [users.id],
		relationName: "gameSessions_playerId_users_id"
	}),
	user_enemyId: one(users, {
		fields: [gameSessions.enemyId],
		references: [users.id],
		relationName: "gameSessions_enemyId_users_id"
	}),
	user_winnerId: one(users, {
		fields: [gameSessions.winnerId],
		references: [users.id],
		relationName: "gameSessions_winnerId_users_id"
	}),
}));

export const userCardsRelations = relations(userCards, ({one}) => ({
	user: one(users, {
		fields: [userCards.userId],
		references: [users.id]
	}),
	card: one(cards, {
		fields: [userCards.cardId],
		references: [cards.id]
	}),
}));

export const userMissionsRelations = relations(userMissions, ({one}) => ({
	user: one(users, {
		fields: [userMissions.userId],
		references: [users.id]
	}),
	mission: one(missions, {
		fields: [userMissions.missionId],
		references: [missions.id]
	}),
}));

export const missionsRelations = relations(missions, ({many}) => ({
	userMissions: many(userMissions),
}));

export const userAchievementsRelations = relations(userAchievements, ({one}) => ({
	user: one(users, {
		fields: [userAchievements.userId],
		references: [users.id]
	}),
	achievement: one(achievements, {
		fields: [userAchievements.achievementId],
		references: [achievements.id]
	}),
}));

export const achievementsRelations = relations(achievements, ({many}) => ({
	userAchievements: many(userAchievements),
}));