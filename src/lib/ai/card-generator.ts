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
    throw new Error("GEMINIAI_API_KEY is not set");
  }

  console.log('🖼️  Generating image with Gemini...');
  const apiUrl = `${BASE_URL}/${IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          temperature: 1.0,
          topP: 0.95,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Extract base64 image from response
    // The structure for image response in Gemini API:
    // candidates[0].content.parts[0].inlineData.data (base64)
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error("No image data found in Gemini response");
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const fileName = `cards/${crypto.randomUUID()}.png`;
    
    // Upload to R2
    const imageUrl = await uploadImage(buffer, fileName, 'image/png');
    console.log('✅ Image generated and uploaded with Gemini:', imageUrl);
    return imageUrl;

  } catch (error) {
    console.error("Failed to generate/upload image with Gemini:", error);
    throw error;
  }
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

  try {
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

    // 2. Generate Image using Gemini
    let imageUrl = "/placeholder.png";
    try {
      imageUrl = await generateImageWithGemini(cardData.imagePrompt);
    } catch (imgError) {
      console.error("Failed to generate image, using placeholder:", imgError);
    }
    
    // 3. Save card to database
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
        createdById: userId || null,
      })
      .returning();

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
      imageUrl: savedCard.imageUrl || "/placeholder.png"
    };

  } catch (error) {
    console.error("Failed to generate card:", error);

    // Create fallback card in database
    try {
      const [fallbackCard] = await db
        .insert(cards)
        .values({
          name: "Glitch in the Matrix",
          description: "The spell fizzled due to magical interference (API Error).",
          cost: 1,
          power: 1,
          defense: 1,
          element: "Earth",
          problemCategory: "Logic",
          imageUrl: "/placeholder.png",
          createdById: userId || null,
        })
        .returning();

      return {
        id: fallbackCard.id,
        name: fallbackCard.name,
        description: fallbackCard.description,
        cost: fallbackCard.cost,
        power: fallbackCard.power,
        defense: fallbackCard.defense,
        element: fallbackCard.element,
        problemCategory: fallbackCard.problemCategory,
        imageUrl: fallbackCard.imageUrl || "/placeholder.png"
      };
    } catch (dbError) {
      console.error("Failed to create fallback card in database:", dbError);
      // Last resort: return card without database persistence
      return {
        id: crypto.randomUUID(),
        name: "Glitch in the Matrix",
        description: "The spell fizzled due to magical interference (API Error).",
        cost: 1,
        power: 1,
        defense: 1,
        element: "Earth",
        problemCategory: "Logic",
        imageUrl: "/placeholder.png"
      };
    }
  }
}
