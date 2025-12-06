import { useState, useCallback, useEffect } from 'react';
import { GameState, Card, Problem, Phase, Player } from '../types/game';
import {
  assignAbilityToCard,
  canUseAbility,
  executeAbility,
  resetAbilitiesForTurn,
  markAbilityUsed,
} from '@/lib/game/abilities';

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
  deck: 20,
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
  const [abilityMessage, setAbilityMessage] = useState<string | null>(null);

  // --- Helper Functions ---

  const drawCard = (playerId: string, count: number = 1) => {
    setGameState((prev) => {
      const player = prev[playerId as 'player' | 'enemy'];
      if (player.deck <= 0 || deckCards.length === 0) {
        return prev;
      }

      const newCards = [];
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * deckCards.length);
        // Assign ability to each new card
        const cardWithAbility = assignAbilityToCard({
          ...deckCards[randomIndex],
          id: `${deckCards[randomIndex].id}-${Date.now()}-${i}`,
        });
        newCards.push(cardWithAbility);
      }

      return {
        ...prev,
        [playerId]: {
          ...player,
          hand: [...player.hand, ...newCards],
          deck: player.deck - count,
        },
      };
    });
  };

  const startTurn = (playerId: 'player' | 'enemy') => {
    setGameState((prev) => {
      const player = prev[playerId];
      const newMaxMana = Math.min(MAX_MANA, player.maxMana + 1);

      // Reset board state (untap creatures, reset abilities)
      const newBoard = resetAbilitiesForTurn(
        player.board.map((c) => ({ ...c, canAttack: true, isTapped: false }))
      );

      return {
        ...prev,
        currentPhase: playerId === 'player' ? 'draw' : 'main',
        [playerId]: {
          ...player,
          maxMana: newMaxMana,
          mana: newMaxMana,
          board: newBoard,
        },
      };
    });

    if (playerId === 'player') {
      drawCard('player', 1);
      setPhase('main');
    }
  };

  const setPhase = (phase: Phase) => {
    setGameState((prev) => ({ ...prev, currentPhase: phase }));
  };

  // --- Actions ---

  const initializeGame = useCallback(() => {
    setGameState(initialState);
    drawCard('player', STARTING_HAND_SIZE);
    drawCard('enemy', STARTING_HAND_SIZE);
    setPhase('main');
  }, []);

  const playCard = useCallback(
    async (card: Card) => {
      if (gameState.currentPhase !== 'main') return;
      if (gameState.player.mana < card.cost) return;

      setGameState((prev) => ({
        ...prev,
        pendingCard: card,
        activeProblem: null,
      }));

      const response = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Problem API Error:', errorText);
        throw new Error(
          `Failed to generate problem: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      setGameState((prev) => ({
        ...prev,
        activeProblem: data.problem,
      }));
    },
    [gameState.currentPhase, gameState.player.mana]
  );

  const resolveProblem = useCallback(
    async (answer: string, timeTakenMs: number) => {
      if (!gameState.activeProblem || !gameState.pendingCard) return;

      // Normalize answers for comparison (case-insensitive, trim whitespace)
      const normalizeAnswer = (a: string) => a.trim().toLowerCase();
      const isCorrect = normalizeAnswer(answer) === normalizeAnswer(gameState.activeProblem.correctAnswer);

      // Record problem result to user stats (async, non-blocking)
      try {
        fetch('/api/user/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'Math', // Default category since Problem type doesn't include it
            difficulty: gameState.activeProblem.difficulty || 5,
            question: gameState.activeProblem.question,
            correctAnswer: gameState.activeProblem.correctAnswer,
            userAnswer: answer,
            isCorrect,
            responseTimeMs: timeTakenMs,
            timedOut: timeTakenMs >= 15000,
            cardId: gameState.pendingCard.id,
            cardName: gameState.pendingCard.name,
            cardElement: gameState.pendingCard.element,
            cardCost: gameState.pendingCard.cost,
            cardPower: gameState.pendingCard.power,
            phase: 'play_card',
            turnNumber: gameState.turn,
            opponentType: 'ai',
          }),
        }).catch((err) => console.error('Failed to record problem result:', err));
      } catch (err) {
        console.error('Error recording problem result:', err);
      }

      setGameState((prev) => {
        if (!prev.pendingCard) return prev;

        const card = prev.pendingCard;
        const player = prev.player;

        if (isCorrect) {
          const newMana = player.mana - card.cost;
          const newHand = player.hand.filter((c) => c.id !== card.id);

          let newBoard = player.board;
          let enemyHealth = prev.enemy.health;

          if (card.power > 0 && card.defense > 0) {
            // Creature with ability
            const cardWithState = {
              ...card,
              canAttack: false,
              isTapped: true,
              abilityUsedThisTurn: false,
            };
            newBoard = [...newBoard, cardWithState];
          } else {
            enemyHealth -= 3;
          }

          return {
            ...prev,
            player: {
              ...player,
              mana: newMana,
              hand: newHand,
              board: newBoard,
            },
            enemy: { ...prev.enemy, health: enemyHealth },
            activeProblem: null,
            pendingCard: null,
          };
        } else {
          return {
            ...prev,
            player: { ...player, mana: player.mana - 1 },
            activeProblem: null,
            pendingCard: null,
          };
        }
      });
    },
    [gameState.activeProblem, gameState.pendingCard]
  );

  /**
   * Use a creature's ability from the board
   */
  const useAbility = useCallback(
    (cardId: string, targetCreatureId?: string) => {
      const card = gameState.player.board.find((c) => c.id === cardId);
      if (!card) return;

      const result = executeAbility(card, gameState.player.mana);
      if (!result) {
        return;
      }

      setAbilityMessage(result.message);

      // Clear message after 2 seconds
      setTimeout(() => setAbilityMessage(null), 2000);

      setGameState((prev) => {
        const player = prev.player;
        const enemy = prev.enemy;

        let newPlayerHealth = player.health;
        let newEnemyHealth = enemy.health;
        let newEnemyBoard = [...enemy.board];

        // Apply ability effect based on target type
        switch (result.target) {
          case 'enemy_hero':
            newEnemyHealth = Math.max(0, newEnemyHealth - result.damage);
            break;

          case 'self_heal':
            newPlayerHealth = Math.min(
              player.maxHealth,
              newPlayerHealth + result.damage
            );
            break;

          case 'all_enemies':
            // Damage all enemy creatures
            newEnemyBoard = newEnemyBoard
              .map((c) => ({
                ...c,
                defense: c.defense - result.damage,
              }))
              .filter((c) => c.defense > 0);
            break;

          case 'enemy_creature':
            // Damage specific creature (first one if no target specified)
            if (newEnemyBoard.length > 0) {
              const targetId = targetCreatureId || newEnemyBoard[0].id;
              newEnemyBoard = newEnemyBoard
                .map((c) =>
                  c.id === targetId
                    ? { ...c, defense: c.defense - result.damage }
                    : c
                )
                .filter((c) => c.defense > 0);
            }
            break;
        }

        // Mark ability as used and deduct mana
        const newPlayerBoard = markAbilityUsed(player.board, cardId);

        // Check for game over
        const winner = newEnemyHealth <= 0 ? ('player' as const) : null;

        return {
          ...prev,
          player: {
            ...player,
            mana: player.mana - result.manaCost,
            health: newPlayerHealth,
            board: newPlayerBoard,
          },
          enemy: {
            ...enemy,
            health: newEnemyHealth,
            board: newEnemyBoard,
          },
          winner,
        };
      });
    },
    [gameState.player.board, gameState.player.mana]
  );

  const attack = useCallback((attackerId: string, targetId: string) => {
    setGameState((prev) => {
      const attacker = prev.player.board.find((c) => c.id === attackerId);
      if (!attacker || !attacker.canAttack) return prev;

      const newEnemyHealth = prev.enemy.health - attacker.power;
      const newBoard = prev.player.board.map((c) =>
        c.id === attackerId ? { ...c, canAttack: false, isTapped: true } : c
      );

      const winner = newEnemyHealth <= 0 ? ('player' as const) : null;

      return {
        ...prev,
        player: { ...prev.player, board: newBoard },
        enemy: { ...prev.enemy, health: Math.max(0, newEnemyHealth) },
        winner,
      };
    });
  }, []);

  const endTurn = useCallback(async () => {
    setGameState((prev) => ({ ...prev, currentPhase: 'end' }));

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setGameState((prev) => {
      const enemy = prev.enemy;
      const newMaxMana = Math.min(MAX_MANA, enemy.maxMana + 1);

      let newHand = [...enemy.hand];
      if (enemy.deck > 0 && deckCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * deckCards.length);
        const cardWithAbility = assignAbilityToCard({
          ...deckCards[randomIndex],
          id: `enemy-${Date.now()}`,
        });
        newHand.push(cardWithAbility);
      }

      // Reset abilities for AI creatures
      const untappedBoard = resetAbilitiesForTurn(
        enemy.board.map((c) => ({ ...c, canAttack: true, isTapped: false }))
      );

      return {
        ...prev,
        enemy: {
          ...enemy,
          maxMana: newMaxMana,
          mana: newMaxMana,
          hand: newHand,
          board: untappedBoard,
          deck: enemy.deck - 1,
        },
      };
    });

    // AI Main Phase: Play cards
    await new Promise((resolve) => setTimeout(resolve, 800));

    setGameState((prev) => {
      const enemy = prev.enemy;
      let mana = enemy.mana;
      let hand = [...enemy.hand];
      let board = [...enemy.board];

      const playableCards = hand
        .filter((c) => c.cost <= mana)
        .sort((a, b) => b.power - a.power);

      for (const card of playableCards) {
        if (mana >= card.cost && board.length < 7) {
          mana -= card.cost;
          hand = hand.filter((c) => c.id !== card.id);
          board.push({
            ...card,
            canAttack: false,
            isTapped: false,
            abilityUsedThisTurn: false,
          });
        }
      }

      return {
        ...prev,
        enemy: { ...enemy, mana, hand, board },
      };
    });

    // AI uses abilities
    await new Promise((resolve) => setTimeout(resolve, 600));

    setGameState((prev) => {
      const enemy = prev.enemy;
      let mana = enemy.mana;
      let board = [...enemy.board];
      let playerHealth = prev.player.health;
      let playerBoard = [...prev.player.board];

      // AI uses abilities on creatures that can use them
      for (const creature of board) {
        if (canUseAbility(creature, mana)) {
          const ability = creature.ability!;

          mana -= ability.manaCost;

          switch (ability.target) {
            case 'enemy_hero':
              playerHealth = Math.max(0, playerHealth - ability.damage);
              break;
            case 'self_heal':
              // AI heals itself - would need to track enemy health separately
              break;
            case 'all_enemies':
              playerBoard = playerBoard
                .map((c) => ({ ...c, defense: c.defense - ability.damage }))
                .filter((c) => c.defense > 0);
              break;
            case 'enemy_creature':
              if (playerBoard.length > 0) {
                const targetIdx = Math.floor(
                  Math.random() * playerBoard.length
                );
                playerBoard[targetIdx] = {
                  ...playerBoard[targetIdx],
                  defense: playerBoard[targetIdx].defense - ability.damage,
                };
                playerBoard = playerBoard.filter((c) => c.defense > 0);
              }
              break;
          }

          // Mark ability as used
          board = markAbilityUsed(board, creature.id);
        }
      }

      return {
        ...prev,
        enemy: { ...enemy, mana, board },
        player: { ...prev.player, health: playerHealth, board: playerBoard },
      };
    });

    // AI Combat Phase: Attack
    await new Promise((resolve) => setTimeout(resolve, 800));

    setGameState((prev) => {
      const enemy = prev.enemy;
      let playerHealth = prev.player.health;

      const newBoard = enemy.board.map((creature) => {
        if (creature.canAttack && !creature.isTapped) {
          const aiAnsweredCorrectly = Math.random() < 0.6;
          const baseDamage = creature.power;
          const bonus = aiAnsweredCorrectly ? Math.ceil(baseDamage * 0.5) : 0;
          const damage = baseDamage + bonus;

          playerHealth -= damage;

          return { ...creature, canAttack: false, isTapped: true };
        }
        return creature;
      });

      const winner = playerHealth <= 0 ? ('enemy' as const) : null;

      return {
        ...prev,
        enemy: { ...enemy, board: newBoard },
        player: { ...prev.player, health: Math.max(0, playerHealth) },
        winner,
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    setGameState((prev) => ({ ...prev, turn: prev.turn + 1 }));
    startTurn('player');
  }, [deckCards]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return {
    gameState,
    playCard,
    resolveProblem,
    endTurn,
    attack,
    useAbility,
    abilityMessage,
  };
};
