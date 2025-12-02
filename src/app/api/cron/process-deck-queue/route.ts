import { db } from "@/db";
import { decks, cards, userCards, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// Constants for retry and timeout logic (ONB-03, ONB-06)
const MAX_RETRIES = 3;
const GLOBAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max per CRON execution

// Helper function to add delay between API calls
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Card data type for retry function
interface CardData {
  id: string;
  element: string;
  name: string;
}

// Generate card with retry logic and exponential backoff (ONB-03)
async function generateCardWithRetry(
  cardData: CardData,
  deck: { theme: string; userId: string },
  attempt = 1
): Promise<boolean> {
  const { generateCard } = await import("@/lib/ai/card-generator");

  try {
    // Mark card as generating
    await db.update(cards).set({
      generationStatus: 'generating',
    }).where(eq(cards.id, cardData.id));

    console.log(`🎴 Generating card ${cardData.id} (attempt ${attempt}/${MAX_RETRIES})...`);

    const generatedCard = await generateCard({
      theme: deck.theme,
      element: cardData.element as "Fire" | "Water" | "Earth" | "Air",
      difficulty: 5,
      userId: deck.userId
    });

    console.log(`✅ Card generated: "${generatedCard.name}"`);

    // Update the existing pending card with generated data
    await db.update(cards).set({
      name: generatedCard.name,
      description: generatedCard.description,
      imageUrl: generatedCard.imageUrl,
      imagePrompt: generatedCard.imagePrompt,
      problemCategory: generatedCard.problemCategory,
      generationStatus: 'completed',
      generationError: null,
    }).where(eq(cards.id, cardData.id));

    // Delete the duplicate card created by generateCard()
    if (generatedCard.id !== cardData.id) {
      await db.delete(cards).where(eq(cards.id, generatedCard.id));
    }

    return true;
  } catch (error) {
    console.error(`Card generation failed (attempt ${attempt}/${MAX_RETRIES}):`, error);

    if (attempt < MAX_RETRIES) {
      // Exponential backoff: 1s, 2s, 3s
      const backoffMs = 1000 * attempt;
      console.log(`⏱️ Retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
      return generateCardWithRetry(cardData, deck, attempt + 1);
    }

    // All retries exhausted - mark card as failed
    console.error(`❌ Card ${cardData.id} failed after ${MAX_RETRIES} attempts`);
    await db.update(cards).set({
      generationStatus: 'failed',
      generationError: String(error),
    }).where(eq(cards.id, cardData.id));

    return false;
  }
}

// This route would ideally be called by a Cron job or a background worker
// For MVP, we can call it manually or let it run on demand
export async function POST(req: Request) {
  const startTime = Date.now();

  // 1. Find a deck that is 'generating'
  const generatingDecks = await db.select().from(decks).where(eq(decks.status, 'generating')).limit(1);

  if (generatingDecks.length === 0) {
    return NextResponse.json({ message: "No decks to process" });
  }

  const deck = generatingDecks[0];

  // 2. Find cards for this user that are "Pending Card..." (not yet generated)
  const pendingCards = await db.select().from(cards)
    .innerJoin(userCards, eq(cards.id, userCards.cardId))
    .where(and(
      eq(userCards.userId, deck.userId),
      eq(cards.name, "Pending Card...")
    ))
    .limit(2); // Process 2 at a time to avoid rate limits

  if (pendingCards.length === 0) {
    // If no pending cards, check for any failed cards and finalize
    await finalizeDeckGeneration(deck);
    return NextResponse.json({ message: "Deck finalized", deckId: deck.id });
  }

  // 3. Process cards with retry logic and timeout check (ONB-03, ONB-06)
  let processedCount = 0;
  let failedCount = 0;

  for (const { cards: card } of pendingCards) {
    // Check global timeout (ONB-06)
    if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
      console.log('⏰ Global timeout reached, will continue in next run');
      break;
    }

    if (card.name !== "Pending Card...") {
      continue;
    }

    const success = await generateCardWithRetry(
      { id: card.id, element: card.element, name: card.name },
      { theme: deck.theme, userId: deck.userId }
    );

    processedCount++;
    if (!success) {
      failedCount++;
    }

    // Small delay between cards
    console.log('⏱️ Waiting 2 seconds before next card...');
    await sleep(2000);
  }

  // 4. Check if there are more pending cards for this deck
  const remainingCards = await db.select().from(cards)
    .innerJoin(userCards, eq(cards.id, userCards.cardId))
    .where(and(
      eq(userCards.userId, deck.userId),
      eq(cards.name, "Pending Card...")
    ))
    .limit(1);

  if (remainingCards.length > 0) {
    console.log('🔄 More cards pending, waiting 15 seconds before triggering next batch...');
    await sleep(15000);

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${appUrl}/api/cron/process-deck-queue`, { method: 'POST' }).catch(err => {
        console.error('Failed to trigger next batch:', err);
      });
    } catch (error) {
      console.error('Failed to trigger next batch:', error);
    }

    return NextResponse.json({
      message: "Processed batch, triggering next",
      processedCount,
      failedCount,
      remaining: true
    });
  } else {
    // All done - finalize deck
    await finalizeDeckGeneration(deck);
    return NextResponse.json({
      message: "Deck completed",
      processedCount,
      failedCount,
      remaining: false,
      deckId: deck.id
    });
  }
}

// Finalize deck generation and set hasCompletedOnboarding flag (ONB-02)
async function finalizeDeckGeneration(deck: { id: string; userId: string }) {
  console.log('✨ Finalizing deck generation...');

  // Count failed cards
  const failedCards = await db.select().from(cards)
    .innerJoin(userCards, eq(cards.id, userCards.cardId))
    .where(and(
      eq(userCards.userId, deck.userId),
      eq(cards.generationStatus, 'failed')
    ));

  const errorCount = failedCards.length;
  const finalStatus = errorCount > 0 ? 'completed_with_errors' : 'completed';

  // Update deck status (ONB-02)
  await db.update(decks).set({
    status: finalStatus,
    errorCount: errorCount,
    completedAt: new Date(),
  }).where(eq(decks.id, deck.id));

  // Set hasCompletedOnboarding flag NOW that deck is complete (ONB-02)
  await db.update(users).set({
    hasCompletedOnboarding: true,
  }).where(eq(users.id, deck.userId));

  console.log(`✅ Deck ${deck.id} finalized with status: ${finalStatus} (${errorCount} errors)`);
}
