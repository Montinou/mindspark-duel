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
import { gameSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TurnManager, ExtendedGameState } from '@/lib/game/turn-manager';
import { GameActionType } from '@/types/game';
import { z } from 'zod';

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

    // 6. Load Turn Manager state
    // NOTE: In production, this should load from database
    // For now, we'll need to reconstruct the state
    // This is a simplified version - full implementation in step 7 (persistence)

    // TODO: Load full game state from database once persistence is implemented
    // For now, return error indicating state persistence is needed
    return NextResponse.json(
      {
        error: 'State persistence not yet implemented',
        message: 'Please complete step 7 (database persistence) first',
      },
      { status: 501 }
    );

    // This code will be uncommented after step 7:
    /*
    const turnManager = loadTurnManagerFromDB(gameId);

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

    // 8. Save updated state to database
    await saveTurnManagerToDB(turnManager);

    // 9. Update turn count
    await db
      .update(gameSessions)
      .set({ turnsCount: turnManager.getState().turnNumber })
      .where(eq(gameSessions.id, gameId));

    // 10. Get updated game state
    const gameState = turnManager.getState();

    console.log(`⚡ Action executed: ${action.type}`);
    console.log(`📍 Current phase: ${gameState.currentPhase}`);
    console.log(`🎮 Turn: ${gameState.turnNumber}`);

    return NextResponse.json({
      success: true,
      result: {
        message: result.message,
      },
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
    */
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
