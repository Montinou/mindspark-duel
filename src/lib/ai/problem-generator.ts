import { Problem, Card } from '@/types/game';

const GATEWAY_URL = 'https://gateway.ai.vercel.dev/v1/chat/completions';

/**
 * Dynamically generates a thematic problem for a card.
 * Strategy:
 * 1. Try Vercel AI Gateway (Primary)
 * 2. Fallback to Direct Gemini API (Secondary, if Gateway fails/is blocked)
 * 3. Fallback to Simple Math (Tertiary, if all AI fails)
 */
export async function generateProblemForCard(card: Card): Promise<Problem> {
  const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
  const GEMINI_API_KEY = process.env.GEMINIAI_API_KEY;

  // Build thematic context from card
  const themeContext = [
    card.theme && `Theme: ${card.theme}`,
    card.flavorText && `Flavor: ${card.flavorText}`,
    card.tags && card.tags.length > 0 && `Tags: ${card.tags.join(', ')}`,
  ]
    .filter(Boolean)
    .join('. ');

  // Estimate difficulty from card stats
  const totalStats = card.power + card.defense;
  const difficulty = Math.max(1, Math.min(10, Math.ceil(totalStats / 2)));

  const prompt = `
Generate a single educational problem for a trading card game.

CARD CONTEXT:
- Card Name: "${card.name}"
- Element: ${card.element}
- Problem Category: ${card.problemCategory}
- ${themeContext}

PROBLEM REQUIREMENTS:
0. **Language**: SPANISH. The question and options must be in Spanish.

1. **Thematic Integration**:
   - The problem MUST relate to the card's theme and lore
   - Use the card's name, element, or theme in the question when possible
   - Make it feel like the problem is part of the card's narrative

2. **Category**: ${card.problemCategory}
   - Math: Arithmetic, algebra, geometry, etc.
   - Logic: Puzzles, pattern recognition, deduction
   - Science: Physics, chemistry, biology facts/concepts

3. **Difficulty**: ${difficulty}/10
   - Appropriate for the card's power level
   - Not too easy, not impossibly hard

4. **Format**:
   - Clear, concise question
   - 4 multiple choice options
   - Only ONE correct answer
   - Options should be plausible (avoid obvious wrong answers)

5. **Validation**:
   - The "correctAnswer" MUST be exactly equal to one of the strings in the "options" array.
   - Options must be distinct (no duplicates).

OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown, no code blocks) with this structure:
{
  "question": "The thematic question in Spanish",
  "options": ["option1", "option2", "option3", "option4"],
  "correctAnswer": "the exact text of the correct option",
  "difficulty": ${difficulty}
}
`;

  // Use Cloudflare Worker for problem generation
  const WORKER_URL = process.env.WORKERS_AI_PROBLEM_URL || 'https://mindspark-ai-problem-generator.agusmontoya.workers.dev';

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: card.problemCategory,
        difficulty,
        theme: card.theme,
        cardName: card.name,
        cardElement: card.element,
        cardTags: card.tags
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Worker error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error('Invalid response from worker');
    }

    return {
      question: data.data.question,
      options: data.data.options,
      correctAnswer: data.data.correctAnswer,
      difficulty: difficulty,
      themeContext,
      cardId: card.id
    };

  } catch (error) {
    console.error('❌ Problem Generator Worker failed:', error);
    
    // Fallback to simple math if worker fails
    console.warn('⚠️ Falling back to simple math problem');
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;
    
    return {
      question: `¿Cuánto es ${num1} + ${num2}?`,
      options: [`${answer}`, `${answer + 1}`, `${answer - 1}`, `${answer + 2}`],
      correctAnswer: `${answer}`,
      difficulty: 1,
      themeContext: "Fallback Math",
      cardId: card.id
    };
  }
}

function parseProblemResponse(text: string, difficulty: number, themeContext: string, cardId: string): Problem {
  // Deprecated - kept for reference if needed
  return {
    question: "Deprecated",
    options: [],
    correctAnswer: "",
    difficulty,
    themeContext,
    cardId
  };
}

/**
 * Generate multiple problems for a card (for variety)
 * Returns an array of problems that can be randomly selected during gameplay
 */
export async function generateProblemPool(card: Card, count: number = 3): Promise<Problem[]> {
  const promises = Array.from({ length: count }, () => generateProblemForCard(card));
  return Promise.all(promises);
}


