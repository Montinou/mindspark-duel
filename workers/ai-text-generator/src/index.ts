export interface Env {
  AI: any;
}

// ============================================
// CARD-01: Stats validation utilities
// ============================================

const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

const VALID_ELEMENTS = ['Fire', 'Water', 'Earth', 'Air'] as const;
const VALID_CATEGORIES = ['Math', 'Logic', 'Science'] as const;

interface ValidatedCard {
  name: string;
  description: string;
  cost: number;
  power: number;
  defense: number;
  element: typeof VALID_ELEMENTS[number];
  problemCategory: typeof VALID_CATEGORIES[number];
}

function validateCardStats(parsed: any, defaults: { cost: number; power: number; defense: number; element: string; category: string }): ValidatedCard {
  return {
    name: String(parsed.name || 'Unknown Card').slice(0, 50),
    description: String(parsed.description || '').slice(0, 200),
    cost: clamp(Number(parsed.cost) || defaults.cost, 1, 10),
    power: clamp(Number(parsed.power) || defaults.power, 1, 10),
    defense: clamp(Number(parsed.defense) || defaults.defense, 1, 10),
    element: VALID_ELEMENTS.includes(parsed.element) ? parsed.element : defaults.element as typeof VALID_ELEMENTS[number],
    problemCategory: VALID_CATEGORIES.includes(parsed.problemCategory) ? parsed.problemCategory : defaults.category as typeof VALID_CATEGORIES[number],
  };
}

// ============================================
// CARD-02: Safe JSON parsing with fallback
// ============================================

/**
 * Repair common JSON errors from LLM output
 */
function repairJSON(text: string): string {
  let repaired = text;

  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // Fix unescaped quotes in strings (common LLM error)
  // Match strings and escape internal quotes
  repaired = repaired.replace(/"([^"]*?)(?<!\\)"([^"]*?)"/g, (match, p1, p2) => {
    if (p2.includes(':') || p2.includes(',') || p2.includes('}')) {
      // This looks like it might be a real string boundary
      return match;
    }
    return `"${p1}\\"${p2}"`;
  });

  // Fix missing quotes around property names
  repaired = repaired.replace(/{\s*(\w+)\s*:/g, '{"$1":');
  repaired = repaired.replace(/,\s*(\w+)\s*:/g, ',"$1":');

  // Fix single quotes to double quotes
  repaired = repaired.replace(/'/g, '"');

  // Remove control characters that break JSON
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, (char) => {
    if (char === '\n' || char === '\r' || char === '\t') return ' ';
    return '';
  });

  // Fix truncated JSON - add missing closing braces/brackets
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;

  // Add missing closing brackets
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    repaired += ']';
  }
  // Add missing closing braces
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '}';
  }

  return repaired;
}

function safeParseJSON(text: string): any | null {
  // Clean up markdown code blocks
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Extract JSON from response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn('No JSON object found in response');
    return null;
  }

  let jsonString = jsonMatch[0];

  // Try parsing as-is first
  try {
    return JSON.parse(jsonString);
  } catch (firstError) {
    console.warn('First JSON parse failed, attempting repair...');
  }

  // Try with repairs
  try {
    const repaired = repairJSON(jsonString);
    const result = JSON.parse(repaired);
    console.log('JSON repaired successfully');
    return result;
  } catch (repairError) {
    console.error('JSON repair failed:', repairError);
  }

  // Last resort: try to extract just the essential fields
  try {
    const nameMatch = jsonString.match(/"name"\s*:\s*"([^"]+)"/);
    const descMatch = jsonString.match(/"description"\s*:\s*"([^"]+)"/);
    const elementMatch = jsonString.match(/"element"\s*:\s*"([^"]+)"/);
    const imageMatch = jsonString.match(/"imagePrompt"\s*:\s*"([^"]+)"/);

    if (nameMatch) {
      console.log('Extracted partial data from malformed JSON');
      return {
        name: nameMatch[1],
        description: descMatch?.[1] || '',
        element: elementMatch?.[1] || null,
        imagePrompt: imageMatch?.[1] || null,
        _partial: true
      };
    }
  } catch (extractError) {
    console.error('Field extraction failed:', extractError);
  }

  return null;
}

