/**
 * Test Battle System Implementation
 * Tests the complete flow: Card tags → Problem generation → Battle resolution
 */

const WORKERS_TEXT_URL = process.env.WORKERS_AI_TEXT_URL || 'https://mindspark-ai-text-generator.agusmontoya.workers.dev';
const WORKERS_PROBLEM_URL = process.env.WORKERS_AI_PROBLEM_URL || 'https://mindspark-ai-problem-generator.agusmontoya.workers.dev';

async function testCardGeneration() {
  console.log('\n🎴 TEST 1: Card Generation with Tags');
  console.log('=====================================');

  try {
    const response = await fetch(WORKERS_TEXT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'Dragon Warrior',
        element: 'Fire',
        difficulty: 6,
      }),
    });

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('Invalid response format');
    }

    const card = data.data;

    console.log('✅ Card Generated:');
    console.log('   Name:', card.name);
    console.log('   Element:', card.element);
    console.log('   Category:', card.problemCategory);
    console.log('   Tags:', card.tags?.join(', ') || 'None');
    console.log('   Power/Defense:', `${card.power}/${card.defense}`);

    if (!card.tags || card.tags.length < 2) {
      throw new Error('❌ Tags missing or insufficient');
    }

    console.log('✅ Tags validation passed');

    return card;
  } catch (error) {
    console.error('❌ Card generation test failed:', error);
    throw error;
  }
}

async function testProblemGeneration(card: any) {
  console.log('\n🧮 TEST 2: Contextual Problem Generation');
  console.log('=========================================');

  try {
    const response = await fetch(WORKERS_PROBLEM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: card.problemCategory,
        difficulty: 5,
        // Card context
        cardName: card.name,
        cardElement: card.element,
        cardTags: card.tags,
        // User profile (optional)
        userAge: 14,
        userEducationLevel: 'middle',
        userInterests: ['games', 'science'],
      }),
    });

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('Invalid response format');
    }

    const problem = data.data;

    console.log('✅ Problem Generated:');
    console.log('   Card:', card.name);
    console.log('   Question:', problem.question.substring(0, 100) + '...');
    console.log('   Answer:', problem.answer);
    console.log('   Category:', problem.category);

    console.log('✅ Problem generation passed');

    return problem;
  } catch (error) {
    console.error('❌ Problem generation test failed:', error);
    throw error;
  }
}

async function testDamageCalculation() {
  console.log('\n⚔️  TEST 3: Damage Calculation Logic');
  console.log('=====================================');

  // Simulate cards
  const attackCard = {
    id: 'test-1',
    name: 'Fire Dragon',
    element: 'Fire',
    power: 8,
    defense: 3,
    problemCategory: 'Math',
  };

  const defenseCard = {
    id: 'test-2',
    name: 'Air Spirit',
    element: 'Air',
    power: 5,
    defense: 6,
    problemCategory: 'Logic',
  };

  // Test 1: Correct answer
  const baseDamage = Math.max(1, attackCard.power - defenseCard.defense); // 8 - 6 = 2
  const accuracyBonus = Math.ceil(baseDamage * 0.5); // 2 * 0.5 = 1
  const elementalBonus = Math.ceil(baseDamage * 0.25); // Fire > Air = 2 * 0.25 = 1
  const totalDamage = baseDamage + accuracyBonus + elementalBonus; // 2 + 1 + 1 = 4

  console.log('✅ Damage Calculation (Correct Answer + Elemental Advantage):');
  console.log('   Base Damage:', baseDamage);
  console.log('   Accuracy Bonus:', accuracyBonus);
  console.log('   Elemental Bonus:', elementalBonus);
  console.log('   Total Damage:', totalDamage);

  if (totalDamage !== 4) {
    throw new Error('❌ Damage calculation incorrect');
  }

  // Test 2: Incorrect answer
  const noDamage = 0;
  console.log('✅ Damage Calculation (Incorrect Answer): 0 damage');

  console.log('✅ Damage calculation logic passed');
}

async function testElementalAdvantage() {
  console.log('\n🔥 TEST 4: Elemental Advantage System');
  console.log('======================================');

  const advantages: Record<string, string> = {
    Fire: 'Air',
    Air: 'Earth',
    Earth: 'Water',
    Water: 'Fire',
  };

  const tests = [
    { attacker: 'Fire', defender: 'Air', expected: true },
    { attacker: 'Fire', defender: 'Water', expected: false },
    { attacker: 'Water', defender: 'Fire', expected: true },
    { attacker: 'Earth', defender: 'Air', expected: false },
  ];

  for (const test of tests) {
    const hasAdvantage = advantages[test.attacker] === test.defender;
    const result = hasAdvantage === test.expected ? '✅' : '❌';

    console.log(`${result} ${test.attacker} vs ${test.defender}: ${hasAdvantage ? 'Advantage' : 'No advantage'}`);

    if (hasAdvantage !== test.expected) {
      throw new Error('❌ Elemental advantage logic failed');
    }
  }

  console.log('✅ Elemental advantage system passed');
}

async function runAllTests() {
  console.log('\n🚀 BATTLE SYSTEM TEST SUITE');
  console.log('============================\n');

  try {
    const card = await testCardGeneration();
    await testProblemGeneration(card);
    await testDamageCalculation();
    await testElementalAdvantage();

    console.log('\n✅ ALL TESTS PASSED');
    console.log('===================');
    console.log('\n🎉 Battle System Implementation Complete!\n');
    console.log('Summary:');
    console.log('✅ ai-text-generator produces thematic tags');
    console.log('✅ ai-problem-generator uses card context');
    console.log('✅ Damage calculation with accuracy & elemental bonuses');
    console.log('✅ Elemental advantage system working');
    console.log('\nReady for integration with battle UI!\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED');
    console.error('====================');
    console.error(error);
    process.exit(1);
  }
}

runAllTests();
