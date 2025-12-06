/**
 * Turn Manager Test Suite
 *
 * Comprehensive tests for Turn Manager implementation (Prompt #13)
 * Tests run against production database to ensure real-world functionality
 *
 * Test Coverage:
 * 1. Turn Progression (turn counter, phase advancement)
 * 2. Mana Management (recharge, increment, cap at 10)
 * 3. Phase Restrictions (action validation per phase)
 * 4. Fatigue System (progressive damage on empty deck)
 * 5. State Persistence (save/load from database)
 *
 * PREREQUISITES:
 * - Configure test user in scripts/test_users.ts
 * - Test user must have at least 20 cards in collection
 * - Database must be accessible
 */

import { db } from '../src/db';
import { gameSessions, cards, userCards } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { createTurnManager, TurnManager } from '../src/lib/game/turn-manager';
import {
  loadTurnManagerFromDB,
  saveTurnManagerToDB,
  checkGameEnd,
} from '../src/lib/game/game-state-persistence';
import { Card } from '../src/types/game';
import { getTestUser, validateTestUser } from './test_users';

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const testResults: TestResult[] = [];

/**
 * Run a single test with error handling and timing
 */
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();

  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, passed: true, duration });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    testResults.push({ name, passed: false, error: errorMessage, duration });
    console.error(`❌ ${name} (${duration}ms)`);
    console.error(`   Error: ${errorMessage}`);
  }
}

/**
 * Get test user's cards from database
 */
async function getTestUserCards(userId: string): Promise<Card[]> {
  const userCardsData = await db
    .select({ card: cards })
    .from(userCards)
    .innerJoin(cards, eq(userCards.cardId, cards.id))
    .where(eq(userCards.userId, userId))
    .limit(30);

  if (userCardsData.length < 20) {
    throw new Error(
      `Test user has insufficient cards: ${userCardsData.length}/20 minimum`
    );
  }

  return userCardsData.map((item) => ({
    id: item.card.id,
    name: item.card.name,
    description: item.card.description,
    flavorText: item.card.flavorText || undefined,
    effectDescription: item.card.effectDescription || undefined,
    cost: item.card.cost,
    power: item.card.power,
    defense: item.card.defense,
    element: item.card.element,
    problemCategory: item.card.problemCategory,
    imageUrl: item.card.imageUrl || undefined,
    imagePrompt: item.card.imagePrompt || undefined,
    theme: item.card.theme || undefined,
    tags: item.card.tags || undefined,
    batchId: item.card.batchId || undefined,
    batchOrder: item.card.batchOrder || undefined,
    createdById: item.card.createdById || undefined,
    createdAt: item.card.createdAt || undefined,
  }));
}

/**
 * Create a test game session
 */
async function createTestGameSession(userId: string): Promise<string> {
  const [gameSession] = await db
    .insert(gameSessions)
    .values({
      playerId: userId,
      enemyId: null,
      isAiOpponent: true,
      turnsCount: 0,
    })
    .returning();

  return gameSession.id;
}

/**
 * Clean up test game session
 */
async function cleanupTestGameSession(gameId: string): Promise<void> {
  await db.delete(gameSessions).where(eq(gameSessions.id, gameId));
}

// ============================================================================
// TEST 1: Turn Progression
// ============================================================================

