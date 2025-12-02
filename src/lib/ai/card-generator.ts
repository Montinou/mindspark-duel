'use server';

import { Card } from '@/types/game';
import { uploadImage } from '../storage';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { z } from 'zod';

// ============================================
// CARD-03: Zod validation for card insert
// ============================================

const cardInsertSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long'),
  cost: z.number().int().min(1).max(10),
  power: z.number().int().min(1).max(10),
  defense: z.number().int().min(1).max(10),
  element: z.enum(['Fire', 'Water', 'Earth', 'Air']),
  problemCategory: z.enum(['Math', 'Logic', 'Science']),
  imageUrl: z.string().url().optional(),
  imagePrompt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  problemHints: z.object({
    keywords: z.array(z.string()).min(1),
    topics: z.array(z.string()).optional(),
    difficulty: z.number().min(1).max(10).optional(),
    subCategory: z.string().optional(),
    contextType: z.enum(['fantasy', 'real_world', 'abstract']).optional(),
    suggestedTopics: z.array(z.string()).optional(),
  }).optional(),
});

export type ValidatedCardInsert = z.infer<typeof cardInsertSchema>;

export async function validateCardForInsert(card: unknown) {
  return cardInsertSchema.safeParse(card);
}

// Workers AI endpoints
const WORKERS_TEXT_URL = process.env.WORKERS_AI_TEXT_URL || 'https://mindspark-ai-text-generator.agusmontoya.workers.dev';
const WORKERS_IMAGE_URL = process.env.WORKERS_AI_IMAGE_URL || 'https://mindspark-ai-image-generator.agusmontoya.workers.dev';

export interface GenerateCardOptions {
  topic?: string;
  theme?: string;
  difficulty?: number;
  element?: "Fire" | "Water" | "Earth" | "Air";
  userId?: string;
}

// Problem hints for dynamic generation at play-time
// NOTE: This should match ProblemHints in src/types/game.ts and ProblemHintsDB in src/db/schema.ts
interface ProblemHints {
  keywords: string[];
  topics: string[]; // Required topics for problem generation
  difficulty?: number;
  subCategory?: string;
  contextType?: "fantasy" | "real_world" | "abstract";
  suggestedTopics?: string[];
  examples?: string[];
}

interface CardDataResponse {
  name: string;
  description: string;
  cost: number;
  power: number;
  defense: number;
  element: "Fire" | "Water" | "Earth" | "Air";
  problemCategory: "Math" | "Logic" | "Science";
  imagePrompt: string;
  tags: string[]; // 2-4 thematic keywords from Workers AI
  problemHints: ProblemHints; // For dynamic problem generation when card is played
}

export async function generateImageWithWorkersAI(prompt: string, element?: string): Promise<string> {
  console.log('🖼️  Generating image with Cloudflare Workers AI (Flux 1 Schnell)...');
  console.log('📝 Prompt:', prompt.substring(0, 150) + '...');
  console.log('🎨 Element for color palette:', element || 'none');

  const response = await fetch(WORKERS_IMAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, element })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Workers AI Image Error:', errorText);
    throw new Error(`Workers AI Image Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.success || !data.image) {
    console.error('❌ Invalid response from Workers AI Image:', data);
    throw new Error("No image data found in Workers AI response");
  }

  console.log('✅ Image generated with Flux 1 Schnell');

  // Convert base64 to buffer
  const buffer = Buffer.from(data.image, 'base64');
  const fileName = `cards/${crypto.randomUUID()}.png`;

  console.log('☁️  Uploading to Cloudflare R2:', fileName);

  const imageUrl = await uploadImage(buffer, fileName, 'image/png');

  console.log('✅ Image uploaded to R2');
  console.log('🔗 URL:', imageUrl);

  return imageUrl;
}

async function generateCardData(options: GenerateCardOptions): Promise<CardDataResponse> {
  console.log('🤖 Generating card data with Workers AI (Llama 3.1)...');

  const { topic, theme, difficulty = 5, element } = options;

  const response = await fetch(WORKERS_TEXT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      theme,
      difficulty,
      element
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Workers AI Text Error:', errorText);
    throw new Error(`Workers AI Text Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.success || !data.data) {
    console.error('❌ Invalid response from Workers AI Text:', data);
    throw new Error("No card data found in Workers AI response");
  }

  console.log('✅ Card data generated:', data.data.name);

  return data.data;
}

export async function generateCard(options: GenerateCardOptions): Promise<Card> {
  const { userId } = options;

  console.log('🎴 Starting card generation with Workers AI...');

  // 1. Generate card data (name, stats, imagePrompt, problemHints) - Workers AI
  const cardData = await generateCardData(options);

  // 2. Generate image - Workers AI (Flux Schnell)
  console.log('🎨 Starting image generation for card:', cardData.name);
  const imageUrl = await generateImageWithWorkersAI(cardData.imagePrompt, cardData.element);

  // 3. Save card to database (with problemHints for dynamic problem generation at play-time)
  console.log('💾 Saving card to database:', cardData.name);
  console.log('💡 Problem Hints:', cardData.problemHints?.keywords?.join(', ') || 'none');

  // CARD-03 & CARD-05: Validate card data before insert
  const cardToInsert = {
    name: cardData.name,
    description: cardData.description,
    cost: cardData.cost,
    power: cardData.power,
    defense: cardData.defense,
    element: cardData.element,
    problemCategory: cardData.problemCategory,
    imageUrl: imageUrl,
    imagePrompt: cardData.imagePrompt,
    tags: cardData.tags,
    problemHints: cardData.problemHints,
  };

  const validation = await validateCardForInsert(cardToInsert);
  if (!validation.success) {
    console.warn('⚠️ Card validation failed, applying safe defaults:', validation.error.issues);
    // Apply safe defaults for invalid fields
    cardToInsert.problemHints = cardToInsert.problemHints || {
      keywords: cardToInsert.tags?.slice(0, 3) || ['fantasy'],
      topics: [],
    };
  }

  const [savedCard] = await db
    .insert(cards)
    .values({
      ...cardToInsert,
      createdById: userId || null,
    })
    .returning();

  console.log('✅ Card successfully created:', savedCard.id);

  // 4. Return card with database ID and problemHints
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
    imagePrompt: cardData.imagePrompt,
    problemHints: cardData.problemHints,
  };
}
