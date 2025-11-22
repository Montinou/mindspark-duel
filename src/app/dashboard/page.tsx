import { db } from "@/db";
import { cards, userCards, users, mastery } from "@/db/schema";
import { stackServerApp } from "@/lib/stack";
import { eq, count } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await stackServerApp.getUser();
  if (!user) return null;

  // Fetch stats
  const [cardCount] = await db
    .select({ value: count() })
    .from(userCards)
    .where(eq(userCards.userId, user.id));

  const [userData] = await db
    .select({ sparks: users.sparks })
    .from(users)
    .where(eq(users.id, user.id));

  const userMastery = await db
    .select()
    .from(mastery)
    .where(eq(mastery.userId, user.id));

  const totalMasteryLevel = userMastery.reduce((acc, curr) => acc + curr.level, 0) || 1;
  const masteryTitle = getMasteryTitle(totalMasteryLevel);

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Welcome back, {user.displayName}</h1>
        <p className="text-zinc-400">Your magical journey continues.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Cards" value={cardCount.value} />
        <StatCard title="Mastery Level" value={totalMasteryLevel} subtext={masteryTitle} />
        <StatCard title="Sparks" value={userData?.sparks || 0} subtext="Currency" />
      </div>

      {/* Recent Activity or Featured could go here */}
    </div>
  );
}

function getMasteryTitle(level: number): string {
  if (level >= 21) return "Grandmaster Wizard";
  if (level >= 11) return "Master Wizard";
  if (level >= 6) return "Adept Wizard";
  return "Novice Wizard";
}

function StatCard({ title, value, subtext }: { title: string; value: string | number; subtext?: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
      <h3 className="text-zinc-400 text-sm font-medium mb-2">{title}</h3>
      <div className="text-4xl font-bold text-white">{value}</div>
      {subtext && <div className="text-zinc-500 text-sm mt-1">{subtext}</div>}
    </div>
  );
}
