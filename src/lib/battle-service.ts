/**
 * Battle Service
 *
 * Core battle logic for Mindspark Duel
 * These are pure utility functions (not Server Actions)
 */

import { Card } from '@/types/game';
import { BattleProblem, DamageCalculation, ProblemSubmissionResult } from '@/types/battle';

const WORKERS_PROBLEM_URL = process.env.WORKERS_AI_PROBLEM_URL || 'https://mindspark-ai-problem-generator.agusmontoya.workers.dev';

/**
 * Generate a battle problem for a specific card with user personalization
 * EDU-05: Difficulty ahora usa problemHints de la carta o el costo como fallback
 */
export async function generateBattleProblem(
  card: Card,
  userId: string,
  difficulty?: number
): Promise<BattleProblem> {
  // EDU-05: Priority: param > problemHints.difficulty > card.cost > 5
  const effectiveDifficulty = difficulty ?? card.problemHints?.difficulty ?? card.cost ?? 5;
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

  // Call ai-problem-generator Worker with card context and problemHints
  const workerResponse = await fetch(WORKERS_PROBLEM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: card.problemCategory,
      difficulty: effectiveDifficulty,
      // Card context for thematic problems
      cardName: card.name,
      cardElement: card.element,
      cardTags: card.tags,
      // EDU-05: Card stats for numeric problems
      cardStats: {
        power: card.power,
        cost: card.cost,
        defense: card.defense,
        ability: card.ability
      },
      // EDU-05: Problem hints for thematic generation
      problemHints: card.problemHints ? {
        keywords: card.problemHints.keywords || [],
        difficulty: card.problemHints.difficulty,
        subCategory: card.problemHints.subCategory,
        contextType: card.problemHints.contextType,
        suggestedTopics: card.problemHints.suggestedTopics || card.problemHints.topics || []
      } : undefined,
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
    answer: problemData.answer ?? problemData.correctAnswer, // Support both formats
    category: card.problemCategory,
    difficulty: effectiveDifficulty,
    cardId: card.id,
    cardName: card.name,
    cardElement: card.element,
    cardTags: card.tags,
    createdAt: new Date(),
  };

  return battleProblem;
}

/**
 * Calculate damage based on card stats, problem accuracy, and elemental advantage
 *
 * FORMULA:
 * - Base Damage = Attacker Power (minimum 1)
 * - Accuracy Bonus = +50% if answer correct
 * - Elemental Bonus = +25% if advantage
 * - Total Damage is reduced by Defender's Defense
 */
export function calculateDamage(
  attackCard: Card,
  defenseCard: Card,
  answerCorrect: boolean
): DamageCalculation & { elementalDescription?: string } {
  // Base damage = attacker's power
  const baseDamage = Math.max(1, attackCard.power);

  // Accuracy bonus: +50% damage if answer is correct
  const accuracyBonus = answerCorrect ? Math.ceil(baseDamage * 0.5) : 0;

  // Elemental advantage check
  const elemental = calculateElementalAdvantage(attackCard.element, defenseCard.element);
  const elementalBonus = elemental.hasAdvantage ? Math.ceil(baseDamage * elemental.bonus) : 0;

  // Total raw damage before defense
  const rawDamage = baseDamage + accuracyBonus + elementalBonus;

  // Defense reduces damage (minimum 1 damage if attack connects)
  const totalDamage = answerCorrect ? Math.max(1, rawDamage - defenseCard.defense) : 0;

  return {
    baseDamage,
    accuracyBonus,
    elementalBonus,
    totalDamage,
    elementalDescription: elemental.description,
  };
}

/**
 * Elemental Advantage System (intuitive wheel)
 *
 * ═══════════════════════════════════════════════════════
 *                    🔥 FIRE
 *                   /         \
 *                  /   WEAK    \
 *                 ↙             ↘
 *          🌍 EARTH ←─────────→ 💨 AIR
 *                 ↖             ↗
 *                  \   WEAK    /
 *                   \         /
 *                    💧 WATER
 * ═══════════════════════════════════════════════════════
 *
 * Fire  → Earth (fire burns plants/soil)
 * Earth → Air   (earth blocks wind)
 * Air   → Water (wind evaporates/scatters water)
 * Water → Fire  (water extinguishes fire)
 */
export function calculateElementalAdvantage(
  attackElement: string,
  defenseElement: string
): { hasAdvantage: boolean; bonus: number; description: string } {
  const advantages: Record<string, string> = {
    Fire: 'Earth',   // Fire burns
    Earth: 'Air',    // Earth blocks
    Air: 'Water',    // Wind scatters
    Water: 'Fire',   // Water extinguishes
  };

  const descriptions: Record<string, Record<string, string>> = {
    Fire: { Earth: '🔥 ¡Las llamas consumen la tierra!' },
    Earth: { Air: '🌍 ¡La tierra bloquea el viento!' },
    Air: { Water: '💨 ¡El viento dispersa las aguas!' },
    Water: { Fire: '💧 ¡El agua extingue las llamas!' },
  };

  const hasAdvantage = advantages[attackElement] === defenseElement;

  return {
    hasAdvantage,
    bonus: hasAdvantage ? 0.25 : 0, // 25% bonus damage
    description: hasAdvantage
      ? descriptions[attackElement]?.[defenseElement] || '¡Ventaja elemental!'
      : '',
  };
}

/**
 * Get elemental weakness (what beats this element)
 */
export function getElementalWeakness(element: string): string {
  const weaknesses: Record<string, string> = {
    Fire: 'Water',
    Water: 'Air',
    Air: 'Earth',
    Earth: 'Fire',
  };
  return weaknesses[element] || 'None';
}

/**
 * Get what this element is strong against
 */
export function getElementalStrength(element: string): string {
  const strengths: Record<string, string> = {
    Fire: 'Earth',
    Earth: 'Air',
    Air: 'Water',
    Water: 'Fire',
  };
  return strengths[element] || 'None';
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

  return {
    playerResult,
    opponentResult,
    winner,
    playerDamage: opponentDamage, // Damage dealt TO player
    opponentDamage: playerDamage, // Damage dealt TO opponent
  };
}
