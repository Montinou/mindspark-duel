'use server';

import { db } from "@/db";
import { cards, userCards, users, rarityEnum } from "@/db/schema";
import { stackServerApp } from "@/lib/stack";
import { eq, sql } from "drizzle-orm";
import { determineRarity } from "@/lib/game/rarity-system";
import { generateCard } from "@/lib/ai/card-generator";

// Tome Types
type TomeType = 'standard' | 'fire' | 'water' | 'earth' | 'air' | 'logic';

const TOME_COST = 100;

export async function researchTome(tomeType: TomeType) {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Check Balance & Deduct Sparks
  const [userData] = await db.select().from(users).where(eq(users.id, user.id));
  if (!userData || userData.sparks < TOME_COST) {
    throw new Error("Not enough Sparks");
  }

  // Deduct sparks immediately
  await db.update(users)
    .set({ sparks: userData.sparks - TOME_COST })
    .where(eq(users.id, user.id));

  // 2. Determine Rarities & Update Pity (Upfront)
  let pityCounter = userData.pityCounter;
  const cardConfigs = [];

  for (let i = 0; i < 3; i++) {
    let rarity = 'common';
    if (i === 1) rarity = 'uncommon';
    if (i === 2) {
      rarity = determineRarity(pityCounter);
      // Update local pity counter for next pack (or save to DB at end)
      if (rarity === 'epic' || rarity === 'legendary') {
        pityCounter = 0;
      } else {
        pityCounter++;
      }
    }
    
    const themeHint = tomeType === 'standard' ? 'Fantasy' : `${tomeType} Element`;
    cardConfigs.push({ rarity, themeHint });
  }

  // 3. Generate Cards in Parallel
  // We use Promise.allSettled to ensure we handle failures gracefully if needed, 
  // but Promise.all is fine if we want to fail the whole pack on error.
  // Let's use Promise.all for now.
  
  const cardPromises = cardConfigs.map(config => 
    generateCard({
      theme: config.themeHint,
      element: tomeType === 'standard' ? undefined : tomeType as any
    }).then(data => ({ ...data, rarity: config.rarity }))
  );

  const generatedCardsData = await Promise.all(cardPromises);

  // 4. Save Cards to DB (Parallel)
  const savedCards = await Promise.all(generatedCardsData.map(async (cardData) => {
    const [savedCard] = await db.insert(cards).values({
      name: cardData.name,
      description: cardData.description,
      cost: cardData.cost,
      power: cardData.power,
      defense: cardData.defense,
      element: cardData.element as any,
      problemCategory: 'Math', // Default for now
      rarity: cardData.rarity as any,
      createdById: user.id,
      imagePrompt: cardData.imagePrompt
    }).returning();

    // Add to User Collection
    await db.insert(userCards).values({
      userId: user.id,
      cardId: savedCard.id
    });

    return savedCard;
  }));

  // 5. Update Pity Counter
  await db.update(users)
    .set({ pityCounter })
    .where(eq(users.id, user.id));

  return savedCards;
}
