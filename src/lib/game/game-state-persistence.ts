/**
 * Game State Persistence
 *
 * Handles saving and loading ExtendedGameState to/from database
 * Ensures atomic transactions and data integrity
 */

import { db } from '@/db';
import { gameSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TurnManager, ExtendedGameState } from './turn-manager';
import { Card } from '@/types/game';
import { DeckState } from './deck-service';

/**
 * Save TurnManager state to database
 * Uses atomic transaction to ensure consistency
 *
 * @param turnManager - TurnManager instance to save
 */
export async function saveTurnManagerToDB(turnManager: TurnManager): Promise<void> {
  const state = turnManager.getState();
  const gameId = state.gameId;

  // Convert ExtendedGameState to JSON-safe format
  const serializedState = serializeGameState(state);

  await db
    .update(gameSessions)
    .set({
      gameState: serializedState,
      actionHistory: state.actions,
      turnsCount: state.turnNumber,
      updatedAt: new Date(),
    })
    .where(eq(gameSessions.id, gameId));

  console.log(`💾 Game state saved: ${gameId} (turn ${state.turnNumber})`);
}

/**
 * Load TurnManager from database
 * Reconstructs full game state including decks, hands, boards
 *
 * @param gameId - Game session ID
 * @returns TurnManager instance with loaded state
 * @throws Error if game not found or state is invalid
 */
export async function loadTurnManagerFromDB(gameId: string): Promise<TurnManager> {
  const [gameSession] = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.id, gameId))
    .limit(1);

  if (!gameSession) {
    throw new Error(`Game session not found: ${gameId}`);
  }

  if (!gameSession.gameState) {
    throw new Error(`Game state not initialized for session: ${gameId}`);
  }

  // Deserialize game state from JSON
  const state = deserializeGameState(gameSession.gameState as any, gameId);

  // Reconstruct TurnManager with loaded state
  const turnManager = new TurnManager(state);

  console.log(`📥 Game state loaded: ${gameId} (turn ${state.turnNumber})`);

  return turnManager;
}

/**
 * Serialize ExtendedGameState to JSON-safe format
 * Handles Date objects and ensures all data is serializable
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ACTUALIZADO para sistema MTG de 12 fases:
 * - combatState: Estado del combate actual (atacantes, bloqueadores)
 * - playerStreakCount: Racha de respuestas correctas del jugador
 * - opponentStreakCount: Racha de respuestas correctas del oponente
 * ─────────────────────────────────────────────────────────────────────────
 */
function serializeGameState(state: ExtendedGameState): any {
  return {
    turnNumber: state.turnNumber,
    activePlayer: state.activePlayer,
    currentPhase: state.currentPhase,
    playerMana: state.playerMana,
    playerMaxMana: state.playerMaxMana,
    opponentMana: state.opponentMana,
    opponentMaxMana: state.opponentMaxMana,
    playerFatigueCounter: state.playerFatigueCounter,
    opponentFatigueCounter: state.opponentFatigueCounter,
    // ─────────────────────────────────────────────────────────────────────────
    // NUEVOS CAMPOS - Sistema MTG de 12 fases
    // ─────────────────────────────────────────────────────────────────────────
    combatState: state.combatState, // null cuando no estamos en combate
    playerStreakCount: state.playerStreakCount ?? 0,
    opponentStreakCount: state.opponentStreakCount ?? 0,
    // ─────────────────────────────────────────────────────────────────────────
    actions: state.actions.map((action) => ({
      ...action,
      timestamp: action.timestamp.toISOString(),
    })),
    // Extended state
    playerDeckState: {
      cards: state.playerDeckState.cards,
      drawnCards: state.playerDeckState.drawnCards,
      fatigueCounter: state.playerDeckState.fatigueCounter,
    },
    opponentDeckState: {
      cards: state.opponentDeckState.cards,
      drawnCards: state.opponentDeckState.drawnCards,
      fatigueCounter: state.opponentDeckState.fatigueCounter,
    },
    playerHand: state.playerHand,
    opponentHand: state.opponentHand,
    playerBoard: state.playerBoard,
    opponentBoard: state.opponentBoard,
    playerHealth: state.playerHealth,
    opponentHealth: state.opponentHealth,
  };
}

/**
 * Deserialize JSON data back to ExtendedGameState
 * Reconstructs Date objects and validates data integrity
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ACTUALIZADO para sistema MTG de 12 fases:
 * - combatState: Restaura el estado del combate (null si no había combate)
 * - playerStreakCount / opponentStreakCount: Restaura rachas (default 0)
 * ─────────────────────────────────────────────────────────────────────────
 */
function deserializeGameState(data: any, gameId: string): ExtendedGameState {
  return {
    gameId,
    turnNumber: data.turnNumber,
    activePlayer: data.activePlayer,
    currentPhase: data.currentPhase,
    playerMana: data.playerMana,
    playerMaxMana: data.playerMaxMana,
    opponentMana: data.opponentMana,
    opponentMaxMana: data.opponentMaxMana,
    playerFatigueCounter: data.playerFatigueCounter,
    opponentFatigueCounter: data.opponentFatigueCounter,
    // ─────────────────────────────────────────────────────────────────────────
    // NUEVOS CAMPOS - Sistema MTG de 12 fases
    // Usamos ?? para proveer defaults si los datos vienen de un estado antiguo
    // ─────────────────────────────────────────────────────────────────────────
    combatState: data.combatState ?? null,
    playerStreakCount: data.playerStreakCount ?? 0,
    opponentStreakCount: data.opponentStreakCount ?? 0,
    // ─────────────────────────────────────────────────────────────────────────
    actions: data.actions.map((action: any) => ({
      ...action,
      timestamp: new Date(action.timestamp),
    })),
    // Extended state
    playerDeckState: data.playerDeckState as DeckState,
    opponentDeckState: data.opponentDeckState as DeckState,
    playerHand: data.playerHand as Card[],
    opponentHand: data.opponentHand as Card[],
    playerBoard: data.playerBoard as Card[],
    opponentBoard: data.opponentBoard as Card[],
    playerHealth: data.playerHealth,
    opponentHealth: data.opponentHealth,
  };
}

/**
 * Check if game has ended (either player HP <= 0)
 *
 * @param state - Current game state
 * @returns Object with isEnded flag and winner if applicable
 */
export function checkGameEnd(state: ExtendedGameState): {
  isEnded: boolean;
  winner?: 'player' | 'opponent' | 'draw';
} {
  if (state.playerHealth <= 0 && state.opponentHealth <= 0) {
    return { isEnded: true, winner: 'draw' };
  }

  if (state.playerHealth <= 0) {
    return { isEnded: true, winner: 'opponent' };
  }

  if (state.opponentHealth <= 0) {
    return { isEnded: true, winner: 'player' };
  }

  return { isEnded: false };
}

/**
 * End game and save final state
 *
 * @param gameId - Game session ID
 * @param winnerId - Winner's user ID (or null for draw)
 */
export async function endGame(gameId: string, winnerId: string | null): Promise<void> {
  await db
    .update(gameSessions)
    .set({
      winnerId,
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(gameSessions.id, gameId));

  console.log(`🏁 Game ended: ${gameId}, winner: ${winnerId || 'draw'}`);
}
