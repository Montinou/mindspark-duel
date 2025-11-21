import { db } from "@/db";
import { decks, cards, userCards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

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
    .limit(5); // Process 5 at a time to avoid timeout

  if (pendingCards.length === 0) {
    // If no pending cards, mark deck as completed
    await db.update(decks).set({ status: 'completed' }).where(eq(decks.id, deck.id));
    return NextResponse.json({ message: "Deck completed", deckId: deck.id });
  }

  // 3. "Generate" images (Mocking the AI generation for speed/reliability in this step)
  // In production, this would call the AI service
  for (const { cards: card } of pendingCards) {
    const newName = `Generated ${card.element} Unit`; // Mock name
    // Update card
    await db.update(cards).set({
      name: newName,
      // image: generatedImageUrl // We would set this here
    }).where(eq(cards.id, card.id));
  }

  return NextResponse.json({ 
    message: "Processed batch", 
    processedCount: pendingCards.length,
    remaining: "Check again" 
  });
}
