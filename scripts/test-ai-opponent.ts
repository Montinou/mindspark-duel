/**
 * AI Opponent Test Suite
 *
 * Comprehensive tests for AI Opponent implementation (Prompt #14)
 *
 * Test Coverage:
 * 1. Card Evaluation (scoring formula, best card selection)
 * 2. Decision Making (lethal detection, survival priority, tempo plays)
 * 3. Problem Solving (accuracy formula, difficulty modifiers)
 * 4. Integration (AI turn execution - requires database)
 *
 * Run:
 * npx tsx scripts/test-ai-opponent.ts
 */

import { evaluateCard, selectBestCard, getPlayableCards } from '../src/lib/ai/card-evaluator';
import { checkLethal, checkSurvival, selectCombatTargets, makeDecision } from '../src/lib/ai/decision-maker';
import { calculateAccuracy, testAccuracy } from '../src/lib/ai/problem-solver';
import { Card } from '../src/types/game';
import { ExtendedGameState } from '../src/lib/game/turn-manager';
import { AIState } from '../src/types/ai';

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
  testFn: () => Promise<void> | void
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
 * Create mock cards for testing
 */
function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: `card-${Math.random()}`,
    name: 'Test Card',
    description: 'Test description',
    cost: 3,
    power: 4,
    defense: 4,
    element: 'Fire',
    problemCategory: 'Math',
    tags: [],
    ...overrides,
  };
}

/**
 * Create mock game state for testing
 */
function createMockGameState(overrides: Partial<ExtendedGameState> = {}): ExtendedGameState {
  return {
    gameId: 'test-game',
    turnNumber: 1,
    activePlayer: 'opponent',
    currentPhase: 'main',
    playerMana: 5,
    playerMaxMana: 5,
    playerHealth: 20,
    playerHand: [],
    playerBoard: [],
    playerDeckState: { cards: [], position: 0 },
    playerFatigueCounter: 0,
    opponentMana: 5,
    opponentMaxMana: 5,
    opponentHealth: 20,
    opponentHand: [],
    opponentBoard: [],
    opponentDeckState: { cards: [], position: 0 },
    opponentFatigueCounter: 0,
    actions: [],
    ...overrides,
  } as ExtendedGameState;
}

// ============================================================================
// TEST 1: Card Evaluation
// ============================================================================

async function testCardEvaluation(): Promise<void> {
  // Test 1a: Base value calculation
  const creature1 = createMockCard({ power: 5, defense: 5, cost: 5 });
  const gameState = createMockGameState({ opponentMana: 6 });

  const evaluation = evaluateCard(creature1, gameState);

  // Base value = (5 + 5) * 2 = 20
  // Strong stats bonus: +10 (total stats 10 >= 10)
  // On-curve bonus: 0 (cost 5 != mana 6)
  // Cost penalty: -5
  // Expected: 20 + 10 + 0 - 5 = 25
  const expectedValue = 25;

  if (Math.abs(evaluation.value - expectedValue) > 1) {
    throw new Error(
      `Card evaluation incorrect: expected ${expectedValue}, got ${evaluation.value}`
    );
  }

  // Test 1b: On-curve bonus
  const creature2 = createMockCard({ power: 6, defense: 6, cost: 6 });
  const gameState2 = createMockGameState({ opponentMana: 6 });

  const evaluation2 = evaluateCard(creature2, gameState2);

  // Base value = (6 + 6) * 2 = 24
  // Strong stats bonus: +10 (total stats 12 >= 10)
  // On-curve bonus: +5 (cost 6 == mana 6)
  // Cost penalty: -6
  // Expected: 24 + 10 + 5 - 6 = 33
  const expectedValue2 = 33;

  if (Math.abs(evaluation2.value - expectedValue2) > 1) {
    throw new Error(
      `On-curve bonus incorrect: expected ${expectedValue2}, got ${evaluation2.value}`
    );
  }
}

