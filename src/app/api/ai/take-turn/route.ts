/**
 * POST /api/ai/take-turn
 *
 * Trigger AI opponent to take its turn
 * - Verifies it's AI's turn
 * - Executes AI turn (play cards, attack, end turn)
 * - Returns updated game state
 */

import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import { db } from '@/db';
import { gameSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { loadTurnManagerFromDB, checkGameEnd, endGame } from '@/lib/game/game-state-persistence';
import { AIOpponent } from '@/lib/ai/ai-opponent';
import { z } from 'zod';

const takeTurnSchema = z.object({
  gameId: z.string().uuid(),
  difficulty: z.enum(['easy', 'normal', 'hard']).optional().default('normal'),
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
    const { gameId, difficulty } = takeTurnSchema.parse(body);

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

    // 6. Load Turn Manager to verify it's AI's turn
    const turnManager = await loadTurnManagerFromDB(gameId);
    const stateBefore = turnManager.getState();

    if (stateBefore.activePlayer !== 'opponent') {
      return NextResponse.json(
        { error: `Not AI's turn (active player: ${stateBefore.activePlayer})` },
        { status: 400 }
      );
    }

    console.log(`🤖 AI taking turn for game ${gameId} (difficulty: ${difficulty})`);

    // 7. Execute AI turn
    const aiOpponent = new AIOpponent(gameId, difficulty);
    await aiOpponent.takeTurn();

    // 8. Check if game has ended after AI turn
    const turnManagerAfter = await loadTurnManagerFromDB(gameId);
    const gameState = turnManagerAfter.getState();
    const gameEndCheck = checkGameEnd(gameState);

    if (gameEndCheck.isEnded) {
      let winnerId: string | null = null;
      if (gameEndCheck.winner === 'player') {
        winnerId = gameSession.playerId;
      } else if (gameEndCheck.winner === 'opponent' && gameSession.enemyId) {
        winnerId = gameSession.enemyId;
      }

      await endGame(gameId, winnerId);
      console.log(`🏁 Game ended! Winner: ${gameEndCheck.winner}`);
    }

    console.log(`✅ AI turn complete. Turn: ${gameState.turnNumber}, Active: ${gameState.activePlayer}`);

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
    console.error('Error executing AI turn:', error);

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