async function testTurnProgression(): Promise<void> {
  const testUser = getTestUser();
  const userCards = await getTestUserCards(testUser.id);
  const gameId = await createTestGameSession(testUser.id);

  try {
    // Create TurnManager
    const turnManager = createTurnManager(
      gameId,
      userCards.slice(0, 25),
      userCards.slice(0, 25)
    );

    // Start first turn
    await turnManager.startTurn();
    let state = turnManager.getState();

    // Verify turn 1
    if (state.turnNumber !== 1) {
      throw new Error(`Expected turn 1, got ${state.turnNumber}`);
    }

    // En el sistema MTG de 12 fases, startTurn() deja el juego en 'pre_combat_main'
    // (las fases automáticas untap, upkeep, draw se procesan internamente)
    if (state.currentPhase !== 'pre_combat_main') {
      throw new Error(`Expected pre_combat_main phase, got ${state.currentPhase}`);
    }

    if (state.activePlayer !== 'player') {
      throw new Error(`Expected player active, got ${state.activePlayer}`);
    }

    // Advance to turn 2
    await turnManager.advancePhase(); // main -> combat
    await turnManager.advancePhase(); // combat -> end
    await turnManager.advancePhase(); // end -> start (new turn)

    state = turnManager.getState();

    // Verify turn 2
    if (state.turnNumber !== 2) {
      throw new Error(`Expected turn 2, got ${state.turnNumber}`);
    }

    // Verify player switched
    if (state.activePlayer !== 'opponent') {
      throw new Error(`Expected opponent active, got ${state.activePlayer}`);
    }
  } finally {
    await cleanupTestGameSession(gameId);
  }
}

// ============================================================================
// TEST 2: Mana Management
// ============================================================================

async function testManaManagement(): Promise<void> {
  const testUser = getTestUser();
  const userCards = await getTestUserCards(testUser.id);
  const gameId = await createTestGameSession(testUser.id);

  try {
    const turnManager = createTurnManager(
      gameId,
      userCards.slice(0, 25),
      userCards.slice(0, 25)
    );

    // Check mana progression for first 12 turns
    for (let turn = 1; turn <= 12; turn++) {
      await turnManager.startTurn();
      const state = turnManager.getState();

      const expectedMaxMana = Math.min(10, turn); // Caps at 10
      const actualMaxMana =
        state.activePlayer === 'player'
          ? state.playerMaxMana
          : state.opponentMaxMana;
      const actualMana =
        state.activePlayer === 'player' ? state.playerMana : state.opponentMana;

      if (actualMaxMana !== expectedMaxMana) {
        throw new Error(
          `Turn ${turn}: Expected max mana ${expectedMaxMana}, got ${actualMaxMana}`
        );
      }

      if (actualMana !== actualMaxMana) {
        throw new Error(
          `Turn ${turn}: Mana not recharged (${actualMana}/${actualMaxMana})`
        );
      }

      // Advance to next turn
      await turnManager.advancePhase();
      await turnManager.advancePhase();
      await turnManager.advancePhase();
    }
  } finally {
    await cleanupTestGameSession(gameId);
  }
}

// ============================================================================
// TEST 3: Phase Restrictions
// ============================================================================

async function testPhaseRestrictions(): Promise<void> {
  const testUser = getTestUser();
  const userCards = await getTestUserCards(testUser.id);
  const gameId = await createTestGameSession(testUser.id);

  try {
    const turnManager = createTurnManager(
      gameId,
      userCards.slice(0, 25),
      userCards.slice(0, 25)
    );

    await turnManager.startTurn(); // Starts in main phase
    const state = turnManager.getState();

    // Try to attack in Main Phase (should fail)
    const result = await turnManager.executeAction({
      type: 'attack',
      playerId: state.activePlayer,
      timestamp: new Date(),
      data: { attackerId: 'dummy-id', targetId: 'dummy-target' },
    });

    if (result.success) {
      throw new Error('Attack in Main Phase should have failed');
    }

    // El mensaje ahora dice "not allowed in pre_combat_main phase" (sistema MTG 12 fases)
    if (!result.error?.includes('not allowed in pre_combat_main phase')) {
      throw new Error(
        `Expected phase restriction error, got: ${result.error}`
      );
    }

    // Advance to Combat Phase
    await turnManager.advancePhase();
    const state2 = turnManager.getState();

    // En el sistema MTG de 12 fases, después de pre_combat_main viene begin_combat
    // (la primera sub-fase del bloque de combate)
    if (state2.currentPhase !== 'begin_combat') {
      throw new Error(`Expected begin_combat phase, got ${state2.currentPhase}`);
    }

    // Try to play card in Combat Phase (should fail)
    const result2 = await turnManager.executeAction({
      type: 'play_card',
      playerId: state2.activePlayer,
      timestamp: new Date(),
      data: { cardId: 'dummy-id' },
    });

    if (result2.success) {
      throw new Error('Play card in Combat Phase should have failed');
    }

    // El mensaje ahora dice "not allowed in begin_combat phase" (sistema MTG 12 fases)
    if (!result2.error?.includes('not allowed in begin_combat phase')) {
      throw new Error(
        `Expected phase restriction error, got: ${result2.error}`
      );
    }
  } finally {
    await cleanupTestGameSession(gameId);
  }
}

