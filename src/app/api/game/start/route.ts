/**
 * POST /api/game/start
 *
 * Initialize a new game session
 * - Creates game session in database
 * - Initializes Turn Manager
 * - Draws starting hands (5 cards each)
 * - Sets initial mana (0/0, will be 1/1 after first turn starts)
 * - Returns initial game state
 */

import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import { db } from '@/db';
import { gameSessions, cards, userCards } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTurnManager } from '@/lib/game/turn-manager';
import { saveTurnManagerToDB } from '@/lib/game/game-state-persistence';
import { Card } from '@/types/game';
import { z } from 'zod';
import { trackEvent } from '@/lib/gamification/tracker';

const startGameSchema = z.object({
  deckId: z.string().uuid().optional(), // Optional: specific deck to use
  opponentType: z.enum(['ai', 'human']).default('ai'), // For now, only AI opponents
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
    const { deckId, opponentType } = startGameSchema.parse(body);

    // 3. Get player's cards (simplified: get all user's cards for now)
    // In production, this should use the specific deckId if provided
    const userCardsData = await db
      .select({
        card: cards,
      })
      .from(userCards)
      .innerJoin(cards, eq(userCards.cardId, cards.id))
      .where(eq(userCards.userId, user.id))
      .limit(30); // Max deck size

    if (userCardsData.length < 20) {
      return NextResponse.json(
        {
          error: 'Not enough cards in collection',
          message: 'You need at least 20 cards to start a game',
        },
        { status: 400 }
      );
    }

    // Convert to Card[] format
    const playerDeck: Card[] = userCardsData.map((item) => ({
      id: item.card.id,
      name: item.card.name,
      description: item.card.description,
      flavorText: item.card.flavorText || undefined,
      effectDescription: item.card.effectDescription || undefined,
      cost: item.card.cost,
      power: item.card.power,
      defense: item.card.defense,
      element: item.card.element,
      problemCategory: item.card.problemCategory,
      imageUrl: item.card.imageUrl || undefined,
      imagePrompt: item.card.imagePrompt || undefined,
      theme: item.card.theme || undefined,
      tags: item.card.tags || undefined,
      batchId: item.card.batchId || undefined,
      batchOrder: item.card.batchOrder || undefined,
      createdById: item.card.createdById || undefined,
      createdAt: item.card.createdAt || undefined,
    }));

    // 4. Get opponent deck (for AI, use same deck for simplicity)
    // In production, AI should have its own deck
    const opponentDeck: Card[] = [...playerDeck]; // Clone player deck

    // 5. Create game session in database
    const [gameSession] = await db
      .insert(gameSessions)
      .values({
        playerId: user.id,
        enemyId: null, // AI opponent
        isAiOpponent: true,
        turnsCount: 0,
      })
      .returning();

    // 6. Initialize Turn Manager
    const turnManager = createTurnManager(
      gameSession.id,
      playerDeck.slice(0, 25), // Use 25 cards for game
      opponentDeck.slice(0, 25)
    );

    // 7. Start first turn (this will draw starting hands and set initial state)
    await turnManager.startTurn();

    // 8. Save initial state to database
    await saveTurnManagerToDB(turnManager);

    // 9. Get game state
    const gameState = turnManager.getState();

    console.log(`🎮 Game started: ${gameSession.id}`);
    console.log(`👤 Player: ${user.id}`);
    console.log(`🤖 Opponent: AI`);
    console.log(`🃏 Player hand: ${gameState.playerHand.length} cards`);
    console.log(`🃏 Opponent hand: ${gameState.opponentHand.length} cards`);

    // Track game start event for gamification
    await trackEvent(user.id, { type: 'GAME_STARTED' });

    return NextResponse.json({
      success: true,
      gameId: gameSession.id,
      state: {
        // Return turn state only (not full extended state for security)
        turnNumber: gameState.turnNumber,
        activePlayer: gameState.activePlayer,
        currentPhase: gameState.currentPhase,
        playerMana: gameState.playerMana,
        playerMaxMana: gameState.playerMaxMana,
        playerHealth: gameState.playerHealth,
        playerHandSize: gameState.playerHand.length,
        playerDeckSize: gameState.playerDeckState.cards.length,
        playerBoardSize: gameState.playerBoard.length,
        // Don't reveal opponent's hand for security
        opponentHealth: gameState.opponentHealth,
        opponentHandSize: gameState.opponentHand.length,
        opponentDeckSize: gameState.opponentDeckState.cards.length,
        opponentBoardSize: gameState.opponentBoard.length,
      },
      // Return player's visible information
      playerHand: gameState.playerHand,
      playerBoard: gameState.playerBoard,
      opponentBoard: gameState.opponentBoard, // Opponent board is visible
    });
  } catch (error) {
    console.error('Error starting game:', error);

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
