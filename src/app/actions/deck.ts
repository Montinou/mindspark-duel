'use server';

import { db } from "@/db";
import { decks } from "@/db/schema";
import { stackServerApp } from "@/lib/stack";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
        element: themeId === 'technomancer' ? 'fire' : themeId === 'nature' ? 'earth' : 'water', // Simplified mapping
        image: "/placeholder-card.png", // Placeholder
        type: "creature",
        rarity: "common",
        problemType: problemType,
        createdById: user.id,
        isPublic: false,
        prompt: `A fantasy card art for a ${themeId} creature with ${stats.power} power and ${stats.defense} defense.`, // Simple prompt for now
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

  // Trigger background processing (mock for now, or call API)
  // fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/process-deck-queue`, { method: 'POST' });

  revalidatePath('/onboarding');
}
