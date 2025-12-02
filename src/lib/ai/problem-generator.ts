import { Problem, Card, ProblemCategory } from '@/types/game';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const GATEWAY_URL = 'https://gateway.ai.vercel.dev/v1/chat/completions';

/**
 * Dynamically generates a thematic problem for a card.
 * Strategy:
 * 1. Try Cloudflare Worker with problemHints and user preferences
 * 2. Fallback to category-specific problem bank
 *
 * @param card - The card being played
 * @param userId - Optional user ID for personalized difficulty
 */
export async function generateProblemForCard(card: Card, userId?: string): Promise<Problem> {
  // EDU-02: Obtener preferredDifficulty del usuario
  let userDifficulty: number | undefined;
  if (userId) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { preferredDifficulty: true }
      });
      userDifficulty = user?.preferredDifficulty ?? undefined;
    } catch (error) {
      console.warn('Could not fetch user difficulty preference:', error);
    }
  }

  // Build thematic context from card
  const themeContext = [
    card.theme && `Theme: ${card.theme}`,
    card.flavorText && `Flavor: ${card.flavorText}`,
    card.tags && card.tags.length > 0 && `Tags: ${card.tags.join(', ')}`,
  ]
    .filter(Boolean)
    .join('. ');

  // Difficulty priority: userPreference > problemHints.difficulty > card.cost > 5
  const difficulty = userDifficulty
    ?? card.problemHints?.difficulty
    ?? card.cost
    ?? 5;

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
    // EDU-01: Pasar problemHints completos al worker
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: card.problemCategory,
        difficulty,
        theme: card.theme,
        cardName: card.name,
        cardElement: card.element,
        cardTags: card.tags,
        // NEW: Card stats for numeric problems
        cardStats: {
          power: card.power,
          cost: card.cost,
          defense: card.defense,
          ability: card.ability
        },
        // NEW: Problem hints for thematic generation
        problemHints: card.problemHints ? {
          keywords: card.problemHints.keywords || [],
          difficulty: card.problemHints.difficulty,
          subCategory: card.problemHints.subCategory,
          contextType: card.problemHints.contextType,
          suggestedTopics: card.problemHints.suggestedTopics || card.problemHints.topics || []
        } : undefined
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
    console.warn('⚠️ Falling back to category-specific problem bank');

    // EDU-04: Fallback a banco de problemas por categoría y dificultad
    return getFallbackProblem(card.problemCategory, difficulty, card.id, themeContext);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EDU-04: BANCO DE PROBLEMAS FALLBACK POR CATEGORÍA Y DIFICULTAD
// ═══════════════════════════════════════════════════════════════════════

