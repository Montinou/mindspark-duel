/**
 * useGamePhaseController Hook
 *
 * Bridge between React components and TurnManager.
 * Provides reactive state management for the MTG 12-phase system.
 *
 * Features:
 * - Wraps TurnManager for React state updates
 * - Handles automatic phase transitions (Beginning Phase)
 * - Exposes action execution with API persistence
 * - Provides phase group information for UI
 * - Records problem results for adaptive difficulty
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { TurnManager, ExtendedGameState, createTurnManager } from '@/lib/game/turn-manager';
import { PhaseType, GameAction, Card, PhaseGroup, CombatState } from '@/types/game';
import { PHASE_SEQUENCE, getPhaseGroup } from '@/lib/game/phase-controller';

// ============================================================================
// TYPES
// ============================================================================

export interface GamePhaseControllerState {
  /** Current extended game state from TurnManager */
  gameState: ExtendedGameState | null;
  /** Current phase type */
  currentPhase: PhaseType;
  /** Current phase group for UI display */
  phaseGroup: PhaseGroup;
  /** Whether it's the player's turn */
  isPlayerTurn: boolean;
  /** Whether a combat is currently in progress */
  inCombat: boolean;
  /** Current combat state (if any) */
  combatState: CombatState | null;
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message (if any) */
  error: string | null;
  /** Turn number */
  turnNumber: number;
  /** Game ID */
  gameId: string | null;
}

export interface GamePhaseControllerActions {
  /** Initialize a new game with decks */
  initializeGame: (gameId: string, playerDeck: Card[], opponentDeck: Card[]) => Promise<void>;
  /** Load an existing game from database */
  loadGame: (gameId: string) => Promise<void>;
  /** Execute a game action (play_card, attack, etc.) */
  executeAction: (action: Omit<GameAction, 'timestamp'>) => Promise<boolean>;
  /** Advance to the next phase */
  advancePhase: () => Promise<void>;
  /** End the current turn */
  endTurn: () => Promise<void>;
  /** Play a card from hand */
  playCard: (cardId: string) => Promise<boolean>;
  /** Declare an attacker in combat */
  declareAttacker: (cardId: string) => Promise<boolean>;
  /** Confirm all attackers and move to blockers phase */
  confirmAttackers: () => Promise<boolean>;
  /** Declare a blocker */
  declareBlocker: (attackerId: string, blockerId: string) => Promise<boolean>;
  /** Skip the blockers phase */
  skipBlockers: () => Promise<boolean>;
  /** Submit answer for combat problem */
  submitCombatAnswer: (data: {
    problemId: string;
    answer: string;
    isCorrect: boolean;
    isAttacker: boolean;
    cardId: string;
  }) => Promise<boolean>;
  /** Use a card's ability */
  useAbility: (cardId: string, targetId?: string) => Promise<boolean>;
  /** Record a problem result for adaptive difficulty */
  recordProblemResult: (data: ProblemResultData) => Promise<void>;
  /** Get attackers that can be declared */
  getAvailableAttackers: () => Card[];
  /** Get blockers that can block */
  getAvailableBlockers: () => Card[];
  /** Reset error state */
  clearError: () => void;
}

