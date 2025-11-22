import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateProblemForCard } from '@/lib/ai/problem-generator';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/problems - Generate a problem dynamically for a card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId } = body;

    if (!cardId) {
      return NextResponse.json(
        { error: 'cardId is required' },
        { status: 400 }
      );
    }

    // Validate cardId is a valid UUID
    const idSchema = z.string().uuid();
    const result = idSchema.safeParse(cardId);

    if (!result.success) {
      console.warn(`Invalid cardId format: ${cardId}. Skipping DB lookup.`);
      return NextResponse.json(
        { error: 'Invalid cardId format. Expected UUID.' },
        { status: 400 }
      );
    }

    // Fetch card from database
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Generate problem dynamically
    const problem = await generateProblemForCard({
      id: card.id,
      name: card.name,
      description: card.description,
      flavorText: card.flavorText || undefined,
      effectDescription: card.effectDescription || undefined,
      cost: card.cost,
      power: card.power,
      defense: card.defense,
      element: card.element,
      problemCategory: card.problemCategory,
      imageUrl: card.imageUrl || undefined,
      imagePrompt: card.imagePrompt || undefined,
      theme: card.theme || undefined,
      tags: (card.tags as string[]) || undefined,
      batchId: card.batchId || undefined,
      batchOrder: card.batchOrder || undefined,
      createdById: card.createdById || undefined,
      createdAt: card.createdAt,
    });

    return NextResponse.json({
      problem,
      card: {
        id: card.id,
        name: card.name,
        theme: card.theme,
      },
    });
  } catch (error) {
    console.error('Error generating problem:', error);
    return NextResponse.json(
      { error: 'Failed to generate problem', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
