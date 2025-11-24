'use server';

import { Card } from '@/types/game';
import { uploadImage } from '../storage';
import { db } from '@/db';
import { cards } from '@/db/schema';

// Workers AI endpoints
const WORKERS_TEXT_URL = process.env.WORKERS_AI_TEXT_URL || 'https://mindspark-ai-text-generator.agusmontoya.workers.dev';
const WORKERS_IMAGE_URL = process.env.WORKERS_AI_IMAGE_URL || 'https://mindspark-ai-image-generator.agusmontoya.workers.dev';
const WORKERS_PROBLEM_URL = process.env.WORKERS_AI_PROBLEM_URL || 'https://mindspark-ai-problem-generator.agusmontoya.workers.dev';

export interface GenerateCardOptions {
  topic?: string;
  theme?: string;
  difficulty?: number;
  element?: "Fire" | "Water" | "Earth" | "Air";
  userId?: string;
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
}

interface ProblemResponse {
  question: string;
  answer: string;
  category: "Math" | "Logic" | "Science";
}

export async function generateImageWithWorkersAI(prompt: string): Promise<string> {
  console.log('🖼️  Generating image with Cloudflare Workers AI (Flux 1 Schnell)...');
  console.log('📝 Prompt:', prompt.substring(0, 150) + '...');

  const response = await fetch(WORKERS_IMAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
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

async function generateProblem(
  category: "Math" | "Logic" | "Science",
  difficulty: number,
  theme?: string
): Promise<ProblemResponse> {
  console.log('🧮 Generating educational problem with Workers AI...');

  const response = await fetch(WORKERS_PROBLEM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category,
      difficulty,
      theme
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Workers AI Problem Error:', errorText);
    throw new Error(`Workers AI Problem Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.success || !data.data) {
    console.error('❌ Invalid response from Workers AI Problem:', data);
    throw new Error("No problem data found in Workers AI response");
  }

  console.log('✅ Problem generated:', data.data.question.substring(0, 50) + '...');

  return data.data;
}

export async function generateCard(options: GenerateCardOptions): Promise<Card> {
  const { theme, userId } = options;

  console.log('🎴 Starting card generation with Workers AI...');

  // 1. Generate card data (name, stats, imagePrompt) - Workers AI
  const cardData = await generateCardData(options);

  // 2. Generate educational problem - Workers AI
  const themeText = theme || options.topic || "Fantasy";
  const problemData = await generateProblem(
    cardData.problemCategory,
    options.difficulty || 5,
    themeText
  );

  // 3. Generate image - Workers AI (Flux Schnell)
  console.log('🎨 Starting image generation for card:', cardData.name);
  const imageUrl = await generateImageWithWorkersAI(cardData.imagePrompt);

  // 4. Save card to database
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
      tags: cardData.tags,
      createdById: userId || null,
    })
    .returning();

  console.log('✅ Card successfully created:', savedCard.id);

  // 5. Return card with database ID
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
