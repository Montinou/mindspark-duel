import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards, userCards } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/cards - Get all cards or cards for specific user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Get cards owned by specific user
      const userCardsData = await db
        .select({
          id: cards.id,
          name: cards.name,
          description: cards.description,
          cost: cards.cost,
          power: cards.power,
          defense: cards.defense,
          element: cards.element,
          problemCategory: cards.problemCategory,
          imageUrl: cards.imageUrl,
          acquiredAt: userCards.acquiredAt,
        })
        .from(cards)
        .innerJoin(userCards, eq(cards.id, userCards.cardId))
        .where(eq(userCards.userId, userId));

      return NextResponse.json({ cards: userCardsData });
    }

    // Get all cards
    const allCards = await db.select().from(cards);
    return NextResponse.json({ cards: allCards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}

// POST /api/cards - Create a new card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, description, cost, power, defense, element, problemCategory, imageUrl, createdById } = body;

    // Validate required fields
    if (!name || !description || cost === undefined || power === undefined || defense === undefined || !element || !problemCategory) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate ranges
    if (cost < 1 || cost > 10 || power < 1 || power > 10 || defense < 1 || defense > 10) {
      return NextResponse.json(
        { error: 'Cost, power, and defense must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Create the card
    const [newCard] = await db
      .insert(cards)
      .values({
        name,
        description,
        cost,
        power,
        defense,
        element,
        problemCategory,
        imageUrl,
        createdById: createdById || null,
      })
      .returning();

    return NextResponse.json({ card: newCard }, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    );
  }
}
