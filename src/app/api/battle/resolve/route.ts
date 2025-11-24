import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { resolveBattle } from '@/lib/battle-service';
import { BattleProblem } from '@/types/battle';
import { ResolveBattleResponse } from '@/types/battle';

const resolveBattleSchema = z.object({
  battleId: z.string().uuid(),
  playerCardId: z.string().uuid(),
  opponentCardId: z.string().uuid(),
  playerProblem: z.object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
    category: z.enum(['Math', 'Logic', 'Science']),
    difficulty: z.number(),
    cardId: z.string(),
    cardName: z.string(),
    cardElement: z.enum(['Fire', 'Water', 'Earth', 'Air']),
    cardTags: z.array(z.string()).optional(),
    createdAt: z.coerce.date(),
  }),
  opponentProblem: z.object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
    category: z.enum(['Math', 'Logic', 'Science']),
    difficulty: z.number(),
    cardId: z.string(),
    cardName: z.string(),
    cardElement: z.enum(['Fire', 'Water', 'Earth', 'Air']),
    cardTags: z.array(z.string()).optional(),
    createdAt: z.coerce.date(),
  }),
  playerAnswer: z.string(),
  opponentAnswer: z.string().optional(), // Optional for AI opponent
  playerHealth: z.number().default(100),
  opponentHealth: z.number().default(100),
});

// POST /api/battle/resolve - Resolve battle based on both players' answers
export async function POST(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = resolveBattleSchema.parse(body);

    const {
      battleId,
      playerCardId,
      opponentCardId,
      playerProblem,
      opponentProblem,
      playerAnswer,
      opponentAnswer,
      playerHealth,
      opponentHealth,
    } = validatedData;

    console.log('⚔️  Resolving battle:', battleId);

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
      batchId: opponentCardDb.batchId ?? undefined,
      batchOrder: opponentCardDb.batchOrder ?? undefined,
      createdById: opponentCardDb.createdById ?? undefined,
    };

    // Generate AI answer if opponent answer not provided
    const finalOpponentAnswer = opponentAnswer || generateAIAnswer(opponentProblem as BattleProblem);

    // Resolve battle using battle service
    const battleResult = resolveBattle(
      playerCard,
      opponentCard,
      playerProblem as BattleProblem,
      opponentProblem as BattleProblem,
      playerAnswer,
      finalOpponentAnswer
    );

    // Calculate remaining health
    const playerHealthRemaining = Math.max(0, playerHealth - battleResult.playerDamage);
    const opponentHealthRemaining = Math.max(0, opponentHealth - battleResult.opponentDamage);

    console.log('✅ Battle resolved:', {
      winner: battleResult.winner,
      playerHealthRemaining,
      opponentHealthRemaining,
    });

    const response: ResolveBattleResponse = {
      battleId,
      playerResult: battleResult.playerResult,
      opponentResult: battleResult.opponentResult,
      winner: battleResult.winner,
      playerDamage: battleResult.playerDamage,
      opponentDamage: battleResult.opponentDamage,
      playerHealthRemaining,
      opponentHealthRemaining,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error resolving battle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Generate AI answer for opponent (simplified - can be improved with ML)
 * For now, AI has a difficulty-based chance of getting the answer correct
 */
function generateAIAnswer(problem: BattleProblem): string {
  // AI accuracy based on problem difficulty (higher difficulty = lower AI accuracy)
  const aiAccuracy = Math.max(0.3, 1 - problem.difficulty / 15);
  const answersCorrectly = Math.random() < aiAccuracy;

  if (answersCorrectly) {
    return problem.answer;
  } else {
    // Generate plausible wrong answer
    return problem.answer + ' (incorrect)';
  }
}
