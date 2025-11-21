import { stackServerApp } from "@/lib/stack";
import { Battlefield } from "@/components/game/Battlefield";
import { LoginButton, SignupButton, UserButton } from "@/components/auth/AuthComponents";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function Home() {
  const user = await stackServerApp.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white selection:bg-purple-500/30">
        <Hero />
        <Features />
        
        {/* Footer */}
        <footer className="py-8 text-center text-zinc-600 text-sm border-t border-zinc-900">
          <p>© 2025 Mindspark Duel. All rights reserved.</p>
        </footer>
      </main>
    );
  }

  // Sync user to DB
  const existingUser = await db.select().from(users).where(eq(users.id, user.id));
  if (existingUser.length === 0) {
    await db.insert(users).values({
      id: user.id,
      name: user.displayName || "Unknown Wizard",
      email: user.primaryEmail || "",
    });
  }

  // Redirect to Dashboard (Game will be moved there or accessible from there)
  // For now, let's keep the game on the home page for logged in users BUT wrap it in a dashboard-like structure later
  // Actually, the prompt says "Create a user dashboard at /dashboard".
  // So we should redirect to /dashboard if they have a deck, or /onboarding if not.
  // Let's redirect to /dashboard for now, and we'll build that page next.
  
  // WAIT: Next.js redirects in server components use `redirect`.
  // import { redirect } from 'next/navigation';
  // redirect('/dashboard');
  
  // However, for this specific step, I will just render the game here as before but prepare the ground.
  // Actually, let's follow the prompt: "Dashboard needs to be the central hub".
  // So I should redirect to /dashboard.
  
  // But first I need to create /dashboard page, otherwise it's a 404.
  // So for this specific commit, I will leave the game here but add a link to dashboard?
  // No, let's stick to the plan. I will create the dashboard page in the next step.
  // So for now, I will keep the game here but maybe add a "Go to Dashboard" button?
  // Or better, I'll just implement the landing page part now and leave the auth part as is (showing Battlefield) until I build the dashboard.
  
  return (
    <main className="relative">
      <div className="absolute top-4 right-4 z-50 flex gap-4">
        <a href="/dashboard" className="px-4 py-2 bg-zinc-800 rounded-lg text-white hover:bg-zinc-700 transition-colors">
          Dashboard
        </a>
        <UserButton />
      </div>
      <Battlefield />
    </main>
  );
}
