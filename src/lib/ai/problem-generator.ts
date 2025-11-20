import { Problem, Card } from '@/types/game';

const GEMINI_API_KEY = process.env.GEMINIAI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Dynamically generates a thematic problem for a card using Gemini Flash (low latency)
 * Problems are generated on-demand during gameplay, not stored in database
 */
export async function generateProblemForCard(card: Card): Promise<Problem> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINIAI_API_KEY is not set");
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

EXAMPLES (for inspiration):

**Thematic Math (Dragon card):**
"The dragon ${card.name} guards 48 gold coins across 6 treasure chests equally. How many coins in each chest?"
Options: ["6", "8", "12", "18"]
Correct: "8"

**Thematic Logic (Samurai card):**
"${card.name} must cross 3 bridges in order: red, blue, then green. If the blue bridge is before the green but after the red, which bridge is second?"
Options: ["Red", "Blue", "Green", "Cannot determine"]
Correct: "Blue"

**Thematic Science (Water element card):**
"${card.name} controls water. What is the chemical formula for water?"
Options: ["H2O", "CO2", "O2", "H2O2"]
Correct: "H2O"

OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "question": "Your thematic question here",
  "options": ["option1", "option2", "option3", "option4"],
  "correctAnswer": "the exact text of the correct option",
  "difficulty": ${difficulty}
}
`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
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
      question: `${card.name} has ${num1} ${card.element} crystals and finds ${num2} more. How many in total?`,
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
