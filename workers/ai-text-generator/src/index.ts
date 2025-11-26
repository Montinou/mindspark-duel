export interface Env {
  AI: any;
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

// Creative name structures for variety
const NAME_STRUCTURES = [
  "Título + Nombre Propio inventado (ej: Archimaga Velestris, Guardián Kor'thax)",
  "Nombre + Epíteto único (ej: Sylvara la Inquebrantable, Mordex el Silente)",
  "Nombre Compuesto evocador (ej: Ceniza Carmesí, Velo Eterno)",
  "Nombre en idioma inventado (ej: Zha'reth, Vel'korion, Xynareth)",
  "Título Único poético (ej: El Último Suspiro, La Primera Llama)",
  "Nombre + Origen mítico (ej: Kaelen de la Forja Olvidada)"
];

// Art styles for variety
const ART_STYLES = [
  "dark fantasy oil painting, dramatic chiaroscuro lighting",
  "ethereal watercolor illustration, mystical atmosphere",
  "detailed manga style, dynamic pose, dramatic angles",
  "gothic art nouveau, ornate borders, symbolic elements",
  "realistic concept art, cinematic composition",
  "impressionist style, vibrant brushstrokes, emotional lighting"
];

// Perspectives for variety
const PERSPECTIVES = [
  "dramatic low angle shot looking up",
  "portrait view, intense eye contact with viewer",
  "dynamic action pose mid-movement",
  "majestic full body shot with environment",
  "close-up detail shot showing power emanating",
  "silhouette against dramatic sky"
];

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
      const randomNameStructure = NAME_STRUCTURES[Math.floor(Math.random() * NAME_STRUCTURES.length)];
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

      const prompt = `Create a fantasy trading card in JSON format.

Theme: ${themeText}
Element: ${finalElement}
Name structure to use: ${randomNameStructure}
Unique seed for name: ${nameSeed}

CRITICAL: The name MUST be completely unique and inventive. Do NOT use common names like "Tharros", "Xylara", or any name you've used before.

Output ONLY valid JSON with this exact structure:
{
  "name": "<completely unique fantasy name in Spanish - use the seed for inspiration>",
  "description": "<mysterious flavor text in Spanish, 1 poetic sentence - NO physical descriptions>",
  "cost": ${randomCost},
  "power": ${randomPower},
  "defense": ${randomDefense},
  "element": "${finalElement}",
  "problemCategory": "${randomCategory}",
  "imagePrompt": "<detailed English art description using: ${randomArtStyle}, ${randomPerspective}>",
  "tags": ["${themeText.toLowerCase()}", "${finalElement.toLowerCase()}", "<add 1-2 more thematic tags>"],
  "problemHints": {
    "keywords": ["<3-5 thematic keywords related to the card's theme and element for generating math/logic problems>"],
    "difficulty": ${difficulty},
    "subCategory": "${randomSubCategory}",
    "contextType": "fantasy",
    "suggestedTopics": ${JSON.stringify(shuffledTopics)}
  }
}`;

      console.log('🤖 Generating card data with Llama 3.3 70B...');
      console.log('📝 Theme:', themeText, '| Element:', finalElement, '| Category:', randomCategory);

      const aiResponse = await env.AI.run(
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        {
          messages: [
            {
              role: 'system',
              content: `Eres el ÚLTIMO LOREKEEPER de un mundo olvidado, creador de cartas de TCG legendarias.

TU MISIÓN: Crear cartas ÚNICAS con nombres IRREPETIBLES y flavor text MEMORABLE.

REGLAS DE NOMBRES:
- INVENTAR nombres propios únicos usando el seed proporcionado
- Mezclar sílabas inventadas: Vel-, Kor-, Zha-, Xyn-, Mor-, Kae-, Ven-, Thal-
- NUNCA repetir nombres comunes (Tharros, Xylara, etc.)
- Variar estructuras: a veces título+nombre, a veces solo nombre épico

REGLAS DE FLAVOR TEXT:
- Fragmentos de profecías antiguas
- Últimas palabras de héroes caídos
- Inscripciones en runas olvidadas
- NUNCA describir apariencia física

REGLAS DE PROBLEM HINTS:
- keywords: Palabras temáticas del mundo de la carta que servirán de contexto para problemas matemáticos
- Deben ser evocadoras pero útiles (ej: "volcán", "erupción", "lava", "temperatura", "presión")

Responde SOLO con JSON válido, sin markdown ni explicaciones.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.95, // Higher creativity for unique names
          top_p: 0.98
        }
      );

      // Extract text from AI response
      let responseText = '';
      if (aiResponse && typeof aiResponse === 'object') {
        if ('response' in aiResponse && typeof aiResponse.response === 'string') {
          responseText = aiResponse.response;
        } else if ('text' in aiResponse && typeof aiResponse.text === 'string') {
          responseText = aiResponse.text;
        } else if ('content' in aiResponse && typeof aiResponse.content === 'string') {
          responseText = aiResponse.content;
        } else {
          responseText = JSON.stringify(aiResponse);
        }
      } else if (typeof aiResponse === 'string') {
        responseText = aiResponse;
      } else {
        throw new Error(`Invalid response format from Llama: ${typeof aiResponse}`);
      }

      console.log('📄 Raw response:', String(responseText).substring(0, 400));

      // Clean up markdown and extract JSON
      let jsonString = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      let cardData: CardDataResponse;
      try {
        let parsed = JSON.parse(jsonString);
        if (parsed.response && typeof parsed.response === 'object') {
          parsed = parsed.response;
        }
        cardData = parsed as CardDataResponse;
      } catch (parseError) {
        console.error('⚠️  JSON parse failed:', jsonString.substring(0, 500));
        throw new Error(`Invalid JSON from Llama: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Validate required fields
      if (!cardData.name || !cardData.element) {
        throw new Error(`Missing required fields: name=${cardData.name}, element=${cardData.element}`);
      }

      // Ensure problemCategory is valid
      if (!['Math', 'Logic', 'Science'].includes(cardData.problemCategory)) {
        cardData.problemCategory = randomCategory;
      }

      // Ensure tags exist
      if (!cardData.tags || !Array.isArray(cardData.tags) || cardData.tags.length < 2) {
        cardData.tags = [finalElement.toLowerCase(), themeText.toLowerCase()];
      }

      // Ensure imagePrompt exists
      if (!cardData.imagePrompt) {
        cardData.imagePrompt = `${themeText} character, ${randomArtStyle}, ${randomPerspective}, fantasy card art`;
      }

      // Ensure problemHints exist with defaults if not provided
      if (!cardData.problemHints || typeof cardData.problemHints !== 'object') {
        cardData.problemHints = {
          keywords: cardData.tags.slice(0, 3),
          difficulty: difficulty,
          subCategory: randomSubCategory,
          contextType: "fantasy",
          suggestedTopics: shuffledTopics
        };
      } else {
        // Validate and fix problemHints fields
        if (!cardData.problemHints.keywords || cardData.problemHints.keywords.length < 2) {
          cardData.problemHints.keywords = cardData.tags.slice(0, 3);
        }
        if (!cardData.problemHints.difficulty) {
          cardData.problemHints.difficulty = difficulty;
        }
        if (!cardData.problemHints.subCategory) {
          cardData.problemHints.subCategory = randomSubCategory;
        }
        if (!cardData.problemHints.contextType) {
          cardData.problemHints.contextType = "fantasy";
        }
        if (!cardData.problemHints.suggestedTopics || cardData.problemHints.suggestedTopics.length < 1) {
          cardData.problemHints.suggestedTopics = shuffledTopics;
        }
      }

      // Ensure numeric fields
      cardData.power = cardData.power || randomPower;
      cardData.defense = cardData.defense || randomDefense;
      cardData.cost = cardData.cost || randomCost;

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
