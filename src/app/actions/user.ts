'use server';

import { db } from "@/db";
import { decks, cards, userCards } from "@/db/schema";
import { stackServerApp } from "@/lib/stack";
import { eq, and, ne, count } from "drizzle-orm";

export async function checkDeckStatus() {
  const user = await stackServerApp.getUser();
  if (!user) return { status: 'error' };

  const userDecks = await db.select().from(decks).where(eq(decks.userId, user.id));
  const currentDeck = userDecks[0];

  if (!currentDeck) return { status: 'not_found' };

  // Calculate progress
  // 1. Get total cards for this user (related to this deck/onboarding)
  const totalCardsResult = await db.select({ count: count() })
    .from(userCards)
    .where(eq(userCards.userId, user.id));

  const totalCards = totalCardsResult[0]?.count || 0;

  if (totalCards === 0) {
    return { status: currentDeck.status, progress: 0, total: 0, completed: 0, failed: 0 };
  }

  // 2. Get completed cards (name is not "Pending Card...")
  const completedCardsResult = await db.select({ count: count() })
    .from(cards)
    .innerJoin(userCards, eq(cards.id, userCards.cardId))
    .where(and(
      eq(userCards.userId, user.id),
      ne(cards.name, "Pending Card...")
    ));

  const completedCards = completedCardsResult[0]?.count || 0;

  // 3. Get failed cards count (ONB-05 enhancement)
  const failedCardsResult = await db.select({ count: count() })
    .from(cards)
    .innerJoin(userCards, eq(cards.id, userCards.cardId))
    .where(and(
      eq(userCards.userId, user.id),
      eq(cards.generationStatus, 'failed')
    ));

  const failedCards = failedCardsResult[0]?.count || 0;

  // 4. Get current generating card name (if any)
  const generatingCards = await db.select({ name: cards.name })
    .from(cards)
    .innerJoin(userCards, eq(cards.id, userCards.cardId))
    .where(and(
      eq(userCards.userId, user.id),
      eq(cards.generationStatus, 'generating')
    ))
    .limit(1);

  const currentCard = generatingCards[0]?.name !== 'Pending Card...'
    ? generatingCards[0]?.name
    : undefined;

  const progress = Math.round((completedCards / totalCards) * 100);

  return {
    status: currentDeck.status,
    progress,
    total: totalCards,
    completed: completedCards,
    failed: failedCards,
    current: currentCard,
  };
}