function getDefaultCard(theme: string, element: string): CardDataResponse {
  return {
    name: `${theme} Guardian`,
    description: 'Un guardián místico emerge de las sombras.',
    cost: 5,
    power: 4,
    defense: 4,
    element: element as CardDataResponse['element'],
    problemCategory: 'Math',
    imagePrompt: `${theme} guardian character, fantasy card art, dramatic lighting`,
    tags: [theme.toLowerCase(), element.toLowerCase()],
    problemHints: {
      keywords: [theme.toLowerCase(), element.toLowerCase(), 'guardian'],
      difficulty: 5,
      subCategory: 'arithmetic',
      contextType: 'fantasy',
      suggestedTopics: ['addition', 'multiplication']
    }
  };
}

export interface CardGenerationRequest {
  topic?: string;
  theme?: string;
  difficulty?: number;
  element?: "Fire" | "Water" | "Earth" | "Air";
}

export interface ProblemHints {
  keywords: string[]; // 3-5 thematic keywords for problem context
  difficulty: number; // 1-10
  subCategory: string; // Specific topic (e.g., "algebra", "geometry", "physics")
  contextType: "fantasy" | "real_world" | "abstract";
  suggestedTopics: string[]; // 2-3 specific mathematical/scientific concepts
}

export interface CardDataResponse {
  name: string;
  description: string;
  cost: number;
  power: number;
  defense: number;
  element: "Fire" | "Water" | "Earth" | "Air";
  problemCategory: "Math" | "Logic" | "Science";
  imagePrompt: string;
  tags: string[];
  problemHints: ProblemHints; // For dynamic problem generation when card is played
}

// ============================================
// CREATIVE CONTENT FOR EPIC CARDS (Dynamic - No Static Dictionaries)
// ============================================

// NOTE: Name generation is now 100% AI-driven with MTG-style prompts
// No static prefixes/suffixes - the LLM creates original names based on theme

// Art styles for variety - ENHANCED
const ART_STYLES = [
  "dark fantasy oil painting, dramatic chiaroscuro lighting, museum quality",
  "ethereal digital art, luminescent particles, mystical atmosphere, 8k detail",
  "detailed concept art, cinematic lighting, epic scale, artstation trending",
  "gothic art nouveau, ornate symbolic elements, golden ratio composition",
  "realistic fantasy illustration, volumetric lighting, hyper detailed textures",
  "impressionist fantasy style, vibrant brushstrokes, emotional atmosphere",
  "dark gothic illustration, intricate details, dramatic shadows, award winning"
];

// Perspectives for variety - ENHANCED
const PERSPECTIVES = [
  "dramatic low angle shot looking up, heroic presence, towering figure",
  "portrait view, intense piercing gaze at viewer, soul-capturing detail",
  "dynamic action pose mid-movement, energy trails, motion blur accents",
  "majestic full body silhouette against dramatic sky, epic scale",
  "close-up showing raw power emanating from hands, magical particles",
  "environmental shot showing scale and grandeur, atmospheric depth",
  "three-quarter view with magical particles swirling, mystical aura"
];

// Moods for variety
const MOODS = [
  'powerful and commanding, radiating authority',
  'mysterious and ancient, keeper of forgotten secrets',
  'wild and untamed, primal fury unleashed',
  'ethereal and otherworldly, transcendent being',
  'fierce and battle-ready, unstoppable warrior',
  'serene yet deadly, calm before the storm',
  'dark and foreboding, harbinger of doom'
];

// Element visual effects
const ELEMENT_VISUALS: Record<string, { effects: string; palette: string }> = {
  Fire: {
    effects: 'flames, embers, heat distortion, volcanic glow, fire particles',
    palette: 'deep reds, oranges, amber, volcanic blacks, ember glows'
  },
  Water: {
    effects: 'water droplets, mist, bioluminescence, underwater caustics, waves',
    palette: 'deep blues, teals, aquamarines, bioluminescent cyan accents'
  },
  Earth: {
    effects: 'floating rocks, crystal formations, earth cracks, moss glow, roots',
    palette: 'forest greens, rich browns, gold accents, stone grays, emerald'
  },
  Air: {
    effects: 'wind trails, lightning, cloud wisps, feathers floating, storm energy',
    palette: 'sky blues, silver whites, lavender mists, lightning purples'
  }
};

// Problem subcategories by main category
const SUBCATEGORIES = {
  Math: ["arithmetic", "algebra", "geometry", "fractions", "percentages", "patterns", "sequences"],
  Logic: ["puzzles", "sequences", "deduction", "patterns", "riddles", "causality"],
  Science: ["physics", "chemistry", "biology", "astronomy", "geology", "ecology"]
};

