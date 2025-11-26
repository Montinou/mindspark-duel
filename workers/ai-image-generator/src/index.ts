export interface Env {
	AI: any;
}

// Color palettes by element for visual consistency
const ELEMENT_PALETTES: Record<string, string> = {
	fire: "warm color palette with deep reds, oranges, amber, volcanic blacks, ember glows",
	water: "cool color palette with deep blues, teals, aquamarines, pearl whites, bioluminescent accents",
	earth: "natural color palette with forest greens, rich browns, gold accents, moss textures, stone grays",
	air: "ethereal color palette with sky blues, silver whites, lavender mists, cloud grays, lightning purples"
};

// Quality enhancers that rotate for variety
const QUALITY_ENHANCERS = [
	"masterpiece, museum quality, award winning illustration",
	"highly detailed, intricate textures, professional artwork",
	"stunning composition, breathtaking detail, gallery worthy",
	"exquisite craftsmanship, meticulous detail, collector piece"
];

// Full art card composition guidelines
const FULL_ART_STYLES = [
	"full art trading card, edge-to-edge artwork, no borders, character fills entire frame",
	"full bleed illustration, immersive scene, expansive composition filling all space",
	"borderless card art, dynamic full-frame composition, character dominating the scene",
	"full art style, epic scale illustration, subject commanding the entire canvas"
];

// Composition guidelines for vertical full art cards
const COMPOSITION_GUIDES = [
	"vertical 2:3 aspect ratio, subject centered with dramatic pose",
	"portrait orientation, character in heroic stance, filling vertical space",
	"tall format composition, dynamic diagonal energy, full body or dramatic close-up",
	"vertical frame, powerful presence, environmental effects extending to edges"
];

// Lighting variations for visual diversity
const LIGHTING_STYLES = [
	"dramatic chiaroscuro lighting, deep shadows, highlighted features",
	"ethereal backlighting, rim light, mystical glow",
	"golden hour lighting, warm atmospheric rays",
	"moonlit scene, cool ambient light, subtle luminescence",
	"dramatic storm lighting, lightning illumination, dynamic shadows",
	"underwater caustics, dappled light, mysterious depths"
];

// Rendering styles for variety
const RENDER_STYLES = [
	"oil painting style, visible brushstrokes, rich textures",
	"digital painting, clean lines, vibrant colors",
	"concept art style, painterly finish, cinematic",
	"illustration style, bold colors, striking composition",
	"fantasy art, atmospheric, evocative mood"
];

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
			const { prompt, element } = await request.json() as { prompt: string; element?: string };

			if (!prompt) {
				return new Response(
					JSON.stringify({ error: 'Prompt is required' }),
					{ status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
				);
			}

			console.log('🎨 Generating image with Flux Schnell...');
			console.log('📝 Prompt:', prompt.substring(0, 150));

			// Random selections for visual variety
			const qualityEnhancer = QUALITY_ENHANCERS[Math.floor(Math.random() * QUALITY_ENHANCERS.length)];
			const lightingStyle = LIGHTING_STYLES[Math.floor(Math.random() * LIGHTING_STYLES.length)];
			const renderStyle = RENDER_STYLES[Math.floor(Math.random() * RENDER_STYLES.length)];
			const fullArtStyle = FULL_ART_STYLES[Math.floor(Math.random() * FULL_ART_STYLES.length)];
			const compositionGuide = COMPOSITION_GUIDES[Math.floor(Math.random() * COMPOSITION_GUIDES.length)];

			// Element-based color palette
			const elementLower = element?.toLowerCase() || '';
			const colorPalette = ELEMENT_PALETTES[elementLower] || "rich fantasy color palette";

			// Build enhanced prompt with full art card style
			const enhancedPrompt = `${prompt}, ${fullArtStyle}, ${compositionGuide}, ${renderStyle}, ${lightingStyle}, ${colorPalette}, ${qualityEnhancer}, collectible card game illustration, dark fantasy aesthetic, no text, no watermarks, no borders, no card frame`;

			console.log('🎨 Enhanced prompt:', enhancedPrompt.substring(0, 200));

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
