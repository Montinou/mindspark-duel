export interface Env {
  AI: any; // Using any to avoid Cloudflare AI type strictness
}

// Cloudflare Workers AI response type
interface AiTextGenerationOutput {
  response?: string;
}

/**
 * Problem hints - metadata for dynamic problem generation
 * Stored on the card, used at play-time
 */
export interface ProblemHints {
  keywords: string[];
  difficulty: number;
  subCategory: string;
  contextType: "fantasy" | "real_world" | "abstract";
  suggestedTopics: string[];
}

/**
 * Card stats for thematic problem generation
 */
export interface CardStats {
  power: number;
  cost: number;
  defense: number;
  ability?: {
    name: string;
    manaCost: number;
    damage: number;
    target: "enemy_hero" | "enemy_creature" | "all_enemies" | "self_heal";
  };
}

export interface ProblemGenerationRequest {
  category: "Math" | "Logic" | "Science";
  difficulty: number;
  theme?: string;
  // User profile for personalization
  userAge?: number;
  userEducationLevel?: "elementary" | "middle" | "high" | "college" | "other";
  userInterests?: string[];
  // Card context for battle problems
  cardName?: string;
  cardElement?: "Fire" | "Water" | "Earth" | "Air";
  cardTags?: string[];
  // NEW: Card stats and problem hints for dynamic generation
  cardStats?: CardStats;
  problemHints?: ProblemHints;
}

export interface ProblemResponse {
  question: string;
  options: string[];
  correctAnswer: string;
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
      const {
        category,
        difficulty,
        theme,
        userAge,
        userEducationLevel,
        userInterests,
        cardName,
        cardElement,
        cardTags,
        cardStats,
        problemHints
      } = body;

