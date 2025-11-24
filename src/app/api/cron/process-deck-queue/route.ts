import { db } from "@/db";
import { decks, cards, userCards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// Helper function to add delay between API calls
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// This route would ideally be called by a Cron job or a background worker
// For MVP, we can call it manually or let it run on demand
export async function POST(req: Request) {
  // 1. Find a deck that is 'generating'
  const generatingDecks = await db.select().from(decks).where(eq(decks.status, 'generating')).limit(1);
  
  if (generatingDecks.length === 0) {
    return NextResponse.json({ message: "No decks to process" });
  }

  const deck = generatingDecks[0];

  // 2. Find cards for this user that are "Pending Card..."
  // In a real app, we'd link cards to decks explicitly, but here we use userId and name convention
  const pendingCards = await db.select().from(cards)
    .innerJoin(userCards, eq(cards.id, userCards.cardId))
    .where(and(
      eq(userCards.userId, deck.userId),
      eq(cards.name, "Pending Card...")
    ))
    .limit(2); // Process 2 at a time to avoid rate limits

  if (pendingCards.length === 0) {
    // If no pending cards, mark deck as completed
    await db.update(decks).set({ status: 'completed' }).where(eq(decks.id, deck.id));
    return NextResponse.json({ message: "Deck completed", deckId: deck.id });
  }

  // 3. Generate card text and images using Workers AI
  const { generateCard } = await import("@/lib/ai/card-generator");

  for (const { cards: card } of pendingCards) {
    console.log(`\n🎴 Processing card ${card.id} (${card.element})...`);

    if (card.name !== "Pending Card...") {
      throw new Error(`Card ${card.id} is not pending`);
    }

    console.log('🎴 Generating complete card with Workers AI...');

    // Generate complete card using Workers AI
    const generatedCard = await generateCard({
      theme: deck.theme,
      element: card.element as "Fire" | "Water" | "Earth" | "Air",
      difficulty: 5,
      userId: deck.userId
    });

    console.log(`✅ Card generated: "${generatedCard.name}"`);

    // Update the existing pending card with generated data
    console.log('💾 Updating card in database...');
    await db.update(cards).set({
      name: generatedCard.name,
      description: generatedCard.description,
      imageUrl: generatedCard.imageUrl,
      imagePrompt: generatedCard.imagePrompt,
      problemCategory: generatedCard.problemCategory,
      // Keep original cost, power, defense from pending card
    }).where(eq(cards.id, card.id));

    // Delete the duplicate card created by generateCard()
    if (generatedCard.id !== card.id) {
      await db.delete(cards).where(eq(cards.id, generatedCard.id));
    }

    console.log(`✅ Card ${card.id} processed successfully!`);

    // Small delay between cards
    console.log('⏱️  Waiting 2 seconds before next card...');
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
    // Add delay before triggering next batch to avoid rate limits
    await sleep(15000);

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      // Fire and forget - don't await
      fetch(`${appUrl}/api/cron/process-deck-queue`, { method: 'POST' }).catch(err => {
        console.error('Failed to trigger next batch:', err);
      });
    } catch (error) {
      console.error('Failed to trigger next batch:', error);
    }
    
    return NextResponse.json({ 
      message: "Processed batch, triggering next", 
      processedCount: pendingCards.length,
      remaining: true 
    });
  } else {
    // All done!
    console.log('✨ Deck generation complete!');
    await db.update(decks).set({ status: 'completed' }).where(eq(decks.id, deck.id));
    return NextResponse.json({ 
      message: "Deck completed", 
      processedCount: pendingCards.length,
      remaining: false,
      deckId: deck.id 
    });
  }
}