// ============================================================================
// TEST 4: Fatigue System
// ============================================================================

async function testFatigueSystem(): Promise<void> {
  const testUser = getTestUser();
  // Use only 5 cards to force fatigue quickly
  const userCards = await getTestUserCards(testUser.id);
  const smallDeck = userCards.slice(0, 5);
  const gameId = await createTestGameSession(testUser.id);

  try {
    const turnManager = createTurnManager(gameId, smallDeck, smallDeck);

    // Initial health
    await turnManager.startTurn();
    const initialState = turnManager.getState();
    const initialHealth = initialState.playerHealth;

    // Advance multiple turns to exhaust deck and trigger fatigue
    // Starting hand: 5 cards, deck: 0 cards
    // Turn 1: draw from empty (1 fatigue damage)
    // Turn 2: skip (opponent's turn)
    // Turn 3: draw from empty (2 fatigue damage)
    // Turn 4: skip (opponent's turn)
    // Turn 5: draw from empty (3 fatigue damage)

    let totalExpectedFatigueDamage = 0;

    for (let i = 0; i < 5; i++) {
      // Pass turn to trigger next start phase
      await turnManager.advancePhase(); // main -> combat
      await turnManager.advancePhase(); // combat -> end
      await turnManager.advancePhase(); // end -> start (new turn)

      const state = turnManager.getState();

      if (state.activePlayer === 'player') {
        // Player's turn - should have taken fatigue damage
        totalExpectedFatigueDamage += state.playerFatigueCounter;

        const expectedHealth = initialHealth - totalExpectedFatigueDamage;
        const actualHealth = state.playerHealth;

        if (actualHealth !== expectedHealth) {
          throw new Error(
            `Expected health ${expectedHealth}, got ${actualHealth} (fatigue: ${totalExpectedFatigueDamage})`
          );
        }

        console.log(
          `   Turn ${state.turnNumber}: Fatigue ${state.playerFatigueCounter}, HP ${actualHealth}`
        );
      }
    }

    // Verify fatigue counter increased
    const finalState = turnManager.getState();
    if (finalState.playerFatigueCounter < 2) {
      throw new Error(
        `Expected at least 2 fatigue draws, got ${finalState.playerFatigueCounter}`
      );
    }
  } finally {
    await cleanupTestGameSession(gameId);
  }
}

// ============================================================================
// TEST 5: State Persistence
// ============================================================================

async function testStatePersistence(): Promise<void> {
  const testUser = getTestUser();
  const userCards = await getTestUserCards(testUser.id);
  const gameId = await createTestGameSession(testUser.id);

  try {
    // Create and start game
    const turnManager1 = createTurnManager(
      gameId,
      userCards.slice(0, 25),
      userCards.slice(0, 25)
    );

    await turnManager1.startTurn();
    await saveTurnManagerToDB(turnManager1);

    const state1 = turnManager1.getState();

    // Simulate closing and reopening the game
    const turnManager2 = await loadTurnManagerFromDB(gameId);
    const state2 = turnManager2.getState();

    // Verify state is identical
    if (state2.turnNumber !== state1.turnNumber) {
      throw new Error(
        `Turn number mismatch: ${state1.turnNumber} vs ${state2.turnNumber}`
      );
    }

    if (state2.playerMana !== state1.playerMana) {
      throw new Error(
        `Player mana mismatch: ${state1.playerMana} vs ${state2.playerMana}`
      );
    }

    if (state2.playerHand.length !== state1.playerHand.length) {
      throw new Error(
        `Hand size mismatch: ${state1.playerHand.length} vs ${state2.playerHand.length}`
      );
    }

    // Make a change and save again
    await turnManager2.advancePhase();
    await saveTurnManagerToDB(turnManager2);

    // Load again and verify change persisted
    const turnManager3 = await loadTurnManagerFromDB(gameId);
    const state3 = turnManager3.getState();

    if (state3.currentPhase === state1.currentPhase) {
      throw new Error('Phase change not persisted');
    }
  } finally {
    await cleanupTestGameSession(gameId);
  }
}

