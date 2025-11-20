import { Card, CardBatch } from '@/types/game';
import { uploadImage } from '../storage';
import { db } from '@/db';
import { cards, cardBatches } from '@/db/schema';

const GEMINI_API_KEY = process.env.GEMINIAI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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

  // Enhanced prompt for anime-style MTG proportion cards
  const prompt = `
You are an expert trading card game designer specializing in anime-style artwork.

Generate a cohesive set of ${count} unique trading cards for "MindSpark Duel" with the following theme:
**Theme**: ${request.theme}
**Description**: ${request.themeDescription}

CRITICAL STYLE REQUIREMENTS:
1. **Art Style**: High-quality anime art style
   - Think Studio Ghibli, Makoto Shinkai, or top anime trading card games
   - Vibrant colors, detailed linework, dynamic compositions
   - Character-focused portraits when applicable

2. **Card Proportions**: Magic the Gathering dimensions (2.5" x 3.5")
   - Vertical portrait orientation
   - Leave bottom 25% for text overlay (stats, name, flavor text)
   - Focus composition on upper 75% of card
   - Subject should fill frame dramatically

3. **Thematic Coherence**:
   - All ${count} cards must feel like part of the same "set"
   - Shared visual motifs, color palettes, or design elements
   - Progressive narrative through flavor text
   - Cross-references between cards (e.g., "sister card to X")

4. **Flavor Text**:
   - Write evocative, thematic narrative text (1-2 sentences)
   - Reference the broader lore of the theme
   - Make each card feel like part of a larger story

5. **Effect Descriptions**:
   - Separate from flavor text
   - Clear game mechanics (e.g., "Deal 3 damage", "Draw 2 cards")
   - Balanced for the card's cost

6. **Tags**:
   - Include 3-5 thematic tags per card
   - Examples: ["dragon", "fire", "legendary"], ["samurai", "warrior", "honor"]

GAME BALANCE:
- Cost range: 1-10 mana
- Power range: 1-10 (REQUIRED - all cards MUST have power, even spells/enchantments)
- Defense range: 1-10 (REQUIRED - all cards MUST have defense, even spells/enchantments)
- Cost should correlate with total stats (cost ≈ power + defense / 2)
- Difficulty for educational problems: ${difficulty}/10
- CRITICAL: Every card must have valid integer power and defense values. No nulls or zeros allowed.

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "styleGuidelines": "Brief description of the visual style for this batch",
  "cards": [
    {
      "name": "Card Name",
      "flavorText": "Evocative thematic narrative (1-2 sentences)",
      "effectDescription": "Clear game mechanics description",
      "cost": integer (1-10),
      "power": integer (1-10),
      "defense": integer (1-10),
      "element": "Fire" | "Water" | "Earth" | "Air",
      "problemCategory": "Math" | "Logic" | "Science",
      "imagePrompt": "Anime-style trading card art, Magic the Gathering card proportions (vertical 2.5x3.5 portrait). [Detailed subject description]. High-quality anime art, vibrant colors, dramatic composition, detailed linework, studio lighting. Leave bottom 25% empty for text overlay. Theme: ${request.theme}",
      "tags": ["tag1", "tag2", "tag3"]
    }
    // ... repeat for all ${count} cards
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

    // 3. Generate images and save cards in parallel
    const cardPromises = batchData.cards.map(async (cardData: CardData, index: number) => {
      let imageUrl = "/placeholder.png";

      try {
        // Generate and upload image to R2
        console.log(`🖼️  Generating image ${index + 1}/${count}...`);
        const imageResponse = await fetch(
          `https://image.pollinations.ai/prompt/${encodeURIComponent(cardData.imagePrompt)}?width=500&height=700&nologo=true`
        );

        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const fileName = `cards/${crypto.randomUUID()}.png`;
          imageUrl = await uploadImage(buffer, fileName, 'image/png');
          console.log(`✅ Image ${index + 1} uploaded`);
        }
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
