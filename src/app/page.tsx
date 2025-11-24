import { stackServerApp } from "@/lib/stack";
import { t } from "@/lib/i18n";
import { GamePage } from "@/components/game/GamePage";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Roadmap } from "@/components/landing/Roadmap";
import { CTA } from "@/components/landing/CTA";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getUserCards } from "@/app/actions/library";

// Force dynamic rendering for auth checks
export const dynamic = 'force-dynamic';

export default async function Home() {
  let user;
  try {
    user = await stackServerApp.getUser();
  } catch (error) {
    console.error("Failed to fetch Stack Auth user:", error);
    // Fallback to null user (unauthenticated) or show error
    user = null;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white selection:bg-purple-500/30">
        <Hero />
        <Features />
        <HowItWorks />
        <Roadmap />
        <CTA />
        
        {/* Footer */}
        <footer className="py-8 text-center text-zinc-600 text-sm border-t border-zinc-900 bg-zinc-950">
          <p>{t('landing.footer.rights')}</p>
        </footer>
      </main>
    );
  }

  // Sync user to DB
  let dbUser;
  try {
    const existingUser = await db.select().from(users).where(eq(users.id, user.id));
    if (existingUser.length === 0) {
      const [newUser] = await db.insert(users).values({
        id: user.id,
        name: user.displayName || t('common.unknown_wizard'),
        email: user.primaryEmail || "",
      }).returning();
      dbUser = newUser;
    } else {
      dbUser = existingUser[0];
    }
  } catch (error) {
    console.error("Failed to sync user to database:", error);
    // Optional: You might want to show a toast or error message here,
    // but for now we'll just proceed so the app doesn't crash.
    // The user will see the authenticated view but might be missing DB data.
  }

  // Redirect to onboarding if not completed
  if (dbUser && !dbUser.hasCompletedOnboarding) {
    redirect('/onboarding');
  }

  // Get user's cards for the game
  const userCardsList = await getUserCards();

  return (
    <GamePage
      userName={user.displayName || t('common.unknown_wizard')}
      userId={user.id}
      userCards={userCardsList}
    />
  );
}
