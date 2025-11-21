import { stackServerApp } from "@/lib/stack";
import { Battlefield } from "@/components/game/Battlefield";
import { LoginButton, SignupButton, UserButton } from "@/components/auth/AuthComponents";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function Home() {
  const user = await stackServerApp.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-zinc-950/80 to-purple-900/20 pointer-events-none" />
        
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent relative z-10 drop-shadow-lg">
          Mindspark Duel
        </h1>
        <p className="text-xl text-zinc-400 max-w-md text-center relative z-10 leading-relaxed">
          Master the elements through knowledge. Challenge the Dark Quizmaster and save the realm!
        </p>
        <div className="flex gap-4 relative z-10 mt-4">
          <LoginButton />
          <SignupButton />
        </div>
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
      <div className="absolute top-4 right-4 z-50">
        <UserButton />
      </div>
      <Battlefield />
    </main>
  );
}
