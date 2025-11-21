import { stackServerApp } from "@/lib/stack";
import { db } from "@/db";
import { decks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ThemeSelector } from "@/components/onboarding/ThemeSelector";
import { DeckGenerationStatus } from "@/components/onboarding/DeckGenerationStatus";
import { startDeckGeneration } from "@/app/actions/deck";

export default async function OnboardingPage() {
  const user = await stackServerApp.getUser();
  if (!user) redirect('/');

  // Check if user already has a deck
  const userDecks = await db.select().from(decks).where(eq(decks.userId, user.id));
  const currentDeck = userDecks[0];

  if (currentDeck) {
    if (currentDeck.status === 'completed') {
      redirect('/'); // Or dashboard
    }
    
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 pointer-events-none" />
        <DeckGenerationStatus />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white relative overflow-hidden py-12">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 pointer-events-none" />
      
      <div className="z-10 text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Choose Your Path
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto">
          Select a theme to guide your journey. The AI will craft a unique deck of cards tailored to your choice.
        </p>
      </div>

      <div className="z-10 w-full flex justify-center">
        <ThemeSelectorWrapper />
      </div>
    </main>
  );
}

// Client wrapper to handle the server action
'use client';
import { useState } from "react";

function ThemeSelectorWrapper() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = async (themeId: string) => {
    setIsSubmitting(true);
    try {
      await startDeckGeneration(themeId);
    } catch (error) {
      console.error("Failed to start generation:", error);
      setIsSubmitting(false);
    }
  };

  return <ThemeSelector onSelect={handleSelect} isSubmitting={isSubmitting} />;
}
