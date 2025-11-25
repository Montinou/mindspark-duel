export interface Env {
	AI: any;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		if (request.method !== 'POST') {
			return new Response('Method not allowed', { status: 405, headers: corsHeaders });
		}

		try {
			const { prompt } = await request.json() as { prompt: string };

			if (!prompt) {
				return new Response(
					JSON.stringify({ error: 'Prompt is required' }),
					{ status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
				);
			}

			console.log('🎨 Generating image with Flux Schnell...');
			console.log('📝 Prompt:', prompt.substring(0, 150));

			// Enhance prompt with Epic Fantasy style
			const enhancedPrompt = `${prompt}, epic fantasy art style, magic the gathering style, oil painting, masterpiece, highly detailed, dramatic cinematic lighting, 8k resolution, artstation, unreal engine 5 render, volumetric fog, dark fantasy aesthetic`;

			// Generate image using Flux 1 Schnell
			const aiResponse = await env.AI.run(
				'@cf/black-forest-labs/flux-1-schnell',
				{
					prompt: enhancedPrompt,
					num_steps: 4, // Fast generation (1-4 steps)
				}
			);

			// Response format: { image: "base64string" }
			if (!aiResponse || typeof aiResponse !== 'object' || !('image' in aiResponse)) {
				throw new Error('Invalid response from AI model');
			}

			const base64Image = aiResponse.image;

			console.log('✅ Image generated successfully');

			return new Response(
				JSON.stringify({
					success: true,
					image: base64Image,
					mimeType: 'image/png',
				}),
				{
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json',
					},
				}
			);
		} catch (error) {
			console.error('❌ Error generating image:', error);

			return new Response(
				JSON.stringify({
					error: 'Failed to generate image',
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
