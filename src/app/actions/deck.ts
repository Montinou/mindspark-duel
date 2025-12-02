'use server';

import { db } from "@/db";
import { decks, users } from "@/db/schema";
import { stackServerApp } from "@/lib/stack";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

export async function startDeckGeneration(themeId: string) {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error("User not authenticated");

  const themeNameMap: Record<string, string> = {
    'technomancer': "Technomancer's Legion",
    'nature': "Grove Guardians",
    'arcane': "Arcane Scholars"
  };

  const deckName = themeNameMap[themeId] || "Custom Deck";

  // Create deck record
  const [newDeck] = await db.insert(decks).values({
    userId: user.id,
    name: deckName,
    theme: themeId,
    status: 'generating',
  }).returning();

  // Generate placeholder cards
  const { MANA_CURVE, getProblemTypeForTheme } = await import("@/lib/game/deck-templates");
  const { generateCardStats } = await import("@/lib/game/balance");
  const { cards, userCards } = await import("@/db/schema");

  const cardsToCreate: any[] = [];

  for (const [costStr, count] of Object.entries(MANA_CURVE)) {
    const cost = parseInt(costStr);
    for (let i = 0; i < count; i++) {
      const stats = generateCardStats(cost);
      const problemType = getProblemTypeForTheme(themeId);
      
      cardsToCreate.push({
        name: "Pending Card...",
        cost: cost,
        power: stats.power,
        defense: stats.defense,
        element: themeId === 'technomancer' ? 'Fire' : themeId === 'nature' ? 'Earth' : 'Water',
        imageUrl: "/placeholder-card.png",
        rarity: "common",
        problemCategory: problemType as any, // Cast to match enum if needed, or ensure getProblemTypeForTheme returns valid enum
        createdById: user.id,
        imagePrompt: `A fantasy card art for a ${themeId} creature with ${stats.power} power and ${stats.defense} defense.`,
        description: "A placeholder card.",
      });
    }
  }

  // Insert cards and link to user
  // Note: In a real app, we might want to batch this better or use a transaction
  for (const cardData of cardsToCreate) {
    const [card] = await db.insert(cards).values(cardData).returning();
    await db.insert(userCards).values({
      userId: user.id,
      cardId: card.id,
    });
  }

  // NOTE: hasCompletedOnboarding flag will be set in process-deck-queue
  // when all cards are successfully generated (moved from here to avoid premature flag)

  // Trigger background processing
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/cron/process-deck-queue`, { method: 'POST' }).catch(err => {
      console.error('Failed to trigger background processing:', err);
    });
  } catch (error) {
    console.error('Failed to trigger background processing:', error);
  }

  revalidatePath('/onboarding');
}
