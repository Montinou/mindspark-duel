import { NextRequest, NextResponse } from 'next/server';
import { generateCardBatch } from '@/lib/ai/batch-card-generator';

// POST /api/cards/batch - Generate a batch of thematic cards
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { batchName, theme, themeDescription, count, difficulty, userId } = body;

    // Validate required fields
    if (!batchName || !theme || !themeDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: batchName, theme, themeDescription' },
        { status: 400 }
      );
    }

    // Validate count
    const cardCount = count || 10;
    if (cardCount < 1 || cardCount > 20) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 20' },
        { status: 400 }
      );
    }

    console.log(`🎨 Starting batch generation: "${batchName}"`);
    console.log(`   Theme: ${theme}`);
    console.log(`   Count: ${cardCount} cards`);

    // Generate the batch
    const result = await generateCardBatch({
      batchName,
      theme,
      themeDescription,
      count: cardCount,
      difficulty,
      userId,
    });

    return NextResponse.json(
      {
        message: 'Batch generated successfully',
        batch: result.batch,
        cards: result.cards,
        count: result.cards.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating card batch:', error);
    return NextResponse.json(
      { error: 'Failed to generate card batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET /api/cards/batch?batchId=xxx - Get cards from a specific batch
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId parameter is required' },
        { status: 400 }
      );
    }

    const { db } = await import('@/db');
    const { cards, cardBatches } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    // Get batch info
    const [batch] = await db
      .select()
      .from(cardBatches)
      .where(eq(cardBatches.id, batchId))
      .limit(1);

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Get cards from batch
    const batchCards = await db
      .select()
      .from(cards)
      .where(eq(cards.batchId, batchId))
      .orderBy(cards.batchOrder);

    return NextResponse.json({
      batch,
      cards: batchCards,
      count: batchCards.length,
    });
  } catch (error) {
    console.error('Error fetching batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    );
  }
}
