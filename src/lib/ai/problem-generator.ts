import { Problem, Card } from '@/types/game';

const GATEWAY_URL = 'https://gateway.ai.vercel.dev/v1/chat/completions';

/**
 * Dynamically generates a thematic problem for a card using Vercel AI Gateway (Direct Fetch)
 * Problems are generated on-demand during gameplay, not stored in database
 */
export async function generateProblemForCard(card: Card): Promise<Problem> {
  const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
  if (!AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY is not set");
  }

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

OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown, no code blocks) with this structure:
{
  "question": "The thematic question in Spanish",
  "options": ["option1", "option2", "option3", "option4"],
  "correctAnswer": "the exact text of the correct option",
  "difficulty": ${difficulty}
}
`;

  try {
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash', // Using Gemini 2.5 Flash via Vercel Gateway
        messages: [
          {
            role: 'system',
            content: 'You are a creative educational content generator for a card game. You output only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Clean up markdown code blocks if present
    const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const problemData = JSON.parse(jsonString);

    return {
      question: problemData.question,
      options: problemData.options,
      correctAnswer: problemData.correctAnswer,
      difficulty: problemData.difficulty || difficulty,
      themeContext,
      cardId: card.id,
    };
  } catch (error) {
    console.error('Failed to generate problem:', error);

    // Fallback to simple math problem
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;

    return {
      question: `${card.name} tiene ${num1} cristales de ${card.element} y encuentra ${num2} más. ¿Cuántos tiene en total?`,
      options: [
        String(answer - 1),
        String(answer),
        String(answer + 1),
        String(answer + 2),
      ].sort(() => Math.random() - 0.5),
      correctAnswer: String(answer),
      difficulty,
      themeContext,
      cardId: card.id,
    };
  }
}

/**
 * Generate multiple problems for a card (for variety)
 * Returns an array of problems that can be randomly selected during gameplay
 */
export async function generateProblemPool(card: Card, count: number = 3): Promise<Problem[]> {
  const promises = Array.from({ length: count }, () => generateProblemForCard(card));
  return Promise.all(promises);
}


