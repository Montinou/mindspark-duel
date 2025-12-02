'use server';

import { stackServerApp } from "@/lib/stack";
import { claimMissionReward } from "@/lib/gamification/tracker";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { missions, userMissions } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

// Daily mission templates with balanced rewards
const DAILY_MISSION_TEMPLATES = [
  {
    type: 'solve_problems',
    title: 'Problem Solver',
    description: 'Resuelve 10 problemas en batalla',
    requirementCount: 10,
    rewardAmount: 50,
  },
  {
    type: 'win_game',
    title: 'Champion',
    description: 'Gana 3 partidas',
    requirementCount: 3,
    rewardAmount: 100,
  },
  {
    type: 'play_cards',
    title: 'Card Master',
    description: 'Juega 15 cartas',
    requirementCount: 15,
    rewardAmount: 30,
  },
  {
    type: 'play_games',
    title: 'Battle Ready',
    description: 'Juega 5 partidas',
    requirementCount: 5,
    rewardAmount: 40,
  },
  {
    type: 'solve_problems',
    title: 'Quick Thinker',
    description: 'Resuelve 5 problemas correctamente',
    requirementCount: 5,
    rewardAmount: 25,
  },
  {
    type: 'play_cards',
    title: 'Elemental Surge',
    description: 'Juega 10 cartas en batalla',
    requirementCount: 10,
    rewardAmount: 35,
  },
];

/**
 * Generate daily missions for a user
 * Called automatically when user loads dashboard
 */
export async function generateDailyMissions(userId: string) {
  try {
    // Get start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if user already has missions assigned today
    const existingTodayMissions = await db
      .select()
      .from(userMissions)
      .where(
        and(
          eq(userMissions.userId, userId),
          gte(userMissions.updatedAt, today)
        )
      )
      .limit(1);

    // If already has missions today, skip generation
    if (existingTodayMissions.length > 0) {
      console.log(`📋 User ${userId} already has daily missions for today`);
      return { generated: false, reason: 'already_exists' };
    }

    // Select 3 random missions from templates
    const shuffled = [...DAILY_MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
    const selectedTemplates = shuffled.slice(0, 3);

    // Create missions and assign to user
    for (const template of selectedTemplates) {
      // Create the mission
      const [newMission] = await db
        .insert(missions)
        .values({
          title: template.title,
          description: template.description,
          type: 'daily',
          requirementType: template.type,
          requirementCount: template.requirementCount,
          rewardAmount: template.rewardAmount,
        })
        .returning();

      // Assign to user
      await db.insert(userMissions).values({
        userId,
        missionId: newMission.id,
        progress: 0,
        completed: false,
        claimed: false,
      });
    }

    console.log(`🎯 Generated 3 daily missions for user ${userId}`);
    return { generated: true, count: 3 };
  } catch (error) {
    console.error("Error generating daily missions:", error);
    return { generated: false, error: 'generation_failed' };
  }
}

export async function claimMission(userMissionId: string) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const rewardAmount = await claimMissionReward(userMissionId, user.id);

    revalidatePath('/dashboard/missions');
    revalidatePath('/dashboard'); // Update header stats too

    return { success: true, rewardAmount };
  } catch (error) {
    console.error("Error claiming misson:", error);
    return { success: false, error: "Failed to claim mission" };
  }
}
