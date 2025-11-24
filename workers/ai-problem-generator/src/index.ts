export interface Env {
  AI: any;
}

export interface ProblemGenerationRequest {
  category: "Math" | "Logic" | "Science";
  difficulty: number;
  theme?: string;
}

export interface ProblemResponse {
  question: string;
  answer: string;
  category: "Math" | "Logic" | "Science";
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
      const body = await request.json() as ProblemGenerationRequest;
      const { category, difficulty, theme } = body;

      if (!category || !difficulty) {
        return new Response(
          JSON.stringify({ error: 'category and difficulty are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const themeContext = theme ? ` relacionado con el tema "${theme}"` : '';

      const prompt = `Generate an educational problem for category ${category} with difficulty ${difficulty} (scale 1-10)${themeContext}.

Return ONLY valid JSON (no markdown, no extra text):
{
  "question": "The problem question in Spanish",
  "answer": "The correct answer (can be numeric or text)",
  "category": "${category}"
}

CRITICAL Rules:
- question: MUST be in SPANISH, clear and well-formatted
- answer: Must be verifiable and correct
- category: MUST be EXACTLY "${category}" (English only!)
- For Math: include exact calculations
- For Logic: include valid logical reasoning
- For Science: include correct scientific concepts
- Difficulty ${difficulty}: ${difficulty <= 3 ? 'basic' : difficulty <= 7 ? 'intermediate' : 'advanced'}`;

      console.log('🧮 Generating educational problem...');
      console.log('📚 Category:', category, '| Difficulty:', difficulty);

      const aiResponse = await env.AI.run(
        '@cf/meta/llama-3.1-8b-instruct',
        {
          messages: [
            {
              role: 'system',
              content: 'You are an expert teacher who generates educational problems. You respond with perfectly valid JSON without any markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        }
      );

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

      const problemData = JSON.parse(jsonString) as ProblemResponse;

      if (!problemData.question || !problemData.answer) {
        throw new Error('Missing required fields in generated problem');
      }

      console.log('✅ Problem generated:', problemData.question.substring(0, 80));

      return new Response(
        JSON.stringify({
          success: true,
          data: problemData
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('❌ Error generating problem:', error);

      return new Response(
        JSON.stringify({
          error: 'Failed to generate problem',
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
