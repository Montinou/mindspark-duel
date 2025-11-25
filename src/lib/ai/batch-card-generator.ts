import { Card, CardBatch } from '@/types/game';
import { uploadImage } from '../storage';
import { db } from '@/db';
import { cards, cardBatches } from '@/db/schema';
import { generateImageWithWorkersAI } from './card-generator';

// Workers AI endpoints (Gemini only used for text generation)
const GEMINI_API_KEY = process.env.GEMINIAI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

interface BatchGenerationRequest {
  batchName: string;
  theme: string;
  themeDescription: string;
  count?: number; // Default: 10
  difficulty?: number; // 1-10, Default: 5
  userId?: string;
}

interface CardData {
  name: string;
  flavorText: string;
  effectDescription: string;
  cost: number;
  power: number;
  defense: number;
  element: 'Fire' | 'Water' | 'Earth' | 'Air';
  problemCategory: 'Math' | 'Logic' | 'Science';
  imagePrompt: string;
  tags: string[];
}

export async function generateCardBatch(request: BatchGenerationRequest): Promise<{ batch: CardBatch; cards: Card[] }> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINIAI_API_KEY is not set");
  }

  const count = request.count || 10;
  const difficulty = request.difficulty || 5;

  // Optimized prompt for Epic Fantasy TCG cards (2025)
  const prompt = `
You are a legendary lorekeeper and master card designer for a high-fantasy trading card game called "MindSpark Duel".

Generate a cohesive set of ${count} unique trading cards with the following theme:
**Theme**: ${request.theme}
**Description**: ${request.themeDescription}

LANGUAGE REQUIREMENT:
- All text (Name, Flavor Text, Effect Description) MUST be in SPANISH.

CRITICAL STYLE REQUIREMENTS:

1. **Art Style**: EPIC FANTASY MASTERPIECE
   - Style: Magic the Gathering (MTG) modern era, Dungeons & Dragons 5e art.
   - Mood: Epic, dramatic, atmospheric, slightly dark but vibrant.
   - Lighting: Cinematic, volumetric, rim lighting, bioluminescence where appropriate.
   - Quality: 8k resolution, highly detailed, oil painting aesthetic, sharp focus.
   - Composition: Dynamic action or imposing stance. Vertical portrait.

2. **Flavor Text**: ANCIENT & POETIC
   - Tone: Serious, mythical, legendary. Avoid casual or generic descriptions.
   - Content: Fragments of ancient prophecies, quotes from forgotten heroes, or whispers from the void.
   - Style: Use archaic or poetic Spanish phrasing (e.g., "En las sombras donde la luz no osa entrar...", "Aquel que susurra a las tormentas...").
   - Length: 1-2 evocative sentences.

3. **Card Names**:
   - Use powerful, evocative titles (e.g., "Ignis, Señor de la Ceniza", "Susurro del Vacío", "Guardiana del Bosque Eterno").

4. **Tags**:
   - 3-5 thematic tags in Spanish (e.g., "Dragón", "Fuego", "Legendario", "Hechizo").

GAME BALANCE:
- Cost: 1-10
- Power/Defense: 1-10 (Integers only, NO zeros)
- Difficulty: ${difficulty}/10

IMAGE PROMPT CONSTRUCTION (CRITICAL):
- Start with the subject.
- ALWAYS append these exact style keywords: "epic fantasy art style, magic the gathering style, oil painting, masterpiece, highly detailed, dramatic cinematic lighting, 8k resolution, artstation, unreal engine 5 render, volumetric fog, dark fantasy aesthetic".
- NO text, NO borders, NO frames.

OUTPUT FORMAT:
Return ONLY a valid JSON object:
{
  "styleGuidelines": "Brief description of the visual style",
  "cards": [
    {
      "name": "Epic Name",
      "flavorText": "Poetic lore text.",
      "effectDescription": "Game mechanic.",
      "cost": 1-10,
      "power": 1-10,
      "defense": 1-10,
      "element": "Fire" | "Water" | "Earth" | "Air",
      "problemCategory": "Math" | "Logic" | "Science",
      "imagePrompt": "[Subject description], epic fantasy art style, magic the gathering style, oil painting, masterpiece, highly detailed, dramatic cinematic lighting, 8k resolution, artstation, unreal engine 5 render, volumetric fog, dark fantasy aesthetic. Theme: ${request.theme}",
      "tags": ["tag1", "tag2"]
    }
  ]
}
`;

  try {
    console.log('🎨 Generating batch of', count, 'anime-style cards...');

    // 1. Generate card data via Gemini
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const batchData = JSON.parse(jsonString);

    console.log('✅ Card data generated successfully');

    // 2. Create batch record in database
    const [batchRecord] = await db
      .insert(cardBatches)
      .values({
        name: request.batchName,
        theme: request.theme,
        description: request.themeDescription,
        styleGuidelines: batchData.styleGuidelines,
        createdById: request.userId || null,
      })
      .returning();

    console.log('✅ Batch record created:', batchRecord.id);

    // 3. Generate images and save cards in parallel using Cloudflare Workers AI (Flux 1 Schnell)
    const cardPromises = batchData.cards.map(async (cardData: CardData, index: number) => {
      let imageUrl = "/placeholder.png";

      try {
        // Generate image using Cloudflare Workers AI (Flux 1 Schnell)
        console.log(`🖼️  Generating image ${index + 1}/${count} with Workers AI...`);
        imageUrl = await generateImageWithWorkersAI(cardData.imagePrompt);
        console.log(`✅ Image ${index + 1} uploaded to R2`);
      } catch (imgError) {
        console.error(`⚠️  Failed to generate/upload image for card ${index + 1}:`, imgError);
      }

      // Validate and ensure power/defense are set (fallback to 1 if missing)
      const power = cardData.power || 1;
      const defense = cardData.defense || 1;

      // Save card to database
      const [savedCard] = await db
        .insert(cards)
        .values({
          name: cardData.name,
          description: `${cardData.flavorText} ${cardData.effectDescription}`, // Backwards compat
          flavorText: cardData.flavorText,
          effectDescription: cardData.effectDescription,
          cost: cardData.cost,
          power,
          defense,
          element: cardData.element,
          problemCategory: cardData.problemCategory,
          imageUrl,
          imagePrompt: cardData.imagePrompt,
          theme: request.theme,
          tags: cardData.tags,
          batchId: batchRecord.id,
          batchOrder: index + 1,
          createdById: request.userId || null,
        })
        .returning();

      return {
        id: savedCard.id,
        name: savedCard.name,
        description: savedCard.description,
        flavorText: savedCard.flavorText || undefined,
        effectDescription: savedCard.effectDescription || undefined,
        cost: savedCard.cost,
        power: savedCard.power,
        defense: savedCard.defense,
        element: savedCard.element,
        problemCategory: savedCard.problemCategory,
        imageUrl: savedCard.imageUrl || "/placeholder.png",
        imagePrompt: savedCard.imagePrompt || undefined,
        theme: savedCard.theme || undefined,
        tags: (savedCard.tags as string[]) || undefined,
        batchId: savedCard.batchId || undefined,
        batchOrder: savedCard.batchOrder || undefined,
      } as Card;
    });

    const generatedCards = await Promise.all(cardPromises);

    console.log('🎉 Batch generation complete!');
    console.log(`   Batch ID: ${batchRecord.id}`);
    console.log(`   Cards: ${generatedCards.length}`);

    return {
      batch: {
        id: batchRecord.id,
        name: batchRecord.name,
        theme: batchRecord.theme,
        description: batchRecord.description || undefined,
        styleGuidelines: batchRecord.styleGuidelines || undefined,
        createdById: batchRecord.createdById || undefined,
        createdAt: batchRecord.createdAt,
      },
      cards: generatedCards,
    };

  } catch (error) {
    console.error("Failed to generate card batch:", error);
    throw error;
  }
}
