import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userCards } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/user-cards - Assign a card to a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, cardId } = body;

    if (!userId || !cardId) {
      return NextResponse.json(
        { error: 'userId and cardId are required' },
        { status: 400 }
      );
    }

    // Check if user already has this card
    const existing = await db
      .select()
      .from(userCards)
      .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'User already owns this card' },
        { status: 409 }
      );
    }

    // Assign the card to the user
    const [newUserCard] = await db
      .insert(userCards)
      .values({
        userId,
        cardId,
      })
      .returning();

    return NextResponse.json({ userCard: newUserCard }, { status: 201 });
  } catch (error) {
    console.error('Error assigning card to user:', error);
    return NextResponse.json(
      { error: 'Failed to assign card to user' },
      { status: 500 }
    );
  }
}

// DELETE /api/user-cards - Remove a card from a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const cardId = searchParams.get('cardId');

    if (!userId || !cardId) {
      return NextResponse.json(
        { error: 'userId and cardId are required' },
        { status: 400 }
      );
    }

    await db
      .delete(userCards)
      .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)));

    return NextResponse.json({ message: 'Card removed from user' });
  } catch (error) {
    console.error('Error removing card from user:', error);
    return NextResponse.json(
      { error: 'Failed to remove card from user' },
      { status: 500 }
    );
  }
}
