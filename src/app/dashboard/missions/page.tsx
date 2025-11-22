import { db } from "@/db";
import { mastery, missions, userMissions } from "@/db/schema";
import { stackServerApp } from "@/lib/stack";
import { eq, and } from "drizzle-orm";

import { MasteryProgress } from "@/components/gamification/MasteryProgress";
import { MissionsClient } from "./MissionsClient";

export const dynamic = 'force-dynamic';

export default async function MissionsPage() {
  const user = await stackServerApp.getUser();
  if (!user) return null;

  // Fetch Mastery
  const userMastery = await db
    .select()
    .from(mastery)
    .where(eq(mastery.userId, user.id));

  // Fetch Missions
  // Ideally we should ensure user has missions assigned. 
  // For MVP, if no missions, we might want to seed some? 
  // Or just show empty state.
  // Let's assume we have a seeding script or logic elsewhere (we haven't built it yet).
  // I'll add a "Generate Daily Missions" button placeholder or logic if empty.
  
  const myMissions = await db
    .select({
      um: userMissions,
      m: missions
    })
    .from(userMissions)
    .innerJoin(missions, eq(userMissions.missionId, missions.id))
    .where(eq(userMissions.userId, user.id));

  return (
    <div className="p-8 space-y-12">
      <section>
        <header className="mb-6">
          <h2 className="text-2xl font-bold">Mastery Levels</h2>
          <p className="text-zinc-400">Gain XP by playing cards and solving problems.</p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userMastery.map((m) => (
            <MasteryProgress 
              key={m.id}
              category={m.category}
              level={m.level}
              xp={m.xp}
              nextLevelXp={m.level * 1000} // Simple formula
            />
          ))}
          {userMastery.length === 0 && (
            <div className="col-span-full text-zinc-500 italic">
              Play games to unlock mastery levels!
            </div>
          )}
        </div>
      </section>

      <section>
        <header className="mb-6">
          <h2 className="text-2xl font-bold">Active Missions</h2>
          <p className="text-zinc-400">Complete tasks to earn Sparks.</p>
        </header>

        <MissionsClient missions={myMissions} />
      </section>
    </div>
  );
}
