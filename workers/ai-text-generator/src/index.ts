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
// CREATIVE CONTENT FOR EPIC CARDS
// ============================================

// Name prefixes by theme
const NAME_PREFIXES: Record<string, string[]> = {
  technomancer: [
    'Cyber-', 'Meca-', 'Tecno-', 'Nano-', 'Circuito ', 'Voltio ', 'Quantum ',
    'Proto-', 'Synth-', 'Chrome ', 'Byte ', 'Nexus ', 'Vector ', 'Flux ', 'Core '
  ],
  nature: [
    'Silvestre ', 'Primordial ', 'Verde ', 'Salvaje ', 'Ancestral ', 'Bosque ',
    'Raíz ', 'Flora ', 'Fauna ', 'Espina ', 'Selva ', 'Brote ', 'Semilla ', 'Musgo '
  ],
  arcane: [
    'Arcano ', 'Místico ', 'Oculto ', 'Etéreo ', 'Rúnico ', 'Sombra ',
    'Astral ', 'Vacío ', 'Nébula ', 'Cristal ', 'Espectro ', 'Enigma ', 'Éter '
  ],
  fantasy: [
    'Noble ', 'Antiguo ', 'Sagrado ', 'Profano ', 'Celeste ', 'Infernal ',
    'Primigenio ', 'Eterno ', 'Mítico ', 'Legendario '
  ]
};

// Name suffixes by theme
const NAME_SUFFIXES: Record<string, string[]> = {
  technomancer: [
    'Golem', 'Autómata', 'Centinela', 'Constructor', 'Ensamblador', 'Dron',
    'Androide', 'Forjador', 'Ingeniero', 'Mecanismo', 'Interfaz', 'Código', 'Matriz'
  ],
  nature: [
    'Guardián', 'Espíritu', 'Druida', 'Elemental', 'Bestia', 'Chamán',
    'Protector', 'Titán', 'Coloso', 'Avatar', 'Enviado', 'Emisario', 'Custodio'
  ],
  arcane: [
    'Mago', 'Hechicero', 'Conjurador', 'Invocador', 'Vidente', 'Oráculo',
    'Tejedor', 'Ilusionista', 'Alquimista', 'Sabio', 'Ermitaño', 'Maestro', 'Arúspice'
  ],
  fantasy: [
    'Campeón', 'Señor', 'Heraldo', 'Vengador', 'Guardián', 'Conquistador',
    'Profeta', 'Destructor', 'Portador', 'Soberano', 'Cazador', 'Guerrero'
  ]
};

