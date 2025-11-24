/**
 * POST /api/game/advance-phase
 *
 * Advance to the next phase in the turn sequence
 * - Loads game state from database
 * - Advances phase (start -> main -> combat -> end)
 * - If ending End Phase, passes turn to opponent
 * - Returns updated game state
 */

import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import { db } from '@/db';
import { gameSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  loadTurnManagerFromDB,
  saveTurnManagerToDB,
  checkGameEnd,
  endGame,
} from '@/lib/game/game-state-persistence';
import { z } from 'zod';

const advancePhaseSchema = z.object({
  gameId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { gameId } = advancePhaseSchema.parse(body);

    // 3. Load game session from database
    const [gameSession] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, gameId))
      .limit(1);

    if (!gameSession) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // 4. Verify user owns this game
    if (gameSession.playerId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - not your game' },
        { status: 403 }
      );
    }

    // 5. Check if game is still active
    if (gameSession.endedAt) {
      return NextResponse.json(
        { error: 'Game has ended' },
        { status: 400 }
      );
    }

    // 6. Load Turn Manager state from database
    const turnManager = await loadTurnManagerFromDB(gameId);

    // 7. Advance phase
    await turnManager.advancePhase();

    // 8. Save updated state to database
    await saveTurnManagerToDB(turnManager);

    // 9. Check if game has ended
    const gameState = turnManager.getState();
    const gameEndCheck = checkGameEnd(gameState);

    if (gameEndCheck.isEnded) {
      let winnerId: string | null = null;
      if (gameEndCheck.winner === 'player') {
        winnerId = gameSession.playerId;
      } else if (gameEndCheck.winner === 'opponent' && gameSession.enemyId) {
        winnerId = gameSession.enemyId;
      }

      await endGame(gameId, winnerId);
    }

    console.log(`📍 Phase advanced to: ${gameState.currentPhase}`);
    console.log(`🎮 Turn: ${gameState.turnNumber}`);
    console.log(`👤 Active player: ${gameState.activePlayer}`);

    return NextResponse.json({
      success: true,
      gameEnded: gameEndCheck.isEnded,
      winner: gameEndCheck.winner,
      state: {
        turnNumber: gameState.turnNumber,
        activePlayer: gameState.activePlayer,
        currentPhase: gameState.currentPhase,
        playerMana: gameState.playerMana,
        playerMaxMana: gameState.playerMaxMana,
        playerHealth: gameState.playerHealth,
        playerHandSize: gameState.playerHand.length,
        playerDeckSize: gameState.playerDeckState.cards.length,
        playerBoardSize: gameState.playerBoard.length,
        opponentHealth: gameState.opponentHealth,
        opponentHandSize: gameState.opponentHand.length,
        opponentDeckSize: gameState.opponentDeckState.cards.length,
        opponentBoardSize: gameState.opponentBoard.length,
      },
      playerHand: gameState.playerHand,
      playerBoard: gameState.playerBoard,
      opponentBoard: gameState.opponentBoard,
    });
  } catch (error) {
    console.error('Error advancing phase:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
