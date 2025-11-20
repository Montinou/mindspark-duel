import { useState, useCallback } from 'react';
import { GameState, Card, Problem } from '../types/game';

const INITIAL_PLAYER_HEALTH = 20;
const INITIAL_MANA = 1;

const initialState: GameState = {
  turn: 1,
  player: {
    id: 'player',
    name: 'Student Wizard',
    health: INITIAL_PLAYER_HEALTH,
    maxHealth: INITIAL_PLAYER_HEALTH,
    mana: INITIAL_MANA,
    maxMana: INITIAL_MANA,
    hand: [],
    board: [],
  },
  enemy: {
    id: 'enemy',
    name: 'Dark Quizmaster',
    health: INITIAL_PLAYER_HEALTH,
    maxHealth: INITIAL_PLAYER_HEALTH,
    mana: INITIAL_MANA,
    maxMana: INITIAL_MANA,
    hand: [],
    board: [],
  },
  currentPhase: 'draw',
  activeProblem: null,
  pendingCard: null,
  winner: null,
};

export const useGameLoop = () => {
  const [gameState, setGameState] = useState<GameState>(initialState);

  const playCard = useCallback((card: Card) => {
    // 1. Check mana
    if (gameState.player.mana < card.cost) return;

    // 2. Set pending card and trigger problem generation (mock for now)
    setGameState(prev => ({
      ...prev,
      pendingCard: card,
      activeProblem: {
        question: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctAnswer: "4",
        difficulty: 1
      } // This will be replaced by AI generation later
    }));
  }, [gameState.player.mana]);

  const resolveProblem = useCallback((answer: string, timeTakenMs: number) => {
    if (!gameState.activeProblem || !gameState.pendingCard) return;

    const isCorrect = answer === gameState.activeProblem.correctAnswer;
    let multiplier = 0;

    if (isCorrect) {
      if (timeTakenMs < 5000) multiplier = 1.5; // Critical
      else if (timeTakenMs < 15000) multiplier = 1.0; // Normal
      else multiplier = 0.75; // Weak
    } else {
      multiplier = 0; // Fizzle
    }

    // Apply effects based on multiplier
    // TODO: Implement actual damage/healing logic
    console.log(`Problem resolved. Correct: ${isCorrect}, Multiplier: ${multiplier}`);

    setGameState(prev => {
      const newMana = prev.player.mana - prev.pendingCard!.cost;
      // Move card to board or discard? For now, let's say it goes to board if creature
      // Simplified: just deal damage to enemy for now
      const damage = Math.floor(prev.pendingCard!.power * multiplier);
      const newEnemyHealth = Math.max(0, prev.enemy.health - damage);

      return {
        ...prev,
        player: {
          ...prev.player,
          mana: newMana,
          hand: prev.player.hand.filter(c => c.id !== prev.pendingCard!.id),
          board: [...prev.player.board, prev.pendingCard!] // Add to board
        },
        enemy: {
          ...prev.enemy,
          health: newEnemyHealth
        },
        activeProblem: null,
        pendingCard: null
      };
    });

  }, [gameState.activeProblem, gameState.pendingCard]);

  const endTurn = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      turn: prev.turn + 1,
      player: {
        ...prev.player,
        mana: Math.min(10, prev.player.maxMana + 1), // Increment max mana
        maxMana: Math.min(10, prev.player.maxMana + 1)
      }
      // TODO: Enemy turn logic
    }));
  }, []);

  const addCardToHand = useCallback((card: Card) => {
    setGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        hand: [...prev.player.hand, card]
      }
    }));
  }, []);

  return {
    gameState,
    playCard,
    resolveProblem,
    endTurn,
    addCardToHand
  };
};
