'use server';

import { Card } from '@/types/game';
import { uploadImage } from '../storage';
import { db } from '@/db';
import { cards } from '@/db/schema';

const GEMINI_API_KEY = process.env.GEMINIAI_API_KEY;
// Use gemini-2.0-flash-exp for image generation capabilities
const TEXT_MODEL = "gemini-2.0-flash-exp"; 
const IMAGE_MODEL = "gemini-2.0-flash-exp";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GenerateCardOptions {
  topic?: string;
  theme?: string;
  difficulty?: number;
  element?: "Fire" | "Water" | "Earth" | "Air";
  userId?: string;
}

export async function generateImageWithGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("❌ CRITICAL: GEMINIAI_API_KEY is not set");
  }

  console.log('🖼️  Generating image with Imagen 3 via Gemini API...');
  console.log('📝 Prompt:', prompt.substring(0, 150) + '...');

  // Use the correct Imagen 3 endpoint
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImage?key=${GEMINI_API_KEY}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      number_of_images: 1,
      aspect_ratio: "3:4", // Portrait orientation for cards
      safety_filter_level: "block_only_high",
      person_generation: "allow_adult"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Imagen API Error Response:', errorText);
    throw new Error(`Imagen API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('📦 Imagen API Response structure:', Object.keys(data));

  // Extract the generated image
  // The response structure: { generatedImages: [{ bytesBase64Encoded: "..." }] }
  const imageData = data.generatedImages?.[0]?.bytesBase64Encoded;

  if (!imageData) {
    console.error('❌ Imagen API Full Response:', JSON.stringify(data, null, 2));
    throw new Error("No image data found in Imagen response. Check response structure above.");
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(imageData, 'base64');
  const fileName = `cards/${crypto.randomUUID()}.png`;

  console.log('☁️  Uploading to Cloudflare R2:', fileName);

  // Upload to Cloudflare R2 - NO FALLBACK
  const imageUrl = await uploadImage(buffer, fileName, 'image/png');

  console.log('✅ SUCCESS: Image generated with Imagen 3 and uploaded to R2');
  console.log('🔗 URL:', imageUrl);

  return imageUrl;
}

export async function generateCard(options: GenerateCardOptions): Promise<Card> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINIAI_API_KEY is not set");
  }

  const { topic, theme, difficulty = 5, element, userId } = options;
  const themeText = theme || topic || "Fantasy";
  const elementInstruction = element ? `The card MUST belong to the element: "${element}".` : "Choose a suitable element (Fire, Water, Earth, Air).";

  const prompt = `
    Create a unique, creative trading card for a game called "MindSpark Duel".
    The card should be based on the theme/topic: "${themeText}".
    ${elementInstruction}
    The difficulty level for the educational problem is: ${difficulty} (1-10).

    Return ONLY a valid JSON object with this structure:
    {
      "name": "Card Name",
      "description": "Flavor text or effect description",
      "cost": integer (1-10),
      "power": integer (1-10),
      "defense": integer (1-10),
      "element": "Fire" | "Water" | "Earth" | "Air",
      "problemCategory": "Math" | "Logic" | "Science",
      "imagePrompt": "OPTIMIZED FULL ART PROMPT - [Detailed subject description matching card name]. Vertical portrait orientation, full-bleed borderless composition extending to all edges. Magic the Gathering full art card style. High-resolution digital painting with dramatic cinematic lighting, vibrant saturated colors, intricate details, sharp focus. The subject fills the frame dramatically with immersive environment surrounding it. Professional TCG artwork quality, masterpiece, highly detailed, rich textures. NO text, NO watermarks, NO borders, NO frames. Theme: ${themeText}"
    }

    CRITICAL INSTRUCTIONS:
    - Stats must be balanced for cost (cost ≈ (power + defense) / 2)
    - Name should be fantasy-themed but related to "${themeText}"
    - Description (flavor text) must be evocative and match the visual
    - Name and Description MUST be in SPANISH
    - imagePrompt must describe a FULL-BLEED composition (art extends to all edges, NO reserved space)
    - imagePrompt should include subject, environment, lighting, mood, and artistic style
  `;

  // 1. Generate Card Data
  const apiUrl = `${BASE_URL}/${TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;

  // Clean up markdown code blocks if present
  const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

  const cardData = JSON.parse(jsonString);

  // 2. Generate Image using Imagen 3 - NO FALLBACK, FAIL FAST
  console.log('🎨 Starting image generation for card:', cardData.name);
  const imageUrl = await generateImageWithGemini(cardData.imagePrompt);

  // 3. Save card to database
  console.log('💾 Saving card to database:', cardData.name);
  const [savedCard] = await db
    .insert(cards)
    .values({
      name: cardData.name,
      description: cardData.description,
      cost: cardData.cost,
      power: cardData.power,
      defense: cardData.defense,
      element: cardData.element,
      problemCategory: cardData.problemCategory,
      imageUrl: imageUrl,
      imagePrompt: cardData.imagePrompt,
      createdById: userId || null,
    })
    .returning();

  console.log('✅ Card successfully created:', savedCard.id);

  // 4. Return card with database ID
  return {
    id: savedCard.id,
    name: savedCard.name,
    description: savedCard.description,
    cost: savedCard.cost,
    power: savedCard.power,
    defense: savedCard.defense,
    element: savedCard.element,
    problemCategory: savedCard.problemCategory,
    imageUrl: savedCard.imageUrl!,
    imagePrompt: cardData.imagePrompt
  };
}
