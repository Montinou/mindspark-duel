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

  // 3. Generate images and upload to R2
  const { generateCardImage } = await import("@/lib/ai/image-generator");
  const { uploadImage } = await import("@/lib/storage");

  for (const { cards: card } of pendingCards) {
    try {
      // Generate Image
      const imageBuffer = await generateCardImage(card.imagePrompt || `Fantasy card art for ${card.name}`);
      
      // Upload to R2
      const fileName = `cards/${card.id}-${Date.now()}.png`;
      const imageUrl = await uploadImage(imageBuffer, fileName);

      // Update card
      await db.update(cards).set({
        name: card.name === "Pending Card..." ? `Generated ${card.element} Unit` : card.name, // Keep name if already set, or generate new one? For now, mock name update
        imageUrl: imageUrl,
        // We could also update the name here using AI if we wanted, but let's stick to image for now
      }).where(eq(cards.id, card.id));

    } catch (error) {
      console.error(`Failed to process card ${card.id}:`, error);
      // Optional: Mark as failed or retry count
    }
  }

  return NextResponse.json({ 
    message: "Processed batch", 
    processedCount: pendingCards.length,
    remaining: "Check again" 
  });
}
