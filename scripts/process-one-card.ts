import { db } from "@/db";
import { cards, userCards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImageWithGemini } from "@/lib/ai/card-generator";

const GEMINI_API_KEY = process.env.GEMINIAI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

async function processOneCard() {
  // Get first pending card
  const pendingCards = await db
    .select({ card: cards })
    .from(cards)
    .where(eq(cards.name, 'Pending Card...'))
    .limit(1);

  if (pendingCards.length === 0) {
    console.log('✅ No pending cards!');
    return;
  }

  const card = pendingCards[0].card;
  console.log(`\n🎴 Processing card ${card.id} (${card.element})...`);

  // Get user for this card to determine theme
  const userCard = await db
    .select()
    .from(userCards)
    .where(eq(userCards.cardId, card.id))
    .limit(1);

  if (!userCard[0]) {
    console.error('❌ No user found for card');
    return;
  }

  // For simplicity, use element as theme hint
  const themeMap: Record<string, string> = {
    'Fire': 'technomancer',
    'Earth': 'nature',
    'Water': 'arcane',
    'Air': 'arcane'
  };
  const theme = themeMap[card.element] || 'arcane';

  const prompt = `
    Create a unique, creative trading card for a game called "MindSpark Duel".
    The card should be based on the theme: "${theme}".
    The card MUST belong to the element: "${card.element}".
    The card has cost: ${card.cost}, power: ${card.power}, defense: ${card.defense}.

    Return ONLY a valid JSON object with this structure:
    {
      "name": "Card Name",
      "description": "Brief card effect description",
      "flavorText": "Thematic flavor text",
      "imagePrompt": "OPTIMIZED FULL ART PROMPT - [Detailed subject description matching card name]. Vertical portrait orientation, full-bleed borderless composition extending to all edges. Magic the Gathering full art card style. High-resolution digital painting with dramatic cinematic lighting, vibrant saturated colors, intricate details, sharp focus. The subject fills the frame dramatically with immersive environment surrounding it. Professional TCG artwork quality, masterpiece, highly detailed, rich textures. NO text, NO watermarks, NO borders, NO frames. Theme: ${theme}"
    }

    IMPORTANT: Generate all text in SPANISH.
  `;

  console.log('📝 Generating card text with Gemini...');
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Gemini API Error: ${response.status} ${response.statusText}`);
    console.error('Response:', errorText);
    throw new Error(`Gemini text generation failed: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const cardData = JSON.parse(jsonString);

  console.log(`✅ Text generated for: ${cardData.name}`);

  // Generate Image using Imagen 3
  console.log('🖼️  Generating image...');
  const imageUrl = await generateImageWithGemini(cardData.imagePrompt);

  // Update card with all generated data
  console.log('💾 Updating card in database...');
  await db.update(cards).set({
    name: cardData.name,
    description: cardData.description,
    flavorText: cardData.flavorText || "",
    imageUrl: imageUrl,
    imagePrompt: cardData.imagePrompt,
  }).where(eq(cards.id, card.id));

  console.log(`✅ Card ${card.id} processed successfully!`);
  console.log(`📛 Name: ${cardData.name}`);
  console.log(`🖼️  Image: ${imageUrl}`);
}

processOneCard().catch(console.error);
