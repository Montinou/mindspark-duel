'use server';

import { Card } from '@/types/game';
import { BattleProblem, DamageCalculation, ProblemSubmissionResult } from '@/types/battle';

const WORKERS_PROBLEM_URL = process.env.WORKERS_AI_PROBLEM_URL || 'https://mindspark-ai-problem-generator.agusmontoya.workers.dev';

/**
 * Generate a battle problem for a specific card with user personalization
 */
export async function generateBattleProblem(
  card: Card,
  userId: string,
  difficulty: number = 5
): Promise<BattleProblem> {
  console.log('🎲 Generating battle problem for card:', card.name);

  // Fetch user profile for personalization (optional - cached from API)
  let userProfile = null;
  try {
    const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/user/profile`, {
      headers: {
        'Cookie': `stack-session=${userId}`, // Pass user session
      },
    });
    if (profileResponse.ok) {
      userProfile = await profileResponse.json();
    }
  } catch (error) {
    console.warn('Could not fetch user profile, generating generic problem');
  }

  // Call ai-problem-generator Worker with card context
  const workerResponse = await fetch(WORKERS_PROBLEM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: card.problemCategory,
      difficulty,
      // Card context for thematic problems
      cardName: card.name,
      cardElement: card.element,
      cardTags: card.tags,
      // User profile for personalization
      userAge: userProfile?.age,
      userEducationLevel: userProfile?.educationLevel,
      userInterests: userProfile?.interests,
    }),
  });

  if (!workerResponse.ok) {
    const errorText = await workerResponse.text();
    console.error('❌ Worker error:', errorText);
    throw new Error(`Failed to generate problem: ${errorText}`);
  }

  const workerData = await workerResponse.json();

  if (!workerData.success || !workerData.data) {
    console.error('❌ Invalid worker response:', workerData);
    throw new Error('Invalid problem data from AI');
  }

  const problemData = workerData.data;

  // Create BattleProblem object
  const battleProblem: BattleProblem = {
    id: crypto.randomUUID(),
    question: problemData.question,
    answer: problemData.answer,
    category: card.problemCategory,
    difficulty,
    cardId: card.id,
    cardName: card.name,
    cardElement: card.element,
    cardTags: card.tags,
    createdAt: new Date(),
  };

  console.log('✅ Battle problem generated:', battleProblem.question.substring(0, 50) + '...');

  return battleProblem;
}

/**
 * Calculate damage based on card stats, problem accuracy, and elemental advantage
 */
export function calculateDamage(
  attackCard: Card,
  defenseCard: Card,
  answerCorrect: boolean
): DamageCalculation {
  // Base damage = attacker's power - defender's defense (minimum 1)
  const baseDamage = Math.max(1, attackCard.power - defenseCard.defense);

  // Accuracy bonus: +50% damage if answer is correct
  const accuracyBonus = answerCorrect ? Math.ceil(baseDamage * 0.5) : 0;

  // Elemental advantage: +25% damage for advantageous element matchup
  const elementalBonus = calculateElementalAdvantage(attackCard.element, defenseCard.element)
    ? Math.ceil(baseDamage * 0.25)
    : 0;

  const totalDamage = baseDamage + accuracyBonus + elementalBonus;

  return {
    baseDamage,
    accuracyBonus,
    elementalBonus,
    totalDamage,
  };
}

/**
 * Check if attacker element has advantage over defender element
 * Fire > Air > Earth > Water > Fire (rock-paper-scissors-lizard-spock style)
 */
export function calculateElementalAdvantage(
  attackElement: string,
  defenseElement: string
): boolean {
  const advantages: Record<string, string> = {
    Fire: 'Air',
    Air: 'Earth',
    Earth: 'Water',
    Water: 'Fire',
  };

  return advantages[attackElement] === defenseElement;
}

/**
 * Validate problem answer and generate submission result
 */
export function validateProblemAnswer(
  problem: BattleProblem,
  userAnswer: string,
  attackCard: Card,
  defenseCard: Card
): ProblemSubmissionResult {
  // Normalize answers for comparison (case-insensitive, trim whitespace)
  const normalizedUserAnswer = userAnswer.trim().toLowerCase();
  const normalizedCorrectAnswer = problem.answer.trim().toLowerCase();

  const correct = normalizedUserAnswer === normalizedCorrectAnswer;

  // Calculate damage if answer is correct
  const damageCalc = calculateDamage(attackCard, defenseCard, correct);

  return {
    correct,
    expectedAnswer: problem.answer,
    userAnswer,
    damage: correct ? damageCalc.totalDamage : 0,
    explanation: correct
      ? `¡Correcto! Infligiste ${damageCalc.totalDamage} de daño (Base: ${damageCalc.baseDamage}, Precisión: +${damageCalc.accuracyBonus}, Elemental: +${damageCalc.elementalBonus})`
      : `Incorrecto. La respuesta correcta era "${problem.answer}". No se infligió daño.`,
  };
}

/**
 * Resolve battle by comparing both players' answers
 * Returns winner based on who answered correctly and dealt more damage
 */
export function resolveBattle(
  playerCard: Card,
  opponentCard: Card,
  playerProblem: BattleProblem,
  opponentProblem: BattleProblem,
  playerAnswer: string,
  opponentAnswer: string
): {
  playerResult: ProblemSubmissionResult;
  opponentResult: ProblemSubmissionResult;
  winner: 'player' | 'opponent' | 'draw';
  playerDamage: number;
  opponentDamage: number;
} {
  // Validate both answers
  const playerResult = validateProblemAnswer(
    playerProblem,
    playerAnswer,
    playerCard,
    opponentCard
  );

  const opponentResult = validateProblemAnswer(
    opponentProblem,
    opponentAnswer,
    opponentCard,
    playerCard
  );

  // Determine winner based on damage dealt
  let winner: 'player' | 'opponent' | 'draw';
  const playerDamage = playerResult.damage || 0;
  const opponentDamage = opponentResult.damage || 0;

  if (playerDamage > opponentDamage) {
    winner = 'player';
  } else if (opponentDamage > playerDamage) {
    winner = 'opponent';
  } else {
    winner = 'draw';
  }

  console.log('⚔️  Battle resolved:', {
    winner,
    playerDamage,
    opponentDamage,
    playerCorrect: playerResult.correct,
    opponentCorrect: opponentResult.correct,
  });

  return {
    playerResult,
    opponentResult,
    winner,
    playerDamage: opponentDamage, // Damage dealt TO player
    opponentDamage: playerDamage, // Damage dealt TO opponent
  };
}