// ============================================================================
// TEST 6: Game End Detection
// ============================================================================

async function testGameEndDetection(): Promise<void> {
  const testUser = getTestUser();
  const userCards = await getTestUserCards(testUser.id);
  const gameId = await createTestGameSession(testUser.id);

  try {
    const turnManager = createTurnManager(
      gameId,
      userCards.slice(0, 25),
      userCards.slice(0, 25)
    );

    await turnManager.startTurn();
    let state = turnManager.getState();

    // Simulate player losing all HP
    state.playerHealth = 0;

    const gameEndCheck = checkGameEnd(state);

    if (!gameEndCheck.isEnded) {
      throw new Error('Game should have ended (player HP = 0)');
    }

    if (gameEndCheck.winner !== 'opponent') {
      throw new Error(`Expected opponent to win, got ${gameEndCheck.winner}`);
    }

    // Simulate opponent losing all HP
    state.playerHealth = 100;
    state.opponentHealth = 0;

    const gameEndCheck2 = checkGameEnd(state);

    if (!gameEndCheck2.isEnded) {
      throw new Error('Game should have ended (opponent HP = 0)');
    }

    if (gameEndCheck2.winner !== 'player') {
      throw new Error(`Expected player to win, got ${gameEndCheck2.winner}`);
    }

    // Simulate draw (both at 0)
    state.playerHealth = 0;
    state.opponentHealth = 0;

    const gameEndCheck3 = checkGameEnd(state);

    if (gameEndCheck3.winner !== 'draw') {
      throw new Error(`Expected draw, got ${gameEndCheck3.winner}`);
    }
  } finally {
    await cleanupTestGameSession(gameId);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                  ║');
  console.log('║          TURN MANAGER TEST SUITE (Prompt #13)                   ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  try {
    // Validate test user configuration
    const testUser = getTestUser();
    validateTestUser(testUser);

    // Verify test user has cards
    const userCards = await getTestUserCards(testUser.id);
    console.log(`✅ Test user has ${userCards.length} cards\n`);

    console.log('Running tests...\n');

    // Run all tests
    await runTest('Test 1: Turn Progression', testTurnProgression);
    await runTest('Test 2: Mana Management', testManaManagement);
    await runTest('Test 3: Phase Restrictions', testPhaseRestrictions);
    await runTest('Test 4: Fatigue System', testFatigueSystem);
    await runTest('Test 5: State Persistence', testStatePersistence);
    await runTest('Test 6: Game End Detection', testGameEndDetection);

    // Print summary
    console.log('\n' + '═'.repeat(70));
    console.log('TEST SUMMARY');
    console.log('═'.repeat(70));

    const passed = testResults.filter((r) => r.passed).length;
    const failed = testResults.filter((r) => !r.passed).length;
    const totalTime = testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\nTotal Tests: ${testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Time: ${totalTime}ms\n`);

    if (failed > 0) {
      console.log('Failed Tests:');
      testResults
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  ❌ ${r.name}`);
          console.log(`     Error: ${r.error}\n`);
        });

      process.exit(1);
    } else {
      console.log('🎉 All tests passed!\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed to initialize:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run tests
main();
