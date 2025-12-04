import { db } from '../src/db';
import { decks, cards, deckCards } from '../src/db/schema';
import { eq, and, ne, inArray } from 'drizzle-orm';

async function checkGeneratedCards() {
  // Get deck ID from command line or use default
  const deckId = process.argv[2] || '08c3c5f4-8ec6-494b-b3dc-d759dbf84e3e';

  // Get all cards for this deck
  const deckCardLinks = await db.select({ cardId: deckCards.cardId })
    .from(deckCards)
    .where(eq(deckCards.deckId, deckId));

  const cardIds = deckCardLinks.map(dc => dc.cardId);

  if (cardIds.length === 0) {
    console.log('No cards found for deck');
    return;
  }

  // Get card details
  const allCards = await db.select({
    id: cards.id,
    name: cards.name,
    generationStatus: cards.generationStatus,
    generationError: cards.generationError,
    imageUrl: cards.imageUrl,
    element: cards.element,
    cost: cards.cost
  })
  .from(cards)
  .where(inArray(cards.id, cardIds));

  console.log(`Total cards in deck: ${allCards.length}\n`);

  const pending = allCards.filter(c => c.generationStatus === 'pending');
  const completed = allCards.filter(c => c.generationStatus === 'completed');
  const failed = allCards.filter(c => c.generationStatus === 'failed');

  console.log(`Pending: ${pending.length}`);
  console.log(`Completed: ${completed.length}`);
  console.log(`Failed: ${failed.length}\n`);

  if (completed.length > 0) {
    console.log('=== COMPLETED CARDS ===');
    for (const card of completed) {
      console.log(`  - ${card.name} (${card.element}, cost ${card.cost})`);
      if (card.imageUrl) {
        console.log(`    Image: ${card.imageUrl.substring(0, 60)}...`);
      }
    }
    console.log('');
  }

  if (failed.length > 0) {
    console.log('=== FAILED CARDS ===');
    for (const card of failed) {
      console.log(`  - Card ID: ${card.id.substring(0, 8)}... Error: ${card.generationError?.substring(0, 100)}`);
    }
  }
}

checkGeneratedCards().catch(console.error);
