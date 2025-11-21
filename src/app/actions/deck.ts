'use server';

import { db } from "@/db";
import { decks } from "@/db/schema";
import { stackServerApp } from "@/lib/stack";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function startDeckGeneration(themeId: string) {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error("User not authenticated");

  const themeNameMap: Record<string, string> = {
    'technomancer': "Technomancer's Legion",
    'nature': "Grove Guardians",
    'arcane': "Arcane Scholars"
  };

  const deckName = themeNameMap[themeId] || "Custom Deck";

  // Create deck record
  await db.insert(decks).values({
    userId: user.id,
    name: deckName,
    theme: themeId,
    status: 'generating',
  });

  revalidatePath('/onboarding');
}
