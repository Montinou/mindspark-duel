import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateBattleProblem } from '@/lib/battle-service';
import { InitiateBattleResponse } from '@/types/battle';

const initiateBattleSchema = z.object({
  playerCardId: z.string().uuid(),
  opponentCardId: z.string().uuid(),
  difficulty: z.number().min(1).max(10).default(5).optional(),
});

// POST /api/battle/initiate - Initiate battle between two cards
export async function POST(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = initiateBattleSchema.parse(body);

    const { playerCardId, opponentCardId, difficulty = 5 } = validatedData;

    console.log('⚔️  Initiating battle:', { playerCardId, opponentCardId, difficulty });

    // Fetch both cards from database
    const [playerCardDb] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, playerCardId))
      .limit(1);

    const [opponentCardDb] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, opponentCardId))
      .limit(1);

    if (!playerCardDb || !opponentCardDb) {
      return NextResponse.json(
        { error: 'One or both cards not found' },
        { status: 404 }
      );
    }

    // Convert DB types (null) to Card types (undefined)
    const playerCard = {
      ...playerCardDb,
      flavorText: playerCardDb.flavorText ?? undefined,
      effectDescription: playerCardDb.effectDescription ?? undefined,
      imageUrl: playerCardDb.imageUrl ?? undefined,
      imagePrompt: playerCardDb.imagePrompt ?? undefined,
      theme: playerCardDb.theme ?? undefined,
      tags: playerCardDb.tags ?? undefined,
      problemHints: playerCardDb.problemHints ?? undefined,
      batchId: playerCardDb.batchId ?? undefined,
      batchOrder: playerCardDb.batchOrder ?? undefined,
      createdById: playerCardDb.createdById ?? undefined,
    };

    const opponentCard = {
      ...opponentCardDb,
      flavorText: opponentCardDb.flavorText ?? undefined,
      effectDescription: opponentCardDb.effectDescription ?? undefined,
      imageUrl: opponentCardDb.imageUrl ?? undefined,
      imagePrompt: opponentCardDb.imagePrompt ?? undefined,
      theme: opponentCardDb.theme ?? undefined,
      tags: opponentCardDb.tags ?? undefined,
      problemHints: opponentCardDb.problemHints ?? undefined,
      batchId: opponentCardDb.batchId ?? undefined,
      batchOrder: opponentCardDb.batchOrder ?? undefined,
      createdById: opponentCardDb.createdById ?? undefined,
    };

    // Generate problems for both cards in parallel
    console.log('🧮 Generating dual problems for battle...');

    const [playerProblem, opponentProblem] = await Promise.all([
      generateBattleProblem(playerCard, user.id, difficulty),
      generateBattleProblem(opponentCard, user.id, difficulty),
    ]);

    console.log('✅ Battle initiated successfully');

    // Create battle ID for tracking
    const battleId = crypto.randomUUID();

    const response: InitiateBattleResponse = {
      battleId,
      playerProblem,
      opponentProblem,
      playerCard,
      opponentCard,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error initiating battle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
