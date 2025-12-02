/**
 * POST /api/game/action
 *
 * Execute a game action (play card, attack, etc.)
 * - Validates user authentication and game ownership
 * - Loads Turn Manager for the game
 * - Executes the requested action
 * - Returns updated game state
 */

import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import { db } from '@/db';
import { gameSessions, cards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TurnManager, ExtendedGameState } from '@/lib/game/turn-manager';
import {
  loadTurnManagerFromDB,
  saveTurnManagerToDB,
  checkGameEnd,
  endGame,
} from '@/lib/game/game-state-persistence';
import { GameActionType } from '@/types/game';
import { z } from 'zod';
import { trackEvent } from '@/lib/gamification/tracker';

const actionSchema = z.object({
  gameId: z.string().uuid(),
  action: z.object({
    type: z.enum(['play_card', 'attack', 'end_phase', 'pass_turn']),
    data: z.record(z.string(), z.any()).optional().default({}),
  }),
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
    const { gameId, action } = actionSchema.parse(body);

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

    // 7. Execute action
    const result = await turnManager.executeAction({
      type: action.type as GameActionType,
      playerId: user.id,
      timestamp: new Date(),
      data: action.data,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || result.message },
        { status: 400 }
      );
    }

    // Track card played event for gamification
    if (action.type === 'play_card' && action.data?.cardId) {
      const [cardData] = await db
        .select()
        .from(cards)
        .where(eq(cards.id, action.data.cardId))
        .limit(1);

      if (cardData) {
        await trackEvent(user.id, {
          type: 'CARD_PLAYED',
          element: cardData.element,
          cost: cardData.cost,
          rarity: cardData.rarity,
        });
      }
    }

    // 8. Save updated state to database
    await saveTurnManagerToDB(turnManager);

    // 9. Check if game has ended (player HP <= 0)
    const gameState = turnManager.getState();
    const gameEndCheck = checkGameEnd(gameState);

    if (gameEndCheck.isEnded) {
      // Determine winner ID
      let winnerId: string | null = null;
      if (gameEndCheck.winner === 'player') {
        winnerId = gameSession.playerId;
      } else if (gameEndCheck.winner === 'opponent' && gameSession.enemyId) {
        winnerId = gameSession.enemyId;
      }

      await endGame(gameId, winnerId);

      // Track game end event for gamification
      const isPlayerWinner = gameEndCheck.winner === 'player';
      await trackEvent(user.id, {
        type: isPlayerWinner ? 'GAME_WON' : 'GAME_LOST',
        turns: gameState.turnNumber,
        cardsPlayed: 0, // TODO: track actual cards played during game
        problemsSolved: 0, // TODO: track actual problems solved during game
      });
    }

    console.log(`⚡ Action executed: ${action.type}`);
    console.log(`📍 Current phase: ${gameState.currentPhase}`);
    console.log(`🎮 Turn: ${gameState.turnNumber}`);

    return NextResponse.json({
      success: true,
      result: {
        message: result.message,
      },
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
    console.error('Error executing action:', error);

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
