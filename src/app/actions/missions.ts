'use server';

import { stackServerApp } from "@/lib/stack";
import { claimMissionReward } from "@/lib/gamification/tracker";
import { revalidatePath } from "next/cache";

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