      if (!category || !difficulty) {
        return new Response(
          JSON.stringify({ error: 'category and difficulty are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build user context for personalization
      let userContext = '';
      if (userAge || userEducationLevel) {
        userContext = '\n\nCONTEXTO DEL USUARIO:';
        if (userAge) {
          userContext += `\n- El usuario tiene ${userAge} años`;
        }
        if (userEducationLevel) {
          const levelDescriptions: Record<string, string> = {
            elementary: 'primaria (vocabulario simple y conceptos básicos)',
            middle: 'secundaria (vocabulario intermedio)',
            high: 'preparatoria (vocabulario técnico apropiado)',
            college: 'universidad (terminología técnica avanzada)'
          };
          userContext += `\n- Nivel educativo: ${levelDescriptions[userEducationLevel] || userEducationLevel}`;
        }
        if (userInterests && userInterests.length > 0) {
          userContext += `\n- Intereses: ${userInterests.join(', ')}`;
          userContext += '\n- IMPORTANTE: Si es posible, conecta el problema con estos intereses de manera natural y relevante';
        }
        userContext += '\n';
      }

      // Build card context for battle problems (enhanced with stats and hints)
      let cardContext = '';
      const hasCardData = cardName || cardElement || cardTags?.length || cardStats || problemHints;

      if (hasCardData) {
        cardContext = '\n\nCONTEXTO DE CARTA (BATALLA):';

        if (cardName) {
          cardContext += `\n- Carta jugada: "${cardName}"`;
        }

        if (cardElement) {
          const elementNames: Record<string, string> = {
            Fire: 'Fuego 🔥',
            Water: 'Agua 💧',
            Earth: 'Tierra 🌍',
            Air: 'Aire 💨'
          };
          cardContext += `\n- Elemento: ${elementNames[cardElement]}`;
        }

        // Card stats for numeric problems
        if (cardStats) {
          cardContext += '\n\nESTADÍSTICAS DE LA CARTA (úsalas en el problema):';
          cardContext += `\n- Poder de ataque: ${cardStats.power}`;
          cardContext += `\n- Costo de maná: ${cardStats.cost}`;
          cardContext += `\n- Defensa: ${cardStats.defense}`;

          if (cardStats.ability) {
            cardContext += `\n- Habilidad: "${cardStats.ability.name}" (cuesta ${cardStats.ability.manaCost} maná, causa ${cardStats.ability.damage} de daño)`;
            const targetDesc: Record<string, string> = {
              enemy_hero: 'al héroe enemigo',
              enemy_creature: 'a una criatura enemiga',
              all_enemies: 'a todas las criaturas enemigas',
              self_heal: 'curación propia'
            };
            cardContext += `\n- Objetivo de habilidad: ${targetDesc[cardStats.ability.target]}`;
          }

          cardContext += '\n- IMPORTANTE: Usa estos números en el problema (ej: "Si el ataque es X y la defensa Y...")';
        }

        // Problem hints for thematic generation
        if (problemHints) {
          cardContext += '\n\nHINTS PARA GENERACIÓN:';

          if (problemHints.keywords?.length) {
            cardContext += `\n- Palabras clave temáticas: ${problemHints.keywords.join(', ')}`;
          }

          if (problemHints.subCategory) {
            cardContext += `\n- Subcategoría específica: ${problemHints.subCategory}`;
          }

          if (problemHints.suggestedTopics?.length) {
            cardContext += `\n- Temas sugeridos: ${problemHints.suggestedTopics.join(', ')}`;
          }

          if (problemHints.contextType) {
            const contextDesc: Record<string, string> = {
              fantasy: 'Usa contexto de fantasía/magia (hechizos, criaturas, batallas)',
              real_world: 'Usa contexto del mundo real (situaciones cotidianas)',
              abstract: 'Usa formato abstracto/matemático puro'
            };
            cardContext += `\n- Estilo de contexto: ${contextDesc[problemHints.contextType]}`;
          }
        }

        if (cardTags?.length) {
          cardContext += `\n- Tags adicionales: ${cardTags.join(', ')}`;
        }

        cardContext += '\n\n⚡ IMPORTANTE: El problema DEBE estar temáticamente relacionado con la carta. Usa los stats, keywords y contexto para crear un problema inmersivo y relevante.';
        cardContext += '\n';
      }

      const themeContext = theme ? ` relacionado con el tema "${theme}"` : '';

      const prompt = `Genera un problema educativo de OPCIÓN MÚLTIPLE para la categoría ${category} con dificultad ${difficulty} (escala 1-10)${themeContext}.${userContext}${cardContext}

INSTRUCCIONES ESTRICTAS:
1. Debes responder ÚNICAMENTE con JSON válido
2. NO incluyas markdown, código, explicaciones ni texto extra
3. NO uses comillas dentro de los valores de texto
4. RESPETA EXACTAMENTE esta estructura:

{
  "question": "La pregunta del problema en español",
  "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
  "correctAnswer": "El texto EXACTO de la opción correcta",
  "category": "${category}"
}

REGLAS OBLIGATORIAS:
- question: En ESPAÑOL, clara y bien formulada.
- options: Array de 4 strings únicos. Una correcta, tres distractores plausibles.
- correctAnswer: DEBE ser idéntico a uno de los strings en 'options'.
- category: DEBE ser EXACTAMENTE "${category}"
- Dificultad ${difficulty}: Ajusta la complejidad del problema.

EJEMPLO VÁLIDO:
{
  "question": "Si un tren viaja a 80 km/h durante 2 horas, ¿cuántos kilómetros recorre?",
  "options": ["100 km", "120 km", "160 km", "200 km"],
  "correctAnswer": "160 km",
  "category": "Math"
}`;

      console.log('🧮 Generating educational problem...');
      console.log('📚 Category:', category, '| Difficulty:', difficulty);
      if (cardStats) {
        console.log('⚔️ Card Stats:', `Power=${cardStats.power}, Cost=${cardStats.cost}, Defense=${cardStats.defense}`);
      }
      if (problemHints) {
        console.log('💡 Problem Hints:', problemHints.keywords?.slice(0, 3).join(', '));
      }

      const aiResponse = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            {
              role: 'system',
              content: 'Eres un profesor experto que genera problemas educativos. Respondes con JSON perfectamente válido sin formato markdown ni texto adicional. Siempre respetas la estructura exacta solicitada.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        }
      );

      let responseText = '';
      const response = aiResponse as AiTextGenerationOutput;
      if (response && typeof response === 'object' && 'response' in response && response.response) {
        responseText = response.response;
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

      if (!problemData.question || !problemData.options || !problemData.correctAnswer) {
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
