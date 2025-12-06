/**
 * Test the Deck Orchestrator Worker
 * This script simulates the onboarding flow:
 * 1. Creates a test user (or uses existing)
 * 2. Creates a deck in the database
 * 3. Creates pending card entries
 * 4. Calls the orchestrator to generate cards
 */

import { db } from '../src/db';
import { users, decks, cards, deckCards, userCards } from '../src/db/schema';

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

const ORCHESTRATOR_URL = getEnvVar('DECK_ORCHESTRATOR_URL');
const ORCHESTRATOR_SECRET = getEnvVar('DECK_ORCHESTRATOR_SECRET');

const THEME = 'technomancer';
const ELEMENTS: ('Fire' | 'Water' | 'Earth' | 'Air')[] = ['Fire', 'Water', 'Earth', 'Air'];
const PROBLEM_CATEGORIES: ('Math' | 'Logic' | 'Science')[] = ['Math', 'Logic', 'Science'];

// Mana curve for 20-card deck
const MANA_CURVE = [
  { cost: 1, count: 3 },  // 3 cards at 1 mana
  { cost: 2, count: 4 },  // 4 cards at 2 mana
  { cost: 3, count: 4 },  // 4 cards at 3 mana
  { cost: 4, count: 3 },  // 3 cards at 4 mana
  { cost: 5, count: 3 },  // 3 cards at 5 mana
  { cost: 6, count: 2 },  // 2 cards at 6 mana
  { cost: 7, count: 1 },  // 1 card at 7 mana
];

async function main() {
  console.log('🧪 Testing Deck Orchestrator Worker');
  console.log('=====================================\n');

  // Step 1: Get or create test user
  console.log('1️⃣ Setting up test user...');
  const testUserId = `test_orch_${Date.now()}`;

  await db.insert(users).values({
    id: testUserId,
    name: 'Test Orchestrator User',
    email: `test_orch_${Date.now()}@test.com`,
    sparks: 0,
    hasCompletedOnboarding: false,
  });
  console.log(`   Created user: ${testUserId}`);

  // Step 2: Create a new deck
  console.log('\n2️⃣ Creating deck...');
  const [newDeck] = await db.insert(decks).values({
    userId: testUserId,
    name: `${THEME.charAt(0).toUpperCase() + THEME.slice(1)} Starter Deck`,
    theme: THEME,
    status: 'generating',
    errorCount: 0,
  }).returning();
  console.log(`   Created deck: ${newDeck.id}`);

  // Step 3: Create pending cards
  console.log('\n3️⃣ Creating pending card entries...');
  let cardIndex = 0;
  const createdCards: { id: string }[] = [];

  for (const slot of MANA_CURVE) {
    for (let i = 0; i < slot.count; i++) {
      const element = ELEMENTS[cardIndex % ELEMENTS.length];
      const problemCategory = PROBLEM_CATEGORIES[cardIndex % PROBLEM_CATEGORIES.length];

      const [card] = await db.insert(cards).values({
        name: 'Pending...',
        description: 'Card generation pending',
        cost: slot.cost,
        power: Math.max(1, Math.floor(slot.cost * 0.8)),
        defense: Math.max(1, Math.floor(slot.cost * 0.6)),
        element,
        problemCategory,
        rarity: slot.cost >= 6 ? 'rare' : slot.cost >= 4 ? 'uncommon' : 'common',
        theme: THEME,
        generationStatus: 'pending',
        createdById: testUserId,
      }).returning();

      createdCards.push({ id: card.id });

      // Link card to deck
      await db.insert(deckCards).values({
        deckId: newDeck.id,
        cardId: card.id,
        quantity: 1,
      });

      // Assign card to user
      await db.insert(userCards).values({
        userId: testUserId,
        cardId: card.id,
      });

      cardIndex++;
    }
  }
  console.log(`   Created ${createdCards.length} pending cards`);

  // Step 4: Call the orchestrator
  console.log('\n4️⃣ Calling Deck Orchestrator...');
  console.log(`   URL: ${ORCHESTRATOR_URL}`);

  const response = await fetch(ORCHESTRATOR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ORCHESTRATOR_SECRET}`,
    },
    body: JSON.stringify({
      userId: testUserId,
      theme: THEME,
      deckId: newDeck.id,
    }),
  });

  const result = await response.json();
  console.log(`   Response status: ${response.status}`);
  console.log(`   Response:`, JSON.stringify(result, null, 2));

  if (response.ok && result.success) {
    console.log('\n5️⃣ Orchestrator accepted the job. Processing will continue in background.');
    console.log('   Check the Cloudflare Worker logs for progress.');
    console.log(`   Run this to check deck status: npx tsx scripts/check-deck-status.ts`);
    console.log(`\n   Deck ID: ${newDeck.id}`);
    console.log(`   User ID: ${testUserId}`);
  } else {
    console.log('\n❌ Orchestrator rejected the request:', result);
  }
}

main().catch(console.error);
