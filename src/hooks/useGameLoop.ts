import { useState, useCallback, useEffect } from 'react';
import { GameState, Card, Problem, Phase, Player } from '../types/game';

const INITIAL_PLAYER_HEALTH = 20;
const INITIAL_MANA = 1;
const MAX_MANA = 10;
const STARTING_HAND_SIZE = 5;

const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  health: INITIAL_PLAYER_HEALTH,
  maxHealth: INITIAL_PLAYER_HEALTH,
  mana: INITIAL_MANA,
  maxMana: INITIAL_MANA,
  hand: [],
  board: [],
  deck: 20
});

const initialState: GameState = {
  turn: 1,
  player: createPlayer('player', 'Student Wizard'),
  enemy: createPlayer('enemy', 'Dark Quizmaster'),
  currentPhase: 'start',
  activeProblem: null,
  pendingCard: null,
  winner: null,
};

export const useGameLoop = (userDeck: Card[] = []) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [deckCards] = useState<Card[]>(userDeck.length > 0 ? userDeck : []);

  // --- Helper Functions ---

  const drawCard = (playerId: string, count: number = 1) => {
    setGameState(prev => {
      const player = prev[playerId as 'player' | 'enemy'];
      if (player.deck <= 0 || deckCards.length === 0) {
        // Fatigue logic could go here
        return prev;
      }

      // Get random cards from user's deck
      const newCards = [];
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * deckCards.length);
        newCards.push({ ...deckCards[randomIndex] });
      }

      return {
        ...prev,
        [playerId]: {
          ...player,
          hand: [...player.hand, ...newCards],
          deck: player.deck - count
        }
      };
    });
  };

  const startTurn = (playerId: 'player' | 'enemy') => {
    setGameState(prev => {
      const player = prev[playerId];
      const newMaxMana = Math.min(MAX_MANA, player.maxMana + 1);
      
      // Reset board state (untap creatures)
      const newBoard = player.board.map(c => ({ ...c, canAttack: true, isTapped: false }));

      return {
        ...prev,
        currentPhase: playerId === 'player' ? 'draw' : 'main', // Enemy skips draw phase in this simple logic or handles it in AI
        [playerId]: {
          ...player,
          maxMana: newMaxMana,
          mana: newMaxMana,
          board: newBoard
        }
      };
    });
    
    if (playerId === 'player') {
        // Auto-draw for player
        drawCard('player', 1);
        // Transition to main phase immediately (animations handled by UI)
        setPhase('main');
    }
  };

  const setPhase = (phase: Phase) => {
    setGameState(prev => ({ ...prev, currentPhase: phase }));
  };

  // --- Actions ---

  const initializeGame = useCallback(() => {
    setGameState(initialState);
    // Draw starting hands
    drawCard('player', STARTING_HAND_SIZE);
    drawCard('enemy', STARTING_HAND_SIZE);
    setPhase('main');
  }, []);

  const playCard = useCallback(async (card: Card) => {
    if (gameState.currentPhase !== 'main') return;
    if (gameState.player.mana < card.cost) return;

    // Set pending card immediately to show UI feedback
    setGameState(prev => ({
      ...prev,
      pendingCard: card,
      activeProblem: null // Clear any old problem
    }));

    // Fetch problem from AI - NO FALLBACK
    console.log('🎯 Fetching problem for card:', card.id);
    const response = await fetch('/api/problems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.id })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Problem API Error:', errorText);
      throw new Error(`Failed to generate problem: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Problem generated:', data.problem.question);

    setGameState(prev => ({
      ...prev,
      activeProblem: data.problem
    }));
  }, [gameState.currentPhase, gameState.player.mana]);

  const resolveProblem = useCallback((answer: string, timeTakenMs: number) => {
    if (!gameState.activeProblem || !gameState.pendingCard) return;

    // TODO: Real validation. For now, assume any answer is "correct" for testing flow if we don't have real problem logic yet
    // But let's try to be slightly real if we can parse the mock question
    const isCorrect = true; // activeProblem.correctAnswer === answer; 

    setGameState(prev => {
      if (!prev.pendingCard) return prev;

      const card = prev.pendingCard;
      const player = prev.player;
      
      if (isCorrect) {
        const newMana = player.mana - card.cost;
        const newHand = player.hand.filter(c => c.id !== card.id);
        
        // If creature, add to board
        // If spell, apply effect (simplified: deal damage to enemy)
        let newBoard = player.board;
        let enemyHealth = prev.enemy.health;

        if (card.power > 0 && card.defense > 0) {
            // It's a creature (roughly)
            newBoard = [...newBoard, { ...card, canAttack: false, isTapped: true }]; // Summoning sickness
        } else {
            // Spell
            enemyHealth -= 3; // Mock spell damage
        }

        return {
          ...prev,
          player: { ...player, mana: newMana, hand: newHand, board: newBoard },
          enemy: { ...prev.enemy, health: enemyHealth },
          activeProblem: null,
          pendingCard: null
        };
      } else {
        // Fizzle
        return {
          ...prev,
          player: { ...player, mana: player.mana - 1 }, // Penalty?
          activeProblem: null,
          pendingCard: null
        };
      }
    });
  }, [gameState.activeProblem, gameState.pendingCard]);

  const attack = useCallback((attackerId: string, targetId: string) => {
      // Simplified: Player attacks Enemy Hero
      setGameState(prev => {
          const attacker = prev.player.board.find(c => c.id === attackerId);
          if (!attacker || !attacker.canAttack) return prev;

          const newEnemyHealth = prev.enemy.health - attacker.power;
          const newBoard = prev.player.board.map(c => 
              c.id === attackerId ? { ...c, canAttack: false, isTapped: true } : c
          );

          return {
              ...prev,
              player: { ...prev.player, board: newBoard },
              enemy: { ...prev.enemy, health: newEnemyHealth }
          };
      });
  }, []);

  const endTurn = useCallback(async () => {
    setGameState(prev => ({ ...prev, currentPhase: 'end' }));
    
    // Enemy Turn Logic (Simulated)
    // In a real implementation, this would be an async call to an AI agent or game server
    
    // Simulate thinking time with a cancellable promise or proper async flow if needed
    // For now, we execute logic directly. UI should handle animations.
    
    setGameState(prev => {
        // Enemy draws & plays (Simplified AI)
        const enemy = prev.enemy;
        const damage = enemy.mana >= 2 ? 2 : 0;
        const newMana = enemy.mana >= 2 ? enemy.mana - 2 : enemy.mana;
        
        return {
            ...prev,
            turn: prev.turn + 1,
            enemy: { ...enemy, mana: newMana },
            player: { ...prev.player, health: prev.player.health - damage }
        };
    });

    // Pass turn back to player
    startTurn('player');

  }, []);

  // Initialize on mount
  useEffect(() => {
      initializeGame();
  }, [initializeGame]);

  return {
    gameState,
    playCard,
    resolveProblem,
    endTurn,
    attack
  };
};
