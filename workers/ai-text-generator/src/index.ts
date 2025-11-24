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
  tags: string[]; // 2-4 thematic keywords in Spanish for contextual problem generation
}

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
      const elementInstruction = element
        ? `The card MUST belong to the element: "${element}".`
        : "Choose a suitable element (Fire, Water, Earth, Air).";

      const prompt = `Eres un diseñador creativo de juegos de cartas. Crea una carta para "MindSpark Duel" basada en el tema: "${themeText}". ${elementInstruction}

INSTRUCCIONES ESTRICTAS:
1. Debes responder ÚNICAMENTE con JSON válido
2. NO incluyas markdown, código, explicaciones ni texto extra
3. NO uses comillas dentro de los valores de texto
4. RESPETA EXACTAMENTE esta estructura:

{
  "name": "Nombre de la Carta",
  "description": "Texto descriptivo en español de 1-2 oraciones",
  "cost": 5,
  "power": 6,
  "defense": 4,
  "element": "Fire",
  "problemCategory": "Math",
  "imagePrompt": "Descripcion detallada en ingles para arte vertical de carta tipo trading card estilo full-bleed",
  "tags": ["palabra1", "palabra2", "palabra3"]
}

REGLAS OBLIGATORIAS:
- name: En ESPAÑOL, sin comillas internas
- description: En ESPAÑOL, 1-2 oraciones, sin comillas internas
- cost: Número entero (promedio de power + defense dividido por 2)
- power: Número entero entre 1-10
- defense: Número entero entre 1-10
- element: DEBE ser EXACTAMENTE uno de estos: Fire, Water, Earth, Air
- problemCategory: DEBE ser EXACTAMENTE uno de estos: Math, Logic, Science
- imagePrompt: En INGLÉS, descripción corta y clara, SIN comillas
- tags: Array de 2-4 palabras clave temáticas en ESPAÑOL (relacionadas con nombre, elemento, tema)

EJEMPLO VÁLIDO:
{
  "name": "El Dragon de Fuego",
  "description": "Un poderoso dragon que domina las llamas del inframundo.",
  "cost": 5,
  "power": 7,
  "defense": 3,
  "element": "Fire",
  "problemCategory": "Math",
  "imagePrompt": "Majestic red dragon breathing fire in a volcanic landscape vertical portrait card art full bleed style",
  "tags": ["dragón", "fuego", "volcán"]
}`;

      console.log('🤖 Generating card data with Llama 3.1 8B...');
      console.log('📝 Theme:', themeText);

      const aiResponse = await env.AI.run(
        '@cf/meta/llama-3.1-8b-instruct',
        {
          messages: [
            {
              role: 'system',
              content: 'Eres un diseñador de juegos experto en cartas de trading. Generas respuestas JSON perfectamente válidas sin formato markdown ni texto adicional. Siempre respetas la estructura exacta solicitada.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        }
      );

      // Extract text from AI response
      let responseText = '';
      if (aiResponse && typeof aiResponse === 'object' && 'response' in aiResponse) {
        responseText = aiResponse.response;
      } else if (typeof aiResponse === 'string') {
        responseText = aiResponse;
      } else {
        throw new Error('Invalid response format from Llama 3.1');
      }

      console.log('📄 Raw response:', responseText.substring(0, 300));

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
        cardData = JSON.parse(jsonString) as CardDataResponse;
      } catch (parseError) {
        console.error('⚠️  JSON parse failed, raw response:', jsonString.substring(0, 500));
        console.error('⚠️  Error:', parseError);
        throw new Error(`Invalid JSON from Llama: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Validate required fields
      if (!cardData.name || !cardData.element || !cardData.imagePrompt || !cardData.tags || cardData.tags.length < 2) {
        throw new Error('Missing required fields in generated card data (tags must have at least 2 keywords)');
      }

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
