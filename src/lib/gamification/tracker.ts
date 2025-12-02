import { db } from "@/db";
import { mastery, missions, userMissions, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export type GameEvent =
  | { type: 'GAME_STARTED' }
  | { type: 'GAME_WON'; turns: number; cardsPlayed: number; problemsSolved: number }
  | { type: 'GAME_LOST'; turns: number; cardsPlayed: number; problemsSolved: number }
  | { type: 'GAME_WIN'; opponentId?: string } // Legacy, kept for compatibility
  | { type: 'CARD_PLAYED'; element: string; cost: number; rarity?: string }
  | { type: 'PROBLEM_SOLVED'; category: string; difficulty: number; correct: boolean; timeMs?: number }
  | { type: 'GAME_PLAYED' };

import { checkAchievements } from "./achievements";

export async function trackEvent(userId: string, event: GameEvent) {
  try {
    // 1. Calculate and award XP
    const xpGained = calculateXP(event);
    if (xpGained > 0) {
      await db.update(users)
        .set({ sparks: sql`${users.sparks} + ${xpGained}` })
        .where(eq(users.id, userId));
      console.log(`🎮 XP awarded: ${xpGained} to user ${userId} for ${event.type}`);
    }

    // 2. Update Mastery
    if (event.type === 'CARD_PLAYED') {
      await addMasteryXp(userId, event.element, event.cost * 10);
    } else if (event.type === 'PROBLEM_SOLVED' && event.correct) {
      await addMasteryXp(userId, event.category, event.difficulty * 20);
    }

    // 3. Update Missions
    const activeMissions = await db
      .select()
      .from(userMissions)
      .innerJoin(missions, eq(userMissions.missionId, missions.id))
      .where(
        and(
          eq(userMissions.userId, userId),
          eq(userMissions.completed, false)
        )
      );

    for (const { user_missions: um, missions: m } of activeMissions) {
      let progressIncrement = 0;

      // Match mission requirement to event type
      if (m.requirementType === 'win_game' && (event.type === 'GAME_WIN' || event.type === 'GAME_WON')) {
        progressIncrement = 1;
      } else if (m.requirementType === 'play_cards' && event.type === 'CARD_PLAYED') {
        progressIncrement = 1;
      } else if (m.requirementType === 'solve_problems' && event.type === 'PROBLEM_SOLVED') {
        progressIncrement = event.correct ? 1 : 0;
      } else if (m.requirementType === 'play_games' && (event.type === 'GAME_PLAYED' || event.type === 'GAME_STARTED')) {
        progressIncrement = 1;
      }

      if (progressIncrement > 0) {
        const newProgress = um.progress + progressIncrement;
        const isCompleted = newProgress >= m.requirementCount;

        await db.update(userMissions)
          .set({
            progress: newProgress,
            completed: isCompleted,
            updatedAt: new Date()
          })
          .where(eq(userMissions.id, um.id));

        if (isCompleted) {
          console.log(`🎯 Mission completed: ${m.title} for user ${userId}`);
        }
      }
    }

    // 4. Check Achievements
    await checkAchievements(userId, event);

  } catch (error) {
    console.error("Error tracking event:", error);
  }
}

/**
 * Calculate XP rewards based on event type
 * Balanced for engagement without excessive grinding
 */
function calculateXP(event: GameEvent): number {
  switch (event.type) {
    case 'PROBLEM_SOLVED':
      return event.correct
        ? 10 + (event.difficulty * 2) // 10-30 XP for correct answers
        : 2; // Minimal XP for attempting
    case 'CARD_PLAYED':
      return 5;
    case 'GAME_WON':
      return 50 + (event.turns * 2); // Bonus for longer games
    case 'GAME_LOST':
      return 15; // Consolation XP
    case 'GAME_STARTED':
      return 5;
    case 'GAME_WIN': // Legacy event
      return 50;
    case 'GAME_PLAYED':
      return 5;
    default:
      return 0;
  }
}

async function addMasteryXp(userId: string, category: string, amount: number) {
  // Check if mastery entry exists
  const existing = await db.select().from(mastery).where(and(eq(mastery.userId, userId), eq(mastery.category, category)));
  
  if (existing.length === 0) {
    await db.insert(mastery).values({
      userId,
      category,
      xp: amount,
      level: 1
    });
  } else {
    const current = existing[0];
    const newXp = current.xp + amount;
    // Simple level formula: Level = floor(sqrt(XP / 100)) + 1
    // or just linear: Level up every 1000 XP
    const newLevel = Math.floor(newXp / 1000) + 1;
    
    await db.update(mastery)
      .set({ xp: newXp, level: newLevel, updatedAt: new Date() })
      .where(eq(mastery.id, current.id));
  }
}

export async function claimMissionReward(userMissionId: string, userId: string) {
  const result = await db.transaction(async (tx) => {
    const um = await tx.query.userMissions.findFirst({
      where: and(eq(userMissions.id, userMissionId), eq(userMissions.userId, userId)),
      with: { mission: true }
    });

    if (!um || !um.completed || um.claimed) {
      throw new Error("Mission not eligible for claim");
    }

    // Mark claimed
    await tx.update(userMissions).set({ claimed: true }).where(eq(userMissions.id, userMissionId));

    // Add Sparks
    await tx.update(users)
      .set({ sparks: sql`${users.sparks} + ${um.mission.rewardAmount}` })
      .where(eq(users.id, userId));
      
    return um.mission.rewardAmount;
  });
  
  return result;
}
