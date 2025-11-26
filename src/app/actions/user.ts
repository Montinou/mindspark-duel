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
  // We assume all cards for a user during onboarding belong to the deck being generated
  const totalCardsResult = await db.select({ count: count() })
    .from(userCards)
    .where(eq(userCards.userId, user.id));
  
  const totalCards = totalCardsResult[0]?.count || 0;

  if (totalCards === 0) {
    return { status: currentDeck.status, progress: 0, total: 0, completed: 0 };
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
  const progress = Math.round((completedCards / totalCards) * 100);
  
  return { 
    status: currentDeck.status, 
    progress, 
    total: totalCards, 
    completed: completedCards 
  };
}
