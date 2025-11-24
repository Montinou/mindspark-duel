import { db } from "@/db";
import { decks, cards, userCards } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function checkPendingCards() {
  console.log('🔍 Checking for pending cards...\n');

  // Check decks in 'generating' status
  const generatingDecks = await db
    .select()
    .from(decks)
    .where(eq(decks.status, 'generating'));

  console.log(`📦 Decks in 'generating' status: ${generatingDecks.length}`);
  for (const deck of generatingDecks) {
    console.log(`   - Deck ID: ${deck.id} | Theme: ${deck.theme} | User: ${deck.userId}`);
  }

  // Check for pending cards
  const pendingCards = await db
    .select()
    .from(cards)
    .where(eq(cards.name, 'Pending Card...'));

  console.log(`\n🎴 Total pending cards: ${pendingCards.length}`);

  if (pendingCards.length > 0) {
    console.log('\nPending cards by user:');
    const cardsByUser = new Map<string, number>();

    for (const card of pendingCards) {
      const userId = card.createdById || 'unknown';
      cardsByUser.set(userId, (cardsByUser.get(userId) || 0) + 1);
    }

    for (const [userId, count] of cardsByUser.entries()) {
      console.log(`   - User ${userId}: ${count} cards`);
    }
  }

  console.log('\n✅ Check complete!');
}

checkPendingCards().catch(console.error);
