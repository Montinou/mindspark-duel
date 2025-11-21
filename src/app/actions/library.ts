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

  await db.update(users)
    .set({ sparks: userData.sparks - TOME_COST })
    .where(eq(users.id, user.id));

  // 2. Generate 3 Cards
  const newCards = [];
  let pityCounter = userData.pityCounter;

  for (let i = 0; i < 3; i++) {
    // Determine Rarity
    // Guaranteed: 1st = Common, 2nd = Uncommon, 3rd = Variable (Rare+)
    let rarity = 'common';
    if (i === 1) rarity = 'uncommon';
    if (i === 2) {
      rarity = determineRarity(pityCounter);
      // Update Pity
      if (rarity === 'epic' || rarity === 'legendary') {
        pityCounter = 0;
      } else {
        pityCounter++;
      }
    }

    // Generate Card Data
    // We need to pass rarity and theme to the generator
    // For now, we'll use a simplified prompt injection or just generate generic and assign rarity
    // Ideally, `generateCard` should accept these params.
    // I'll assume we can pass a "theme hint" to `generateCard`.
    
    const themeHint = tomeType === 'standard' ? 'Fantasy' : `${tomeType} Element`;
    
    // Generate the card (This is slow, so in prod we might want to pre-generate or use a queue)
    // For this MVP action, we'll await it (might timeout on Vercel free tier if 3x generation)
    // OPTIMIZATION: Generate 1 real card and 2 "minions" or fetch from existing pool?
    // Let's try to generate 1 fresh card and pick 2 existing ones for speed?
    // No, the user wants "Infinite TCG". 
    // Let's generate ONE fresh card (the rare one) and 2 basic ones from a "Core Set" (if we had one).
    // Since we don't have a core set, we have to generate.
    // To avoid timeout, let's generate ONLY the 3rd card (Rare+) freshly, 
    // and for the first 2, we'll just create "Standard" cards without AI image for now (or reuse placeholder).
    
    // Actually, let's just generate ONE card for this MVP step to be safe, 
    // or make the "Tome" just give 1 card for now to test the flow.
    // Prompt says "Contents: 3 Cards".
    // Let's try generating 3. If it's too slow, we'll optimize.
    
    const cardData = await generateCard({
      theme: themeHint,
      element: tomeType === 'standard' ? undefined : tomeType as any
    });

    // Save Card to DB
    const [savedCard] = await db.insert(cards).values({
      name: cardData.name,
      description: cardData.description,
      cost: cardData.cost,
      power: cardData.power,
      defense: cardData.defense,
      element: cardData.element as any,
      problemCategory: 'Math', // Default for now
      rarity: rarity as any,
      createdById: user.id,
      imagePrompt: cardData.imagePrompt
    }).returning();

    // Add to User Collection
    await db.insert(userCards).values({
      userId: user.id,
      cardId: savedCard.id
    });

    newCards.push(savedCard);
  }

  // 3. Update Pity Counter
  await db.update(users)
    .set({ pityCounter })
    .where(eq(users.id, user.id));

  return newCards;
}
