export interface Env {
  AI: any;
}

export interface CardGenerationRequest {
  topic?: string;
  theme?: string;
  difficulty?: number;
  element?: "Fire" | "Water" | "Earth" | "Air";
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
  ability?: string; // Special ability name
  abilityEffect?: string; // Ability description
}

// Name patterns to AVOID (too generic)
const FORBIDDEN_PATTERNS = [
  "del Abismo", "del Mar", "del Océano", "del Agua", "del Fuego", "del Viento", "de la Tierra",
  "de las Profundidades", "de los Mares", "de las Llamas", "de los Cielos"
];

// Creative name structures for variety
const NAME_STRUCTURES = [
  "Título + Nombre Propio (ej: Archimaga Velestris)",
  "Nombre + Epíteto (ej: Korrath el Implacable)",
  "Nombre Compuesto (ej: Tormenta Carmesí)",
  "Nombre en otro idioma inventado (ej: Ven'kari)",
  "Título Único (ej: La Última Marea)",
  "Nombre + Origen (ej: Yara de las Sombras Marinas)"
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
      const finalElement = element || ['Fire', 'Water', 'Earth', 'Air'][Math.floor(Math.random() * 4)];

      // Random selections for variety
      const randomNameStructure = NAME_STRUCTURES[Math.floor(Math.random() * NAME_STRUCTURES.length)];
      const randomArtStyle = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
      const randomPerspective = PERSPECTIVES[Math.floor(Math.random() * PERSPECTIVES.length)];

      // Structured prompt optimized for JSON output
      const randomCost = Math.floor(Math.random() * 5) + 3;
      const randomPower = Math.floor(Math.random() * 5) + 4;
      const randomDefense = Math.floor(Math.random() * 4) + 3;
      const randomCategory = ['Math', 'Logic', 'Science'][Math.floor(Math.random() * 3)];

      const prompt = `Generate a fantasy trading card in JSON format.

Theme: ${themeText}
Element: ${finalElement}
Name style: ${randomNameStructure}
Art style: ${randomArtStyle}
Perspective: ${randomPerspective}

Output ONLY valid JSON with this exact structure:
{"name":"<unique fantasy name in Spanish>","description":"<mysterious flavor text in Spanish, 1 sentence>","cost":${randomCost},"power":${randomPower},"defense":${randomDefense},"element":"${finalElement}","problemCategory":"${randomCategory}","imagePrompt":"<detailed English art description>","tags":["${themeText.split(' ')[0]}","fantasy"]}`;

      console.log('🤖 Generating card data with Llama 3.3 70B...');
      console.log('📝 Theme:', themeText);

      const aiResponse = await env.AI.run(
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        {
          messages: [
            {
              role: 'system',
              content: `Eres el ÚLTIMO LOREKEEPER de un mundo olvidado, guardián de nombres prohibidos y secretos ancestrales.

TU MISIÓN: Crear cartas de TCG con nombres ÚNICOS y flavor text MEMORABLE.

ESTILO DE ESCRITURA:
- Nombres: Inventivos, memorables, con personalidad propia (NUNCA genéricos)
- Flavor text: Inscripciones antiguas, fragmentos de profecías, últimas palabras de héroes caídos
- Tono: Oscuro, poético, misterioso (Dark Souls, Elden Ring, Bloodborne)

REGLAS ABSOLUTAS:
1. JAMÁS uses patrones como "El/La [Criatura] del [Lugar]"
2. JAMÁS describas apariencia física en el flavor text
3. SIEMPRE inventa nombres propios únicos (Velestris, Korrath, Ven'kari)
4. SIEMPRE escribe flavor text que sugiera una historia más grande
5. SIEMPRE responde SOLO con JSON válido, sin markdown ni explicaciones

Cada carta debe sentirse como un fragmento de un mundo vasto y antiguo.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.9, // Higher creativity
          top_p: 0.95
        }
      );

      // Extract text from AI response - handle multiple formats
      let responseText = '';
      if (aiResponse && typeof aiResponse === 'object') {
        if ('response' in aiResponse && typeof aiResponse.response === 'string') {
          responseText = aiResponse.response;
        } else if ('text' in aiResponse && typeof aiResponse.text === 'string') {
          responseText = aiResponse.text;
        } else if ('content' in aiResponse && typeof aiResponse.content === 'string') {
          responseText = aiResponse.content;
        } else {
          // Try to stringify and extract
          responseText = JSON.stringify(aiResponse);
        }
      } else if (typeof aiResponse === 'string') {
        responseText = aiResponse;
      } else {
        throw new Error(`Invalid response format from Llama: ${typeof aiResponse}`);
      }

      console.log('📄 Raw response type:', typeof responseText);
      console.log('📄 Raw response:', String(responseText).substring(0, 300));

      // Clean up markdown code blocks and extract JSON
      let jsonString = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      // Try to extract JSON object if there's extra text
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      // Try parsing first - if it fails, log and retry with Llama
      let cardData: CardDataResponse;
      try {
        console.log('📄 JSON to parse:', jsonString.substring(0, 500));
        let parsed = JSON.parse(jsonString);

        // Handle nested response format from Llama 3.3
        if (parsed.response && typeof parsed.response === 'object') {
          parsed = parsed.response;
        }

        cardData = parsed as CardDataResponse;
        console.log('📄 Parsed cardData:', JSON.stringify(cardData).substring(0, 300));
      } catch (parseError) {
        console.error('⚠️  JSON parse failed, raw response:', jsonString.substring(0, 500));
        console.error('⚠️  Error:', parseError);
        throw new Error(`Invalid JSON from Llama: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Validate and fix required fields
      if (!cardData.name || !cardData.element) {
        throw new Error(`Missing required fields: name=${cardData.name}, element=${cardData.element}. Parsed: ${JSON.stringify(cardData).substring(0, 200)}`);
      }

      // Ensure tags exist with at least 2 items
      if (!cardData.tags || !Array.isArray(cardData.tags) || cardData.tags.length < 2) {
        cardData.tags = [cardData.element.toLowerCase(), themeText.split(' ')[0].toLowerCase()];
      }

      // Ensure imagePrompt exists
      if (!cardData.imagePrompt) {
        cardData.imagePrompt = `${themeText} character, ${randomArtStyle}, ${randomPerspective}, fantasy art`;
      }

      // Ensure numeric fields
      cardData.power = cardData.power || 5;
      cardData.defense = cardData.defense || 4;
      cardData.cost = cardData.cost || Math.round((cardData.power + cardData.defense) / 2);

      console.log('✅ Card data generated:', cardData.name);

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
