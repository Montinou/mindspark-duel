import { stackServerApp } from "@/lib/stack";
import { Battlefield } from "@/components/game/Battlefield";
import { LoginButton, SignupButton, UserButton } from "@/components/auth/AuthComponents";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Roadmap } from "@/components/landing/Roadmap";
import { CTA } from "@/components/landing/CTA";
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
        <HowItWorks />
        <Roadmap />
        <CTA />
        
        {/* Footer */}
        <footer className="py-8 text-center text-zinc-600 text-sm border-t border-zinc-900 bg-zinc-950">
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
