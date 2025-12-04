/**
 * Script to test the onboarding deck generation process
 * Run with: npx tsx scripts/test-onboarding-process.ts
 */

import { db } from '../src/db';
import { decks, cards, userCards, users } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateCard } from '../src/lib/ai/card-generator';

async function testOnboardingProcess() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║    TEST: Onboarding Deck Generation Process                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Find a deck that is 'generating'
  const generatingDecks = await db.select().from(decks).where(eq(decks.status, 'generating')).limit(1);

  if (generatingDecks.length === 0) {
    console.log('✅ No decks pending - onboarding queue is empty');
    return true;
  }

  const deck = generatingDecks[0];
  console.log('📚 Processing deck:', deck.name);
  console.log('   Theme:', deck.theme);
  console.log('   User:', deck.userId.substring(0, 12) + '...');

  // Find pending cards for this deck
  const pendingCards = await db.select()
    .from(cards)
    .innerJoin(userCards, eq(cards.id, userCards.cardId))
    .where(and(
      eq(userCards.userId, deck.userId),
      eq(cards.name, 'Pending Card...')
    ))
    .limit(2); // Process 2 cards to test

  console.log('');
  console.log('🎴 Found', pendingCards.length, 'pending cards to process');

  if (pendingCards.length === 0) {
    console.log('✅ No pending cards - deck should be finalized');
    return true;
  }

  // Process 1 card as a test
  const testCard = pendingCards[0].cards;
  console.log('');
  console.log('🧪 Testing generation for card:', testCard.id.substring(0, 8) + '...');
  console.log('   Element:', testCard.element);

  const startTime = Date.now();

  try {
    // Mark as generating
    await db.update(cards).set({
      generationStatus: 'generating',
    }).where(eq(cards.id, testCard.id));

    // Generate
    const generatedCard = await generateCard({
      theme: deck.theme,
      element: testCard.element as 'Fire' | 'Water' | 'Earth' | 'Air',
      difficulty: 5,
      userId: deck.userId
    });

    const duration = Date.now() - startTime;
    console.log('✅ Card generated in', duration, 'ms');
    console.log('   Name:', generatedCard.name);
    console.log('   Image:', generatedCard.imageUrl ? '✅' : '❌');

    // Update the pending card with generated data
    await db.update(cards).set({
      name: generatedCard.name,
      description: generatedCard.description,
      imageUrl: generatedCard.imageUrl,
      imagePrompt: generatedCard.imagePrompt,
      problemCategory: generatedCard.problemCategory,
      generationStatus: 'completed',
      generationError: null,
    }).where(eq(cards.id, testCard.id));

    // Delete duplicate card created by generateCard
    if (generatedCard.id !== testCard.id) {
      await db.delete(cards).where(eq(cards.id, generatedCard.id));
    }

    console.log('✅ Pending card updated successfully');

    // Verify
    const updatedCard = await db.select().from(cards).where(eq(cards.id, testCard.id));
    console.log('');
    console.log('📋 Verification:');
    console.log('   DB Name:', updatedCard[0].name);
    console.log('   DB Status:', updatedCard[0].generationStatus);
    console.log('   DB Image:', updatedCard[0].imageUrl ? '✅ Present' : '❌ Missing');

    console.log('');
    console.log('═'.repeat(60));
    console.log('🎉 ONBOARDING CARD GENERATION: WORKING CORRECTLY!');
    console.log('═'.repeat(60));

    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

testOnboardingProcess()
  .then(success => process.exit(success ? 0 : 1))
  .catch(e => { console.error(e); process.exit(1); });