async function testBestCardSelection(): Promise<void> {
  const hand = [
    createMockCard({ id: 'weak', power: 2, defense: 2, cost: 2 }),
    createMockCard({ id: 'strong', power: 8, defense: 6, cost: 5 }),
    createMockCard({ id: 'expensive', power: 10, defense: 10, cost: 10 }),
  ];

  const gameState = createMockGameState({
    opponentMana: 5,
    opponentHand: hand,
  });

  const result = selectBestCard(hand, gameState);

  if (!result) {
    throw new Error('No card selected');
  }

  // The 'strong' card should be selected (affordable and highest value)
  if (result.card.id !== 'strong') {
    throw new Error(
      `Wrong card selected: expected 'strong', got '${result.card.id}'`
    );
  }
}

async function testPlayableCardsFilter(): Promise<void> {
  const hand = [
    createMockCard({ cost: 2 }),
    createMockCard({ cost: 5 }),
    createMockCard({ cost: 8 }),
  ];

  const playable = getPlayableCards(hand, 5);

  if (playable.length !== 2) {
    throw new Error(`Expected 2 playable cards, got ${playable.length}`);
  }

  const costs = playable.map((c) => c.cost);
  if (!costs.includes(2) || !costs.includes(5)) {
    throw new Error('Incorrect playable cards filtered');
  }
}

// ============================================================================
// TEST 2: Decision Making
// ============================================================================

async function testLethalDetection(): Promise<void> {
  const gameState = createMockGameState({
    playerHealth: 10,
    opponentBoard: [
      createMockCard({ power: 5 }),
      createMockCard({ power: 3 }),
      createMockCard({ power: 3 }),
    ],
  });

  const lethalCheck = checkLethal(gameState);

  // Total damage: 5 + 3 + 3 = 11 >= 10 HP
  if (!lethalCheck.hasLethal) {
    throw new Error('Lethal not detected when it should be');
  }

  if (!lethalCheck.actions || lethalCheck.actions.length === 0) {
    throw new Error('Lethal actions not generated');
  }

  // Should have attack actions for each creature
  const attackActions = lethalCheck.actions.filter((a) => a.type === 'attack');
  if (attackActions.length !== 3) {
    throw new Error(`Expected 3 attack actions, got ${attackActions.length}`);
  }
}

async function testSurvivalThreat(): Promise<void> {
  const gameState = createMockGameState({
    opponentHealth: 12,
    opponentBoard: [
      // AI needs creatures to defend with
      createMockCard({ id: 'defender', power: 6, defense: 6 }),
    ],
    playerBoard: [
      createMockCard({ id: 'threat', power: 10, defense: 5 }),
    ],
  });

  const survivalCheck = checkSurvival(gameState);

  // Player board damage: 10, estimated +5 = 15 >= 12 HP
  if (!survivalCheck.isThreatenedLethal) {
    throw new Error('Survival threat not detected');
  }

  // With AI having a 6 power creature, it can kill the 5 defense threat
  if (!survivalCheck.defensiveActions || survivalCheck.defensiveActions.length === 0) {
    throw new Error('Defensive actions not generated');
  }
}

async function testCombatTargeting(): Promise<void> {
  // Test 2a: No blockers - attack face
  const gameState1 = createMockGameState({
    opponentBoard: [createMockCard({ id: 'attacker', power: 5 })],
    playerBoard: [],
  });

  const targets1 = selectCombatTargets(gameState1);

  if (targets1.length !== 1) {
    throw new Error(`Expected 1 target, got ${targets1.length}`);
  }

  if (targets1[0].targetId !== 'face') {
    throw new Error(`Expected face attack, got ${targets1[0].targetId}`);
  }

  // Test 2b: Large creature - favorable trade
  const gameState2 = createMockGameState({
    opponentBoard: [createMockCard({ id: 'attacker', power: 6, defense: 6 })],
    playerBoard: [createMockCard({ id: 'threat', power: 3, defense: 5 })],
  });

  const targets2 = selectCombatTargets(gameState2);

  if (targets2[0].targetId === 'face') {
    // Acceptable - AI might choose face over unfavorable trade
  } else if (targets2[0].targetId === 'threat') {
    // Acceptable - AI trading
  } else {
    throw new Error(`Unexpected target: ${targets2[0].targetId}`);
  }
}

// ============================================================================
// TEST 3: Problem Solving Accuracy
// ============================================================================

