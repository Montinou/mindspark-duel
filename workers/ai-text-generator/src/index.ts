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

      const prompt = `You are a creative card game designer. Create a trading card for "MindSpark Duel" based on theme: "${themeText}". ${elementInstruction}

Return ONLY valid JSON (no markdown, no extra text):
{
  "name": "Card Name (in SPANISH)",
  "description": "Flavor text (in SPANISH, 1-2 sentences)",
  "cost": 5,
  "power": 6,
  "defense": 4,
  "element": "Fire",
  "problemCategory": "Math",
  "imagePrompt": "A detailed fantasy art description for vertical portrait trading card. Full-bleed artwork style. Theme: ${themeText}"
}

CRITICAL Rules:
- name and description: MUST be in SPANISH
- element: MUST be EXACTLY one of: Fire, Water, Earth, Air (English only!)
- problemCategory: MUST be EXACTLY one of: Math, Logic, Science (English only!)
- Balanced stats: cost = (power + defense) / 2
- imagePrompt: short, clear, English only, no quotes`;

      console.log('🤖 Generating card data with Llama 3.1 8B...');
      console.log('📝 Theme:', themeText);

      const aiResponse = await env.AI.run(
        '@cf/meta/llama-3.1-8b-instruct',
        {
          messages: [
            {
              role: 'system',
              content: 'You are a creative game designer specializing in trading card games. You generate perfectly valid JSON responses without any markdown formatting or extra text.'
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
      if (!cardData.name || !cardData.element || !cardData.imagePrompt) {
        throw new Error('Missing required fields in generated card data');
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