interface FallbackProblem {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const fallbackProblems: Record<ProblemCategory, Record<number, FallbackProblem[]>> = {
  Math: {
    1: [
      { question: '¿Cuánto es 5 + 3?', options: ['6', '7', '8', '9'], correctAnswer: '8', explanation: '5 + 3 = 8' },
      { question: '¿Cuánto es 7 - 2?', options: ['4', '5', '6', '3'], correctAnswer: '5', explanation: '7 - 2 = 5' },
      { question: '¿Cuánto es 2 × 4?', options: ['6', '8', '10', '12'], correctAnswer: '8', explanation: '2 × 4 = 8' },
    ],
    5: [
      { question: '¿Cuánto es 12 × 8?', options: ['86', '96', '106', '116'], correctAnswer: '96', explanation: '12 × 8 = 96' },
      { question: '¿Cuál es el 25% de 80?', options: ['15', '20', '25', '30'], correctAnswer: '20', explanation: '80 × 0.25 = 20' },
      { question: 'Si x + 7 = 15, ¿cuánto vale x?', options: ['6', '7', '8', '9'], correctAnswer: '8', explanation: 'x = 15 - 7 = 8' },
    ],
    10: [
      { question: '¿Cuál es √144?', options: ['10', '11', '12', '13'], correctAnswer: '12', explanation: '12 × 12 = 144' },
      { question: 'Si 2x² = 32, ¿cuánto vale x?', options: ['2', '3', '4', '5'], correctAnswer: '4', explanation: '2x² = 32 → x² = 16 → x = 4' },
      { question: '¿Cuánto es 3⁴?', options: ['27', '64', '81', '108'], correctAnswer: '81', explanation: '3 × 3 × 3 × 3 = 81' },
    ],
  },
  Logic: {
    1: [
      { question: '¿Qué número sigue en la secuencia: 2, 4, 6, ?', options: ['7', '8', '9', '10'], correctAnswer: '8', explanation: 'Secuencia de números pares: +2' },
      { question: 'Si hoy es lunes, ¿qué día será en 3 días?', options: ['Miércoles', 'Jueves', 'Viernes', 'Sábado'], correctAnswer: 'Jueves', explanation: 'Lunes + 3 = Jueves' },
      { question: 'Todos los perros son animales. Rex es un perro. Por lo tanto:', options: ['Rex es un gato', 'Rex es un animal', 'Rex no existe', 'No se puede saber'], correctAnswer: 'Rex es un animal', explanation: 'Silogismo básico' },
    ],
    5: [
      { question: '¿Cuál es el patrón: 1, 1, 2, 3, 5, 8, ?', options: ['11', '12', '13', '14'], correctAnswer: '13', explanation: 'Fibonacci: 5 + 8 = 13' },
      { question: 'Si A > B y B > C, entonces:', options: ['A < C', 'A = C', 'A > C', 'No se puede determinar'], correctAnswer: 'A > C', explanation: 'Propiedad transitiva' },
      { question: 'Complete: 3, 6, 12, 24, ?', options: ['36', '48', '30', '42'], correctAnswer: '48', explanation: 'Cada número se multiplica por 2' },
    ],
    10: [
      { question: 'En un grupo de 30 personas, 18 hablan inglés y 15 hablan francés. Si todos hablan al menos un idioma, ¿cuántos hablan ambos?', options: ['2', '3', '5', '8'], correctAnswer: '3', explanation: '18 + 15 - 30 = 3 (principio de inclusión-exclusión)' },
      { question: 'Si el código de AMOR es BNPS, ¿cuál es el código de VIDA?', options: ['WJEB', 'XJEB', 'WJEC', 'VJDA'], correctAnswer: 'WJEB', explanation: 'Cada letra avanza 1 posición en el alfabeto' },
      { question: '¿Cuántos cuadrados hay en un tablero de ajedrez 3×3?', options: ['9', '13', '14', '16'], correctAnswer: '14', explanation: '9 de 1×1 + 4 de 2×2 + 1 de 3×3 = 14' },
    ],
  },
  Science: {
    1: [
      { question: '¿Cuántos planetas tiene el Sistema Solar?', options: ['7', '8', '9', '10'], correctAnswer: '8', explanation: 'Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno' },
      { question: '¿Qué gas respiramos principalmente?', options: ['Oxígeno', 'Nitrógeno', 'CO2', 'Hidrógeno'], correctAnswer: 'Oxígeno', explanation: 'Necesitamos oxígeno para vivir' },
      { question: '¿Cuántas patas tiene una araña?', options: ['6', '8', '10', '4'], correctAnswer: '8', explanation: 'Los arácnidos tienen 8 patas' },
    ],
    5: [
      { question: '¿Cuál es el símbolo químico del oro?', options: ['Ag', 'Au', 'Fe', 'Cu'], correctAnswer: 'Au', explanation: 'Au viene del latín aurum' },
      { question: '¿Cuál es la fórmula del agua?', options: ['H2O', 'CO2', 'NaCl', 'O2'], correctAnswer: 'H2O', explanation: '2 átomos de hidrógeno y 1 de oxígeno' },
      { question: '¿Cuántos huesos tiene el cuerpo humano adulto?', options: ['186', '206', '226', '256'], correctAnswer: '206', explanation: 'El cuerpo humano adulto tiene 206 huesos' },
    ],
    10: [
      { question: '¿Cuál es la velocidad de la luz en el vacío (aproximada)?', options: ['300 km/s', '3,000 km/s', '300,000 km/s', '3,000,000 km/s'], correctAnswer: '300,000 km/s', explanation: 'c ≈ 3 × 10⁸ m/s' },
      { question: '¿Qué partícula tiene carga positiva en el átomo?', options: ['Electrón', 'Protón', 'Neutrón', 'Fotón'], correctAnswer: 'Protón', explanation: 'Los protones tienen carga +1' },
      { question: '¿Cuál es la unidad de frecuencia en el SI?', options: ['Watt', 'Hertz', 'Newton', 'Pascal'], correctAnswer: 'Hertz', explanation: 'Hertz (Hz) = ciclos por segundo' },
    ],
  },
};

/**
 * Get a fallback problem from the pre-defined bank
 * EDU-04: Selecciona problemas por categoría y dificultad cercana
 */
function getFallbackProblem(
  category: ProblemCategory,
  targetDifficulty: number,
  cardId: string,
  themeContext: string
): Problem {
  const categoryProblems = fallbackProblems[category] || fallbackProblems.Math;

  // Find nearest difficulty level (1, 5, or 10)
  const availableDifficulties = [1, 5, 10];
  const nearestDifficulty = availableDifficulties.reduce((prev, curr) =>
    Math.abs(curr - targetDifficulty) < Math.abs(prev - targetDifficulty) ? curr : prev
  );

  const problems = categoryProblems[nearestDifficulty];
  const selected = problems[Math.floor(Math.random() * problems.length)];

  return {
    question: selected.question,
    options: selected.options,
    correctAnswer: selected.correctAnswer,
    difficulty: nearestDifficulty,
    themeContext: `Fallback ${category} (${themeContext})`,
    cardId
  };
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