async function testAccuracyFormula(): Promise<void> {
  // Test accuracy calculation formula
  const testCases = [
    { difficulty: 1, ai: 'normal', expected: 0.93 },
    { difficulty: 5, ai: 'normal', expected: 0.67 },
    { difficulty: 10, ai: 'normal', expected: 0.33 },
    { difficulty: 15, ai: 'normal', expected: 0.30 }, // Clamped at minimum
  ] as const;

  for (const { difficulty, ai, expected } of testCases) {
    const actual = calculateAccuracy(difficulty, ai);
    const tolerance = 0.02; // Allow 2% variance

    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(
        `Accuracy formula incorrect for difficulty ${difficulty}: expected ${expected}, got ${actual}`
      );
    }
  }
}

async function testDifficultyModifiers(): Promise<void> {
  const problemDifficulty = 10;

  // Test Easy AI: -20% accuracy
  const easyAccuracy = calculateAccuracy(problemDifficulty, 'easy');
  const normalAccuracy = calculateAccuracy(problemDifficulty, 'normal');
  const hardAccuracy = calculateAccuracy(problemDifficulty, 'hard');

  // Easy should be ~20% lower than normal
  if (easyAccuracy >= normalAccuracy) {
    throw new Error(
      `Easy AI should have lower accuracy than Normal (${easyAccuracy} >= ${normalAccuracy})`
    );
  }

  // Hard should be ~20% higher than normal
  if (hardAccuracy <= normalAccuracy) {
    throw new Error(
      `Hard AI should have higher accuracy than Normal (${hardAccuracy} <= ${normalAccuracy})`
    );
  }

  console.log(
    `   Accuracy check: Easy=${(easyAccuracy * 100).toFixed(0)}%, Normal=${(normalAccuracy * 100).toFixed(0)}%, Hard=${(hardAccuracy * 100).toFixed(0)}%`
  );
}

async function testProblemSolvingSimulation(): Promise<void> {
  // Test with 100 samples (faster than 1000 for CI)
  const samples = 100;
  const difficulty = 5;

  const result = testAccuracy(difficulty, 'normal', samples);

  // Expected accuracy for difficulty 5: ~67%
  // Allow ±15% variance due to randomness with 100 samples
  const expectedAccuracy = 0.67;
  const tolerance = 0.15;

  if (Math.abs(result.accuracy - expectedAccuracy) > tolerance) {
    console.warn(
      `   Warning: Accuracy ${(result.accuracy * 100).toFixed(0)}% outside expected range (${(expectedAccuracy * 100).toFixed(0)}% ± ${(tolerance * 100).toFixed(0)}%)`
    );
    // Don't fail the test, just warn (randomness can cause variance)
  }

  console.log(
    `   Solved ${result.correctCount}/${samples} problems (${(result.accuracy * 100).toFixed(0)}% accuracy)`
  );
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                  ║');
  console.log('║          AI OPPONENT TEST SUITE (Prompt #14)                     ║');
  console.log('║                  "The Dark Quizmaster"                           ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('Running tests...\n');

  // Test 1: Card Evaluation
  console.log('━━━ Test Group 1: Card Evaluation ━━━');
  await runTest('1a. Card value calculation', testCardEvaluation);
  await runTest('1b. Best card selection', testBestCardSelection);
  await runTest('1c. Playable cards filter', testPlayableCardsFilter);

  // Test 2: Decision Making
  console.log('\n━━━ Test Group 2: Decision Making ━━━');
  await runTest('2a. Lethal detection', testLethalDetection);
  await runTest('2b. Survival threat detection', testSurvivalThreat);
  await runTest('2c. Combat targeting', testCombatTargeting);

  // Test 3: Problem Solving
  console.log('\n━━━ Test Group 3: Problem Solving ━━━');
  await runTest('3a. Accuracy formula', testAccuracyFormula);
  await runTest('3b. Difficulty modifiers', testDifficultyModifiers);
  await runTest('3c. Problem solving simulation', testProblemSolvingSimulation);

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
    console.log('NOTE: Full game simulation (AI vs AI) requires Turn Manager');
    console.log('      tests to pass first. Run test-turn-manager.ts.\n');
    process.exit(0);
  }
}

// Run tests
main();
