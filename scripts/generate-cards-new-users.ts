/**
 * Script to generate cards for new users registered today who don't have cards
 *
 * Run with: npx tsx scripts/generate-cards-new-users.ts
 */

import { db } from '../src/db';
import { users, cards, userCards, decks } from '../src/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import { generateCard } from '../src/lib/ai/card-generator';

const CARDS_PER_USER = 10;
const ELEMENTS = ['Fire', 'Water', 'Earth', 'Air'] as const;

async function generateCardsForNewUsers() {
  console.log('🔄 Generating cards for new users registered today...\n');

  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find users registered today
  const newUsers = await db
    .select()
    .from(users)
    .where(gte(users.createdAt, today));

  console.log(`👥 Found ${newUsers.length} users registered today\n`);

  if (newUsers.length === 0) {
    console.log('✅ No new users today. Exiting.');
    return;
  }

  // All users registered today get cards
  const usersToProcess = newUsers;

  // Get user themes from decks
  const allDecks = await db.select().from(decks);
  const userThemes: Record<string, string[]> = {};
  for (const deck of allDecks) {
    if (!userThemes[deck.userId]) {
      userThemes[deck.userId] = [];
    }
    userThemes[deck.userId].push(deck.theme);
  }

  // Generate cards for each user registered today
  for (const user of usersToProcess) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🧙 Generating cards for: ${user.name} (${user.id})`);
    console.log(`📅 Registered: ${user.createdAt}`);
    console.log(`${'═'.repeat(60)}\n`);

    const themes = userThemes[user.id] || ['Fantasy'];
    const primaryTheme = themes[0];

    console.log(`📖 Theme: ${primaryTheme}`);
    console.log(`🎴 Generating ${CARDS_PER_USER} cards...\n`);

    const generatedCards: string[] = [];

    for (let i = 0; i < CARDS_PER_USER; i++) {
      const element = ELEMENTS[i % 4];

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
  console.log('🎉 CARD GENERATION COMPLETE!');
  console.log('═'.repeat(60) + '\n');
}

// Run the script
generateCardsForNewUsers()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
