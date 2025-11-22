import { db } from "@/db";
import { achievements, userAchievements, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { GameEvent } from "./tracker";

export async function checkAchievements(userId: string, event: GameEvent) {
  try {
    // 1. Get all achievements that match the event type
    // Since we don't have a direct mapping in DB, we'll fetch all active achievements
    // Optimization: In a real app, we'd cache this or filter by category based on event
    const allAchievements = await db.select().from(achievements);

    const unlockedAchievements = [];

    for (const achievement of allAchievements) {
      // Check if user already has this achievement
      const existing = await db.query.userAchievements.findFirst({
        where: and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievement.id)
        )
      });

      if (existing?.unlockedAt) continue;

      let progressIncrement = 0;

      // Logic to determine progress based on event and achievement requirement
      // This is a simplified mapping. In a real system, we'd have a more robust rules engine.
      
      if (achievement.requirementType === 'win_game' && event.type === 'GAME_WIN') {
        progressIncrement = 1;
      } else if (achievement.requirementType === 'play_cards' && event.type === 'CARD_PLAYED') {
        progressIncrement = 1;
      } else if (achievement.requirementType === 'solve_problems' && event.type === 'PROBLEM_SOLVED') {
        progressIncrement = 1;
      } else if (achievement.requirementType === 'unique_cards' && (event.type === 'GAME_WIN' || event.type === 'GAME_PLAYED')) {
         // Check unique cards count (expensive, maybe do only on specific events)
         // For MVP, let's skip complex queries here or assume event passes count
      } else if (achievement.requirementType.startsWith('mastery_') && (event.type === 'CARD_PLAYED' || event.type === 'PROBLEM_SOLVED')) {
         // Mastery checks handled separately or we query mastery level here
      }

      if (progressIncrement > 0) {
        const currentProgress = existing?.progress || 0;
        const newProgress = currentProgress + progressIncrement;
        const isUnlocked = newProgress >= achievement.requirementCount;

        if (existing) {
          await db.update(userAchievements)
            .set({
              progress: newProgress,
              unlockedAt: isUnlocked ? new Date() : null,
              updatedAt: new Date()
            })
            .where(eq(userAchievements.id, existing.id));
        } else {
          await db.insert(userAchievements).values({
            userId,
            achievementId: achievement.id,
            progress: newProgress,
            unlockedAt: isUnlocked ? new Date() : null
          });
        }

        if (isUnlocked) {
          unlockedAchievements.push(achievement);
          // Auto-claim or just notify? Let's auto-claim rewards for now to simplify UI
          // Or keep claim manual. Let's keep claim manual for engagement.
        }
      }
    }

    return unlockedAchievements;

  } catch (error) {
    console.error("Error checking achievements:", error);
    return [];
  }
}
