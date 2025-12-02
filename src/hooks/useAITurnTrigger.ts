/**
 * AI Turn Trigger Hook
 *
 * Automatically triggers AI turn when it's the opponent's turn.
 * This hook should be used in the game UI component that displays the game state.
 *
 * IMPORTANT: This hook assumes the game state comes from the Turn Manager API,
 * not from the old client-side useGameLoop hook. The Battlefield component needs
 * to be refactored to use the server-side game state first.
 *
 * Usage:
 * ```tsx
 * const { gameState, refreshGameState } = useGameState(gameId);
 * useAITurnTrigger(gameState, refreshGameState);
 * ```
 */

import { useEffect, useRef } from 'react';

interface GameStateForAI {
  activePlayer: 'player' | 'opponent';
  gameId?: string;
}

export function useAITurnTrigger(
  gameState: GameStateForAI | null,
  onAITurnComplete?: () => void | Promise<void>,
  options?: {
    enabled?: boolean;
    difficulty?: 'easy' | 'normal' | 'hard';
    delay?: number; // Delay before triggering AI turn (ms)
  }
) {
  const {
    enabled = true,
    difficulty = 'normal',
    delay = 1000,
  } = options || {};

  const isExecutingRef = useRef(false);
  const previousActivePlayerRef = useRef<'player' | 'opponent' | null>(null);

  useEffect(() => {
    // Skip if disabled or no game state
    if (!enabled || !gameState) {
      return;
    }

    // Skip if already executing
    if (isExecutingRef.current) {
      return;
    }

    // Skip if it's not opponent's turn
    if (gameState.activePlayer !== 'opponent') {
      previousActivePlayerRef.current = gameState.activePlayer;
      return;
    }

    // Skip if it was already opponent's turn (don't trigger twice)
    if (previousActivePlayerRef.current === 'opponent') {
      return;
    }

    // Update previous active player
    previousActivePlayerRef.current = 'opponent';

    // Trigger AI turn after delay
    const timeoutId = setTimeout(async () => {
      if (!gameState.gameId) {
        console.error('❌ Cannot trigger AI turn: gameId is missing');
        return;
      }

      isExecutingRef.current = true;

      try {
        const response = await fetch('/api/ai/take-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: gameState.gameId,
            difficulty,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('❌ AI turn failed:', error);
          return;
        }

        await response.json();

        // Notify parent component to refresh game state
        if (onAITurnComplete) {
          await onAITurnComplete();
        }
      } catch (error) {
        console.error('❌ AI turn error:', error);
      } finally {
        isExecutingRef.current = false;
      }
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [gameState, enabled, difficulty, delay, onAITurnComplete]);
}