export interface ProblemResultData {
  category: 'Math' | 'Logic' | 'Science';
  difficulty: number;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  responseTimeMs: number;
  timedOut: boolean;
  cardId?: string;
  cardName?: string;
  cardElement?: string;
  cardCost?: number;
  cardPower?: number;
  phase: string;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useGamePhaseController(): [GamePhaseControllerState, GamePhaseControllerActions] {
  // Internal TurnManager reference
  const turnManagerRef = useRef<TurnManager | null>(null);

  // State
  const [state, setState] = useState<GamePhaseControllerState>({
    gameState: null,
    currentPhase: 'untap',
    phaseGroup: 'beginning',
    isPlayerTurn: true,
    inCombat: false,
    combatState: null,
    isLoading: false,
    error: null,
    turnNumber: 0,
    gameId: null,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYNC STATE FROM TURN MANAGER
  // ─────────────────────────────────────────────────────────────────────────

  const syncStateFromManager = useCallback(() => {
    if (!turnManagerRef.current) return;

    const gameState = turnManagerRef.current.getState();
    const combatPhases: PhaseType[] = ['begin_combat', 'declare_attackers', 'declare_blockers', 'combat_damage', 'end_combat'];

    setState((prev) => ({
      ...prev,
      gameState,
      currentPhase: gameState.currentPhase,
      phaseGroup: getPhaseGroup(gameState.currentPhase),
      isPlayerTurn: gameState.activePlayer === 'player',
      inCombat: combatPhases.includes(gameState.currentPhase),
      combatState: gameState.combatState,
      turnNumber: gameState.turnNumber,
      gameId: gameState.gameId,
    }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZE GAME
  // ─────────────────────────────────────────────────────────────────────────

  const initializeGame = useCallback(
    async (gameId: string, playerDeck: Card[], opponentDeck: Card[]) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Create new TurnManager
        const manager = createTurnManager(gameId, playerDeck, opponentDeck);
        turnManagerRef.current = manager;

        // Start the first turn
        await manager.startTurn();

        // Sync state
        syncStateFromManager();

        // Persist initial state
        await persistGameState(gameId, manager.getState());

        console.log(`🎮 Game initialized: ${gameId}`);
      } catch (error) {
        console.error('Failed to initialize game:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize game',
        }));
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [syncStateFromManager]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD EXISTING GAME
  // ─────────────────────────────────────────────────────────────────────────

  const loadGame = useCallback(
    async (gameId: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(`/api/game/${gameId}`);
        if (!response.ok) {
          throw new Error('Failed to load game');
        }

        const { game } = await response.json();

        // Reconstruct TurnManager from saved state
        // Note: This requires the game state to include deck info
        const manager = new TurnManager(game.state);
        turnManagerRef.current = manager;

        syncStateFromManager();
        console.log(`🎮 Game loaded: ${gameId}`);
      } catch (error) {
        console.error('Failed to load game:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load game',
        }));
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [syncStateFromManager]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EXECUTE ACTION
  // ─────────────────────────────────────────────────────────────────────────

  const executeAction = useCallback(
    async (action: Omit<GameAction, 'timestamp'>): Promise<boolean> => {
      if (!turnManagerRef.current || !state.gameId) {
        setState((prev) => ({ ...prev, error: 'No active game' }));
        return false;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const fullAction: GameAction = {
          ...action,
          timestamp: new Date(),
        };

        const result = await turnManagerRef.current.executeAction(fullAction);

        if (!result.success) {
          setState((prev) => ({ ...prev, error: result.error || 'Action failed' }));
          return false;
        }

        // Sync state and persist
        syncStateFromManager();
        await persistGameState(state.gameId, turnManagerRef.current.getState());

        return true;
      } catch (error) {
        console.error('Action execution error:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Action failed',
        }));
        return false;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [state.gameId, syncStateFromManager]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE CONTROL
  // ─────────────────────────────────────────────────────────────────────────

  const advancePhase = useCallback(async () => {
    if (!turnManagerRef.current || !state.gameId) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await turnManagerRef.current.advancePhase();
      syncStateFromManager();
      await persistGameState(state.gameId, turnManagerRef.current.getState());
    } catch (error) {
      console.error('Failed to advance phase:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to advance phase',
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.gameId, syncStateFromManager]);

  const endTurn = useCallback(async () => {
    if (!turnManagerRef.current || !state.gameId) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Advance through remaining phases until turn ends
      let currentPhase = turnManagerRef.current.getState().currentPhase;
      const endPhases: PhaseType[] = ['end_step', 'cleanup'];

      // Skip to end phase if not already there
      while (!endPhases.includes(currentPhase)) {
        await turnManagerRef.current.advancePhase();
        currentPhase = turnManagerRef.current.getState().currentPhase;
      }

      // Complete the turn (cleanup → untap triggers new turn)
      while (endPhases.includes(currentPhase)) {
        await turnManagerRef.current.advancePhase();
        currentPhase = turnManagerRef.current.getState().currentPhase;
      }

      syncStateFromManager();
      await persistGameState(state.gameId, turnManagerRef.current.getState());
    } catch (error) {
      console.error('Failed to end turn:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to end turn',
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.gameId, syncStateFromManager]);

  // ─────────────────────────────────────────────────────────────────────────
  // COMBAT ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const playCard = useCallback(
    async (cardId: string): Promise<boolean> => {
      return executeAction({
        type: 'play_card',
        playerId: state.isPlayerTurn ? 'player' : 'opponent',
        data: { cardId },
      });
    },
    [executeAction, state.isPlayerTurn]
  );

  const declareAttacker = useCallback(
    async (cardId: string): Promise<boolean> => {
      return executeAction({
        type: 'declare_attacker',
        playerId: state.isPlayerTurn ? 'player' : 'opponent',
        data: { cardId },
      });
    },
    [executeAction, state.isPlayerTurn]
  );

  const confirmAttackers = useCallback(async (): Promise<boolean> => {
    return executeAction({
      type: 'confirm_attackers',
      playerId: state.isPlayerTurn ? 'player' : 'opponent',
      data: {},
    });
  }, [executeAction, state.isPlayerTurn]);

  const declareBlocker = useCallback(
    async (attackerId: string, blockerId: string): Promise<boolean> => {
      return executeAction({
        type: 'declare_blocker',
        playerId: state.isPlayerTurn ? 'player' : 'opponent',
        data: { attackerId, blockerId },
      });
    },
    [executeAction, state.isPlayerTurn]
  );

  const skipBlockers = useCallback(async (): Promise<boolean> => {
    return executeAction({
      type: 'skip_blockers',
      playerId: state.isPlayerTurn ? 'player' : 'opponent',
      data: {},
    });
  }, [executeAction, state.isPlayerTurn]);

  const submitCombatAnswer = useCallback(
    async (data: {
      problemId: string;
      answer: string;
      isCorrect: boolean;
      isAttacker: boolean;
      cardId: string;
    }): Promise<boolean> => {
      return executeAction({
        type: 'submit_combat_answer',
        playerId: state.isPlayerTurn ? 'player' : 'opponent',
        data,
      });
    },
    [executeAction, state.isPlayerTurn]
  );

  const useAbility = useCallback(
    async (cardId: string, targetId?: string): Promise<boolean> => {
      return executeAction({
        type: 'use_ability',
        playerId: state.isPlayerTurn ? 'player' : 'opponent',
        data: { cardId, targetId },
      });
    },
    [executeAction, state.isPlayerTurn]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // PROBLEM RESULT RECORDING
  // ─────────────────────────────────────────────────────────────────────────

  const recordProblemResult = useCallback(
    async (data: ProblemResultData) => {
      try {
        await fetch('/api/user/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            gameSessionId: state.gameId,
            turnNumber: state.turnNumber,
            opponentType: 'ai',
          }),
        });
      } catch (error) {
        console.error('Failed to record problem result:', error);
      }
    },
    [state.gameId, state.turnNumber]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  const getAvailableAttackers = useCallback((): Card[] => {
    if (!state.gameState) return [];

    const board = state.isPlayerTurn
      ? state.gameState.playerBoard
      : state.gameState.opponentBoard;

    return board.filter((card) => card.canAttack && !card.isTapped);
  }, [state.gameState, state.isPlayerTurn]);

  const getAvailableBlockers = useCallback((): Card[] => {
    if (!state.gameState) return [];

    // Blockers are on the defending side
    const board = state.isPlayerTurn
      ? state.gameState.opponentBoard
      : state.gameState.playerBoard;

    return board.filter((card) => !card.isTapped);
  }, [state.gameState, state.isPlayerTurn]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  const actions: GamePhaseControllerActions = {
    initializeGame,
    loadGame,
    executeAction,
    advancePhase,
    endTurn,
    playCard,
    declareAttacker,
    confirmAttackers,
    declareBlocker,
    skipBlockers,
    submitCombatAnswer,
    useAbility,
    recordProblemResult,
    getAvailableAttackers,
    getAvailableBlockers,
    clearError,
  };

  return [state, actions];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Persist game state to database via API
 */
async function persistGameState(gameId: string, state: ExtendedGameState): Promise<void> {
  try {
    await fetch(`/api/game/${gameId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
  } catch (error) {
    console.error('Failed to persist game state:', error);
  }
}

export default useGamePhaseController;