// Suggested topics by element (thematic)
const ELEMENT_TOPICS = {
  Fire: ["temperature", "energy", "heat transfer", "combustion", "expansion", "velocity"],
  Water: ["volume", "flow rate", "pressure", "density", "waves", "cycles"],
  Earth: ["mass", "weight", "minerals", "layers", "pressure", "stability"],
  Air: ["speed", "distance", "atmosphere", "pressure", "movement", "patterns"]
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const body = await request.json() as CardGenerationRequest;
      const { topic, theme, difficulty = 5, element } = body;

      const themeText = theme || topic || "Fantasy";
      const finalElement = element || (['Fire', 'Water', 'Earth', 'Air'] as const)[Math.floor(Math.random() * 4)];

      // Random selections for variety
      const randomArtStyle = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
      const randomPerspective = PERSPECTIVES[Math.floor(Math.random() * PERSPECTIVES.length)];

      // Balanced stats based on difficulty
      const statBase = Math.floor(difficulty / 2) + 2;
      const randomCost = Math.min(10, Math.max(1, statBase + Math.floor(Math.random() * 3) - 1));
      const randomPower = Math.min(10, Math.max(1, statBase + Math.floor(Math.random() * 3)));
      const randomDefense = Math.min(10, Math.max(1, statBase + Math.floor(Math.random() * 2)));
      const randomCategory = (['Math', 'Logic', 'Science'] as const)[Math.floor(Math.random() * 3)];

      // Select subcategory and topics based on category and element
      const subcategories = SUBCATEGORIES[randomCategory];
      const randomSubCategory = subcategories[Math.floor(Math.random() * subcategories.length)];
      const elementTopics = ELEMENT_TOPICS[finalElement];
      const shuffledTopics = [...elementTopics].sort(() => Math.random() - 0.5).slice(0, 2);

      // Generate unique seed for variety
      const nameSeed = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

      // Get random visual elements for image generation
      const randomMood = MOODS[Math.floor(Math.random() * MOODS.length)];
      const elementVisuals = ELEMENT_VISUALS[finalElement] || ELEMENT_VISUALS.Fire;

      // Determine context type based on theme keywords
      const contextType = themeText.toLowerCase().includes('techno') || themeText.toLowerCase().includes('cyber') ? 'abstract' :
                          themeText.toLowerCase().includes('natur') || themeText.toLowerCase().includes('forest') ? 'real_world' : 'fantasy';

      // Random flavor text style for variety
      const flavorStyles = ['QUOTE', 'LORE', 'PROPHECY', 'DESCRIPTION', 'DIALOGUE'];
      const randomFlavorStyle = flavorStyles[Math.floor(Math.random() * flavorStyles.length)];

      // Random starting letter to force phonetic diversity
      const starterLetters = ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'R', 'S', 'T', 'V', 'X', 'Y', 'Z'];
      const forcedLetter = starterLetters[Math.floor(Math.random() * starterLetters.length)];

      // Random name structure for variety
      const nameStructures = [
        'SINGLE_WORD',      // "Abyssara", "Velkoreth"
        'NAME_EPITHET',     // "Azura, la Cantora del Vacío"
        'THE_TITLE',        // "El Devorador de Mareas"
        'ADJECTIVE_NOUN',   // "Marea Ancestral", "Sombra Eterna"
        'COMPOUND'          // "Aguaoscura", "Tormentanegra"
      ];
      const forcedStructure = nameStructures[Math.floor(Math.random() * nameStructures.length)];

      // MTG-style prompt for maximum creativity
      const prompt = `Create an EPIC TCG card. Output ONLY raw JSON, no markdown.

THEME: "${themeText}" | ELEMENT: ${finalElement} | SEED: ${nameSeed}

MANDATORY NAME REQUIREMENTS:
1. Name MUST start with letter: "${forcedLetter}" (THIS IS REQUIRED)
2. Use structure: ${forcedStructure}
   - SINGLE_WORD: Invented word like "Abyssara", "Velkoreth", "Nihara"
   - NAME_EPITHET: "Name, the/la/el Title" like "Azura, la Cantora del Vacío"
   - THE_TITLE: Descriptive like "El Devorador de Mareas", "La Que Susurra"
   - ADJECTIVE_NOUN: "Marea Ancestral", "Sombra Eterna", "Tormenta Olvidada"
   - COMPOUND: Merged words like "Aguaoscura", "Marenebla"

3. FORBIDDEN: Names starting with K, C, or Q (overused patterns)
4. Mix cultural inspirations: Norse, Japanese, Arabic, Slavic, African, Celtic, Latin

FLAVOR TEXT STYLE: ${randomFlavorStyle}
Examples (VARY your style, don't copy):
- QUOTE: "Donde termina la luz, comienza mi reino." —Nihara, Señora de las Profundidades
- LORE: Los pescadores de Vel'mar nunca miran al horizonte cuando cae el sol.
- PROPHECY: Cuando las tres lunas se alineen, el Abismo despertará.
- DESCRIPTION: No caza. Espera. Y el océano es paciente.
- DIALOGUE: "¿Ves esas sombras bajo el agua? No son sombras."

REQUIRED JSON:
{
  "name": "<UNIQUE 1-4 word name, EPIC and MEMORABLE, Spanish or invented>",
  "description": "<Flavor text in Spanish, ${randomFlavorStyle} style, 1-2 sentences MAX, MUST NARRATE something>",
  "cost": ${randomCost},
  "power": ${randomPower},
  "defense": ${randomDefense},
  "element": "${finalElement}",
  "problemCategory": "${randomCategory}",
  "imagePrompt": "<CINEMATIC English: ${randomArtStyle}, ${randomPerspective}, ${randomMood}, ${elementVisuals.effects}, ${elementVisuals.palette}, trading card art, no text, no borders>",
  "tags": ["${themeText.toLowerCase()}", "${finalElement.toLowerCase()}", "<thematic_tag_1>", "<thematic_tag_2>"],
  "problemHints": {
    "keywords": ["<spanish_word_1>", "<spanish_word_2>", "<spanish_word_3>", "<spanish_word_4>", "<spanish_word_5>"],
    "difficulty": ${Math.min(10, randomCost + 2)},
    "subCategory": "${randomSubCategory}",
    "contextType": "${contextType}",
    "suggestedTopics": ${JSON.stringify(shuffledTopics)}
  }
}`;

      const systemPrompt = `Eres un escritor legendario de cartas TCG. Tu trabajo es crear cartas con la calidad narrativa de Magic: The Gathering.

REGLAS JSON CRÍTICAS:
1. Solo JSON válido - sin \`\`\`, sin markdown, sin explicaciones
2. Empieza con { y termina con }
3. Comillas dobles para strings, sin comas finales

NOMBRES - EJEMPLOS DE EXCELENCIA (inspírate pero NO copies):
- "Ythara, Voz de las Profundidades" (nombre + epíteto)
- "Maremoto Ancestral" (concepto poderoso)
- "Xanthrid" (nombre inventado único)
- "La Que Duerme Bajo las Olas" (título descriptivo)
- "Nereida del Último Suspiro" (criatura + concepto oscuro)
- "Velkoreth, el Hambriento" (nombre inventado + título)
- "Susurro de la Tormenta Eterna" (concepto atmosférico)

FLAVOR TEXT - EJEMPLOS MTG (calidad narrativa):
- "Las estrellas nunca mienten. Por desgracia, tampoco consuelan." —Kala, vidente ciega
- Dicen que el mar devuelve todo lo que se le entrega. Excepto a los que ama.
- "¿Ves esas burbujas? Es lo último que verás."
- En las profundidades donde la luz es un recuerdo, ella construye catedrales de coral y hueso.
- No es un monstruo. Es una fuerza de la naturaleza con hambre.
- "Nadie ha vuelto de más allá del Velo. Pero algo sí lo ha hecho."

REGLAS ABSOLUTAS:
1. NUNCA uses nombres genéricos solos (Guardian, Warrior, Spirit, Elemental)
2. NUNCA repitas estructuras - cada nombre debe sentirse de un universo diferente
3. El flavor text DEBE narrar algo: historia, cita, profecía, atmósfera o diálogo
4. Sorpréndeme con creatividad - sé impredecible
5. Mezcla inspiraciones culturales: nórdico, japonés, árabe, africano, celta, eslavo

KEYWORDS para problemHints:
- 5 palabras en ESPAÑOL relacionadas con la carta
- Útiles para contextualizar problemas matemáticos/científicos
- Ejemplo para Water: "océano", "profundidad", "marea", "presión", "corriente"

IMAGE PROMPT: Descripción cinematográfica en inglés con estilo, mood y efectos elementales.`;

      console.log('🤖 Generating card data with Llama 3.3 70B...');
      console.log('📝 Theme:', themeText, '| Element:', finalElement, '| Category:', randomCategory);

      // Helper to extract response text
      const extractResponseText = (response: any): string => {
        if (response && typeof response === 'object') {
          if ('response' in response && typeof response.response === 'string') return response.response;
          if ('text' in response && typeof response.text === 'string') return response.text;
          if ('content' in response && typeof response.content === 'string') return response.content;
          return JSON.stringify(response);
        }
        return typeof response === 'string' ? response : '';
      };

      // Retry configuration: high temp for max creativity, moderate retry
      const attempts = [
        { temperature: 0.95, top_p: 0.95 },  // First attempt: maximum creativity
        { temperature: 0.85, top_p: 0.9 },   // Retry: still creative but more focused
      ];

      let parsed: any = null;
      let responseText = '';
      let attemptNum = 0;

      for (const config of attempts) {
        attemptNum++;
        console.log(`🔄 Attempt ${attemptNum}/${attempts.length} (temp: ${config.temperature})`);

        try {
          const aiResponse = await env.AI.run(
            '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
            {
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
              ],
              temperature: config.temperature,
              top_p: config.top_p,
              max_tokens: 800 // Limit output to prevent truncation
            }
          );

          responseText = extractResponseText(aiResponse);
          console.log('📄 Raw response:', String(responseText).substring(0, 300));

          // Try to parse
          parsed = safeParseJSON(responseText);

          // Handle nested response
          if (parsed?.response && typeof parsed.response === 'object') {
            parsed = parsed.response;
          }

          // If we got valid data, break the retry loop
          if (parsed && parsed.name) {
            console.log(`✅ JSON parsed successfully on attempt ${attemptNum}`);
            break;
          }

          console.warn(`⚠️ Attempt ${attemptNum} failed to produce valid JSON`);
          parsed = null;

        } catch (attemptError) {
          console.error(`❌ Attempt ${attemptNum} error:`, attemptError);
        }
      }

      // If all attempts failed, return fallback card (200 status, not 500)
      if (!parsed) {
        console.warn('⚠️ All parsing attempts failed, returning fallback card');
        const fallbackCard = getDefaultCard(themeText, finalElement);
        return new Response(
          JSON.stringify({
            success: true,
            data: fallbackCard,
            fallback: true,
            reason: 'JSON parsing failed after retries',
            attempts: attemptNum
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // CARD-01: Validate and clamp stats
      const validatedStats = validateCardStats(parsed, {
        cost: randomCost,
        power: randomPower,
        defense: randomDefense,
        element: finalElement,
        category: randomCategory
      });

      // Build cardData with validated stats
      let cardData: CardDataResponse = {
        ...validatedStats,
        imagePrompt: parsed.imagePrompt || `${themeText} character, ${randomArtStyle}, ${randomPerspective}, fantasy card art`,
        tags: Array.isArray(parsed.tags) && parsed.tags.length >= 2
          ? parsed.tags
          : [finalElement.toLowerCase(), themeText.toLowerCase()],
        problemHints: {
          keywords: [],
          difficulty: difficulty,
          subCategory: randomSubCategory,
          contextType: "fantasy",
          suggestedTopics: shuffledTopics
        }
      };

      // Validate and fix problemHints
      if (parsed.problemHints && typeof parsed.problemHints === 'object') {
        cardData.problemHints = {
          keywords: Array.isArray(parsed.problemHints.keywords) && parsed.problemHints.keywords.length >= 2
            ? parsed.problemHints.keywords.slice(0, 5).map(String)
            : cardData.tags.slice(0, 3),
          difficulty: clamp(Number(parsed.problemHints.difficulty) || difficulty, 1, 10),
          subCategory: String(parsed.problemHints.subCategory || randomSubCategory),
          contextType: ['fantasy', 'real_world', 'abstract'].includes(parsed.problemHints.contextType)
            ? parsed.problemHints.contextType
            : 'fantasy',
          suggestedTopics: Array.isArray(parsed.problemHints.suggestedTopics) && parsed.problemHints.suggestedTopics.length >= 1
            ? parsed.problemHints.suggestedTopics.slice(0, 3).map(String)
            : shuffledTopics
        };
      } else {
        cardData.problemHints.keywords = cardData.tags.slice(0, 3);
      }

      console.log('✅ Card generated:', cardData.name, '| Hints:', cardData.problemHints.keywords.join(', '));

      return new Response(
        JSON.stringify({
          success: true,
          data: cardData
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('❌ Error generating card data:', error);

      return new Response(
        JSON.stringify({
          error: 'Failed to generate card data',
          details: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};