// Descriptors for variety
const DESCRIPTORS = [
  'Antiguo', 'Eterno', 'Primigenio', 'Renacido', 'Corrupto', 'Purificado',
  'Ascendido', 'Fragmentado', 'Fusionado', 'Evolucionado', 'Transcendido',
  'Imparable', 'Indomable', 'Legendario', 'Mítico', 'Olvidado', 'Prohibido',
  'Supremo', 'Infernal', 'Celestial', 'Abismal', 'Radiante', 'Sombrío'
];

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

      // Generate unique seed for name variety
      const nameSeed = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

      // Get theme-specific name parts
      const themeKey = themeText.toLowerCase().includes('techno') ? 'technomancer' :
                       themeText.toLowerCase().includes('natur') ? 'nature' :
                       themeText.toLowerCase().includes('arcan') ? 'arcane' : 'fantasy';
      const prefixes = NAME_PREFIXES[themeKey] || NAME_PREFIXES.fantasy;
      const suffixes = NAME_SUFFIXES[themeKey] || NAME_SUFFIXES.fantasy;
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      const randomDescriptor = DESCRIPTORS[Math.floor(Math.random() * DESCRIPTORS.length)];
      const randomMood = MOODS[Math.floor(Math.random() * MOODS.length)];

      // Get element visuals
      const elementVisuals = ELEMENT_VISUALS[finalElement] || ELEMENT_VISUALS.Fire;

      // Determine context type based on theme
      const contextType = themeKey === 'technomancer' ? 'abstract' :
                          themeKey === 'nature' ? 'real_world' : 'fantasy';

      // Enhanced prompt for EPIC cards
      const prompt = `Generate an EPIC fantasy TCG card. Output ONLY raw JSON, no markdown.

Theme: ${themeText} | Element: ${finalElement} | Seed: ${nameSeed}

NAME IDEAS (combine creatively):
- Prefixes: ${randomPrefix}, ${prefixes[Math.floor(Math.random() * prefixes.length)]}
- Suffixes: ${randomSuffix}, ${suffixes[Math.floor(Math.random() * suffixes.length)]}
- Descriptors: ${randomDescriptor}, ${DESCRIPTORS[Math.floor(Math.random() * DESCRIPTORS.length)]}
- Examples: "${randomPrefix}${randomSuffix}", "${randomDescriptor} ${randomSuffix}", "${randomPrefix}${randomDescriptor}"

REQUIRED JSON:
{
  "name": "<UNIQUE 2-4 word Spanish name, EPIC and MEMORABLE>",
  "description": "<1-2 POETIC evocative sentences in Spanish, transmit POWER/MYSTERY/MAJESTY, NO stats>",
  "cost": ${randomCost},
  "power": ${randomPower},
  "defense": ${randomDefense},
  "element": "${finalElement}",
  "problemCategory": "${randomCategory}",
  "imagePrompt": "<CINEMATIC English description: ${randomArtStyle}, ${randomPerspective}, ${randomMood}, ${elementVisuals.effects}, ${elementVisuals.palette}, full art trading card, no text, no borders>",
  "tags": ["${themeText.toLowerCase()}", "${finalElement.toLowerCase()}", "<thematic_tag_1>", "<thematic_tag_2>"],
  "problemHints": {
    "keywords": ["<spanish_word_1>", "<spanish_word_2>", "<spanish_word_3>", "<spanish_word_4>", "<spanish_word_5>"],
    "difficulty": ${Math.min(10, randomCost + 2)},
    "subCategory": "${randomSubCategory}",
    "contextType": "${contextType}",
    "suggestedTopics": ${JSON.stringify(shuffledTopics)}
  }
}`;

      const systemPrompt = `Eres un generador de cartas TCG ÉPICAS y LEGENDARIAS. Cada carta debe sentirse ÚNICA y PODEROSA.

REGLAS JSON CRÍTICAS:
1. Solo JSON válido - sin \`\`\`, sin markdown, sin explicaciones
2. Empieza con { y termina con }
3. Comillas dobles para strings
4. Sin comas finales
5. Escapa caracteres especiales

CREATIVIDAD PARA NOMBRES:
- Combina prefijos + descriptores + sufijos de manera creativa
- Ejemplos épicos: "Volcán Primigenio", "Oráculo del Vacío Eterno", "Cyber-Centinela Renacido"
- NUNCA uses nombres genéricos como "Guardian" solo - siempre agrega modificadores épicos

DESCRIPCIÓN (description):
- Texto POÉTICO y EVOCADOR en español
- 1-2 oraciones que transmitan PODER, MISTERIO o MAJESTUOSIDAD
- Sin mencionar stats ni mecánicas
- Ejemplo: "De las cenizas del mundo antiguo resurge, portando el fuego de eras olvidadas."

KEYWORDS para problemHints:
- 5 palabras en ESPAÑOL relacionadas con la carta
- Útiles para contextualizar problemas matemáticos/científicos
- Ejemplo para Fire: "volcán", "temperatura", "erupción", "magma", "combustión"

IMAGE PROMPT:
- Descripción CINEMATOGRÁFICA en inglés
- Incluir estilo artístico, perspectiva, mood, efectos elementales, paleta de colores
- Siempre terminar con: full art trading card, no text, no borders`;

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

      // Retry configuration: first try with moderate temp, retry with lower temp
      const attempts = [
        { temperature: 0.7, top_p: 0.9 },   // First attempt: balanced
        { temperature: 0.3, top_p: 0.8 },   // Retry: more deterministic
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
