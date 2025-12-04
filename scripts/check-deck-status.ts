import { db } from '../src/db';
import { decks, cards, users, deckCards } from '../src/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';

async function checkStatus() {
  // Check pending decks (using 'status' field, not 'generationStatus')
  const pendingDecks = await db.select({
    id: decks.id,
    userId: decks.userId,
    theme: decks.theme,
    status: decks.status
  })
  .from(decks)
  .where(or(
    eq(decks.status, 'generating'),
    eq(decks.status, 'pending')
  ));

  console.log('Pending/Generating decks:', pendingDecks.length);

  for (const deck of pendingDecks) {
    // Get cards for this deck via deckCards junction table
    const deckCardIds = await db.select({ cardId: deckCards.cardId })
      .from(deckCards)
      .where(eq(deckCards.deckId, deck.id));

    const cardIds = deckCardIds.map(dc => dc.cardId);

    let pendingCount = 0;
    if (cardIds.length > 0) {
      const pendingCards = await db.select({ id: cards.id })
        .from(cards)
        .where(and(
          inArray(cards.id, cardIds),
          eq(cards.generationStatus, 'pending')
        ));
      pendingCount = pendingCards.length;
    }

    console.log(`  Deck ${deck.id} (${deck.theme}): ${pendingCount}/${cardIds.length} pending cards - Status: ${deck.status}`);

    // Get user info
    const user = await db.select({ id: users.id, hasCompletedOnboarding: users.hasCompletedOnboarding })
      .from(users)
      .where(eq(users.id, deck.userId))
      .limit(1);

    if (user.length > 0) {
      console.log(`    User: ${user[0].id}, onboarding: ${user[0].hasCompletedOnboarding}`);
    }
  }

  // If no pending decks, show last completed deck
  if (pendingDecks.length === 0) {
    console.log('\nNo pending decks. Showing last 3 decks...');
    const lastDecks = await db.select({
      id: decks.id,
      userId: decks.userId,
      theme: decks.theme,
      status: decks.status
    })
    .from(decks)
    .limit(3);

    for (const deck of lastDecks) {
      console.log(`  Deck: ${deck.id} (${deck.theme}) - Status: ${deck.status}`);
    }
  }
}

checkStatus().catch(console.error);
