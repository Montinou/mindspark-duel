'use server';

import { db } from "@/db";
import { decks } from "@/db/schema";
import { stackServerApp } from "@/lib/stack";
import { eq } from "drizzle-orm";

export async function checkDeckStatus() {
  const user = await stackServerApp.getUser();
  if (!user) return { status: 'error' };

  const userDecks = await db.select().from(decks).where(eq(decks.userId, user.id));
  const currentDeck = userDecks[0];

  if (!currentDeck) return { status: 'not_found' };
  
  return { status: currentDeck.status };
}
