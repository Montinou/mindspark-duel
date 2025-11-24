/**
 * Problem Solver for AI Opponent
 *
 * Simulates AI answering problems with difficulty-based accuracy.
 * Not true problem solving, but probability-based correct/incorrect answers.
 */

import { BattleProblem } from '@/types/battle';
import { AIDifficulty } from '@/types/ai';

/**
 * Calculate AI accuracy for a given problem difficulty
 *
 * Formula: AI Accuracy = max(0.3, 1 - (problem.difficulty / 15))
 *
 * Examples:
 * - Difficulty 1:  1 - (1/15)  = 0.93  (93% accuracy)
 * - Difficulty 5:  1 - (5/15)  = 0.67  (67% accuracy)
 * - Difficulty 10: 1 - (10/15) = 0.33  (33% accuracy)
 * - Difficulty 15: max(0.3, 0) = 0.30  (30% minimum)
 */
export function calculateAccuracy(
  problemDifficulty: number,
  aiDifficulty: AIDifficulty
): number {
  // Base accuracy from problem difficulty
  const baseAccuracy = Math.max(0.3, 1 - problemDifficulty / 15);

  // Adjust by AI difficulty setting
  const difficultyModifier = {
    easy: -0.2, // -20% accuracy (30% → 10% on hard problems)
    normal: 0, // No modifier (baseline)
    hard: +0.2, // +20% accuracy (30% → 50% on hard problems)
  }[aiDifficulty];

  // Final accuracy clamped between 10% and 95%
  const finalAccuracy = Math.max(
    0.1,
    Math.min(0.95, baseAccuracy + difficultyModifier)
  );

  return finalAccuracy;
}

/**
 * Generate a plausible wrong answer for a problem
 */
function generateWrongAnswer(problem: BattleProblem): string {
  const correct = problem.answer;

  // If numeric answer, modify it slightly
  if (/^\d+$/.test(correct)) {
    const num = parseInt(correct);
    const offset = Math.floor(Math.random() * 10) - 5; // -5 to +5
    const wrongNum = Math.max(0, num + offset); // Don't go negative
    return String(wrongNum);
  }

  // If decimal/float answer, modify slightly
  if (/^\d+\.\d+$/.test(correct)) {
    const num = parseFloat(correct);
    const offset = (Math.random() * 2 - 1) * num * 0.2; // ±20% of value
    const wrongNum = Math.max(0, num + offset);
    return wrongNum.toFixed(2);
  }

  // If single word answer, return common wrong options
  const commonWrongAnswers = [
    'No sé',
    'No estoy seguro',
    'Incorrecto',
    'Wrong',
    'Unknown',
  ];

  return commonWrongAnswers[
    Math.floor(Math.random() * commonWrongAnswers.length)
  ];
}

/**
 * Simulate AI answering a problem with difficulty-based accuracy
 *
 * @param problem - The battle problem to answer
 * @param aiDifficulty - AI difficulty level (easy/normal/hard)
 * @returns Answer string (correct or plausible wrong answer)
 */
export function simulateAIAnswer(
  problem: BattleProblem,
  aiDifficulty: AIDifficulty
): string {
  const accuracy = calculateAccuracy(problem.difficulty, aiDifficulty);
  const answersCorrectly = Math.random() < accuracy;

  if (answersCorrectly) {
    console.log(
      `🧠 AI answered correctly (accuracy: ${(accuracy * 100).toFixed(0)}%)`
    );
    return problem.answer;
  } else {
    const wrongAnswer = generateWrongAnswer(problem);
    console.log(
      `❌ AI answered incorrectly (accuracy: ${(accuracy * 100).toFixed(0)}%, answered: "${wrongAnswer}")`
    );
    return wrongAnswer;
  }
}

/**
 * Test accuracy over multiple samples (for testing/debugging)
 */
export function testAccuracy(
  problemDifficulty: number,
  aiDifficulty: AIDifficulty,
  samples: number = 1000
): { correctCount: number; accuracy: number } {
  let correctCount = 0;

  // Create dummy problem
  const problem: BattleProblem = {
    id: 'test',
    question: 'Test question',
    answer: '42',
    category: 'Math',
    difficulty: problemDifficulty,
    cardId: 'test',
    cardName: 'Test Card',
    cardElement: 'Fire',
    cardTags: [],
    createdAt: new Date(),
  };

  for (let i = 0; i < samples; i++) {
    const answer = simulateAIAnswer(problem, aiDifficulty);
    if (answer === problem.answer) {
      correctCount++;
    }
  }

  return {
    correctCount,
    accuracy: correctCount / samples,
  };
}
