/**
 * Script to regenerate all user cards with the new AI Workers
 *
 * This will:
 * 1. Fetch all users and their decks
 * 2. Delete their existing cards
 * 3. Regenerate cards using the new Llama 3.3 70B + Flux workers
 *
 * Run with: npx tsx scripts/regenerate-cards.ts
 */

import { db } from '../src/db';
import { users, cards, userCards, decks } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { generateCard } from '../src/lib/ai/card-generator';

const CARDS_PER_USER = 10;

// Element distribution for variety
const ELEMENTS = ['Fire', 'Water', 'Earth', 'Air'] as const;

async function regenerateCards() {
  console.log('🔄 Starting card regeneration...\n');

  // 1. Fetch all users with their decks
  const allUsers = await db.select().from(users);
  console.log(`👥 Found ${allUsers.length} users\n`);

  if (allUsers.length === 0) {
    console.log('❌ No users found. Exiting.');
    return;
  }

  // 2. Fetch all decks to get themes
  const allDecks = await db.select().from(decks);
  console.log(`📚 Found ${allDecks.length} decks\n`);

  // Create a map of user themes
  const userThemes: Record<string, string[]> = {};
  for (const deck of allDecks) {
    if (!userThemes[deck.userId]) {
      userThemes[deck.userId] = [];
    }
    userThemes[deck.userId].push(deck.theme);
  }

  // 3. Get all existing card IDs for these users
  const existingUserCards = await db.select().from(userCards);
  const cardIds = existingUserCards.map((uc) => uc.cardId);

  console.log(`🗑️  Found ${cardIds.length} existing user cards to delete\n`);

  // 4. Delete user cards first (foreign key constraint)
  if (existingUserCards.length > 0) {
    await db.delete(userCards);
    console.log('✅ Deleted all user_cards entries\n');
  }

  // 5. Delete old cards
  if (cardIds.length > 0) {
    await db.delete(cards).where(inArray(cards.id, cardIds));
    console.log('✅ Deleted all old cards\n');
  }

  // 6. Regenerate cards for each user
  for (const user of allUsers) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🧙 Generating cards for: ${user.name} (${user.id})`);
    console.log(`${'═'.repeat(60)}\n`);

    const themes = userThemes[user.id] || ['Fantasy'];
    const primaryTheme = themes[0];

    console.log(`📖 Theme: ${primaryTheme}`);
    console.log(`🎴 Generating ${CARDS_PER_USER} cards...\n`);

    const generatedCards: string[] = [];

    for (let i = 0; i < CARDS_PER_USER; i++) {
      const element = ELEMENTS[i % 4]; // Rotate through elements

      try {
        console.log(`\n[${i + 1}/${CARDS_PER_USER}] Generating ${element} card...`);

        const card = await generateCard({
          theme: primaryTheme,
          element,
          difficulty: 5,
          userId: user.id,
        });

        console.log(`✅ Created: ${card.name} (${card.element})`);

        // Link card to user
        await db.insert(userCards).values({
          userId: user.id,
          cardId: card.id,
        });

        generatedCards.push(card.name);

        // Small delay between cards to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error generating card ${i + 1}:`, error);
      }
    }

    console.log(`\n✅ Generated ${generatedCards.length} cards for ${user.name}:`);
    generatedCards.forEach((name, idx) => console.log(`   ${idx + 1}. ${name}`));
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 CARD REGENERATION COMPLETE!');
  console.log('═'.repeat(60) + '\n');
}

// Run the script
regenerateCards()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
