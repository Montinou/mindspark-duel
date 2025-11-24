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

  // 1. Try Vercel AI Gateway
  if (AI_GATEWAY_API_KEY) {
    try {
      const response = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a creative educational content generator. Output valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        throw new Error(`Gateway status: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return parseProblemResponse(content, difficulty, themeContext, card.id);
    } catch (error) {
      console.warn('⚠️ Vercel AI Gateway failed, failing over to Direct Gemini API:', error);
    }
  }

  // 2. Fallback to Direct Gemini API
  if (!GEMINI_API_KEY) {
    throw new Error('❌ CRITICAL: Both AI_GATEWAY_API_KEY and GEMINIAI_API_KEY are missing');
  }

  console.log('🔄 Falling back to Direct Gemini API...');
  const DIRECT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(DIRECT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Gemini API Error Response:', errorText);
    throw new Error(`Gemini API failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;

  console.log('✅ Problem generated via Direct Gemini API');
  return parseProblemResponse(content, difficulty, themeContext, card.id);
}

function parseProblemResponse(text: string, difficulty: number, themeContext: string, cardId: string): Problem {
  const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const problemData = JSON.parse(jsonString);

  return {
    question: problemData.question,
    options: problemData.options,
    correctAnswer: problemData.correctAnswer,
    difficulty: problemData.difficulty || difficulty,
    themeContext,
    cardId,
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


