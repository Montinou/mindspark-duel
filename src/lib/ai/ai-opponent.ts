/**
 * AI Opponent Controller - "The Dark Quizmaster"
 *
 * Main AI controller that orchestrates the AI turn.
 * Integrates Turn Manager, Decision Maker, Card Evaluator, and Problem Solver.
 */

import { loadTurnManagerFromDB, saveTurnManagerToDB } from '@/lib/game/game-state-persistence';
import { makeDecision, selectCombatTargets } from './decision-maker';
import { simulateAIAnswer } from './problem-solver';
import { AIDifficulty, AIState } from '@/types/ai';
import { generateBattleProblem, calculateDamage } from '@/lib/battle-service';
import { Card } from '@/types/game';

/**
 * Thinking delay simulation - makes AI feel human-like
 */
async function thinkingDelay(
  action: string,
  enabled: boolean = true
): Promise<void> {
  if (!enabled) return;

  const delays: Record<string, [number, number]> = {
    start_turn: [500, 1000],
    choose_card: [1000, 2000],
    choose_target: [800, 1500],
    answer_problem: [3000, 5000],
    end_turn: [500, 800],
  };

  const [min, max] = delays[action] || [500, 1000];
  const delay = Math.random() * (max - min) + min;

  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * AI Opponent Class
 */
export class AIOpponent {
  private gameId: string;
  private difficulty: AIDifficulty;
  private thinkingDelayEnabled: boolean;
  private aiState: AIState;

  constructor(
    gameId: string,
    difficulty: AIDifficulty = 'normal',
    thinkingDelayEnabled: boolean = true
  ) {
    this.gameId = gameId;
    this.difficulty = difficulty;
    this.thinkingDelayEnabled = thinkingDelayEnabled;

    this.aiState = {
      gameId,
      difficulty,
      personality: 'balanced', // Could be configurable later
      thinkingDelay: thinkingDelayEnabled,
    };
  }

  /**
   * Enable or disable thinking delays (for testing)
   */
  setThinkingDelay(enabled: boolean): void {
    this.thinkingDelayEnabled = enabled;
    this.aiState.thinkingDelay = enabled;
  }

  /**
   * Execute a complete AI turn
   */
  async takeTurn(): Promise<void> {
    console.log(`🤖 AI (${this.difficulty}) starting turn...`);

    await thinkingDelay('start_turn', this.thinkingDelayEnabled);

    try {
      // Load current game state
      const turnManager = await loadTurnManagerFromDB(this.gameId);
      let gameState = turnManager.getState();

      // Verify it's AI's turn
      if (gameState.activePlayer !== 'opponent') {
        throw new Error(`Not AI's turn (active player: ${gameState.activePlayer})`);
      }

      console.log(`📍 Turn ${gameState.turnNumber}, Phase: ${gameState.currentPhase}`);

      // Main Phase: Play cards
      if (gameState.currentPhase === 'main') {
        await this.playCards(turnManager);
        await saveTurnManagerToDB(turnManager);

        // Advance to combat phase
        await turnManager.advancePhase();
        await saveTurnManagerToDB(turnManager);
        gameState = turnManager.getState();
        console.log(`📍 Advanced to ${gameState.currentPhase} phase`);
      }

      // Combat Phase: Attack
      if (gameState.currentPhase === 'combat') {
        await this.executeCombat(turnManager);
        await saveTurnManagerToDB(turnManager);

        // Advance to end phase
        await turnManager.advancePhase();
        await saveTurnManagerToDB(turnManager);
        gameState = turnManager.getState();
        console.log(`📍 Advanced to ${gameState.currentPhase} phase`);
      }

      // End Phase: End turn
      if (gameState.currentPhase === 'end') {
        await thinkingDelay('end_turn', this.thinkingDelayEnabled);
        await turnManager.advancePhase(); // This will pass turn to player
        await saveTurnManagerToDB(turnManager);

        const finalState = turnManager.getState();
        console.log(`✅ AI turn complete. Now it's ${finalState.activePlayer}'s turn.`);
      }
    } catch (error) {
      console.error('❌ AI turn error:', error);
      throw error;
    }
  }

  /**
   * Main Phase: Play cards from hand
   */
  private async playCards(turnManager: any): Promise<void> {
    console.log('🎴 AI Main Phase: Playing cards...');

    let gameState = turnManager.getState();
    let cardsPlayed = 0;
    const maxCardsPerTurn = 5; // Prevent infinite loops

    while (
      gameState.opponentMana > 0 &&
      gameState.opponentHand.length > 0 &&
      cardsPlayed < maxCardsPerTurn
    ) {
      await thinkingDelay('choose_card', this.thinkingDelayEnabled);

      // Make decision: which card to play?
      const decision = makeDecision(gameState, this.aiState, 'main');

      if (!decision || decision.type !== 'play_card') {
        console.log('🛑 No more cards to play');
        break;
      }

      console.log(`🃏 AI playing card ${decision.cardId}: ${decision.reasoning}`);

      // Execute play action
      const result = await turnManager.executeAction({
        type: 'play_card',
        playerId: 'opponent',
        timestamp: new Date(),
        data: { cardId: decision.cardId },
      });

      if (!result.success) {
        console.log(`❌ Failed to play card: ${result.error}`);
        break;
      }

      cardsPlayed++;
      gameState = turnManager.getState(); // Refresh state

      // If a problem was generated, answer it
      // (In the current implementation, problems are generated during combat, not card play)
      // This is here for future expansion if card play also generates problems
    }

    console.log(`✅ AI played ${cardsPlayed} card(s)`);
  }

  /**
   * Combat Phase: Execute attacks with full battle resolution
   */
  private async executeCombat(turnManager: any): Promise<void> {
    console.log('⚔️  AI Combat Phase: Attacking...');

    let gameState = turnManager.getState();

    if (gameState.opponentBoard.length === 0) {
      console.log('🛑 No creatures to attack with');
      return;
    }

    // Select all targets at once
    const targets = selectCombatTargets(gameState);
    let totalDamageDealt = 0;

    for (const target of targets) {
      await thinkingDelay('choose_target', this.thinkingDelayEnabled);

      // Find attacker card
      const attacker = gameState.opponentBoard.find((c: Card) => c.id === target.attackerId);
      if (!attacker) {
        console.log(`❌ Attacker ${target.attackerId} not found`);
        continue;
      }

      console.log(`⚔️  AI attacking with ${attacker.name} → ${target.targetId}: ${target.reasoning}`);

      // Execute attack action (marks attacker as tapped)
      const result = await turnManager.executeAction({
        type: 'attack',
        playerId: 'opponent',
        timestamp: new Date(),
        data: {
          attackerId: target.attackerId,
          targetId: target.targetId === 'face' ? 'face' : target.targetId,
        },
      });

      if (!result.success) {
        console.log(`❌ Attack failed: ${result.error}`);
        continue;
      }

      // Generate problem for the attack
      try {
        await thinkingDelay('answer_problem', this.thinkingDelayEnabled);

        const problem = await generateBattleProblem(attacker, 'ai-opponent', 5);
        console.log(`🧠 Problem: "${problem.question}"`);

        // AI answers the problem
        const aiAnswer = simulateAIAnswer(problem, this.difficulty);
        const isCorrect = aiAnswer.trim().toLowerCase() === problem.answer.trim().toLowerCase();

        console.log(`🧠 AI answer: "${aiAnswer}" (Correct: ${problem.answer}) - ${isCorrect ? '✅' : '❌'}`);

        // Calculate damage based on attack type
        if (target.targetId === 'face') {
          // Direct attack to player - full power + accuracy bonus
          const baseDamage = attacker.power;
          const accuracyBonus = isCorrect ? Math.ceil(baseDamage * 0.5) : 0;
          const damage = baseDamage + accuracyBonus;

          // Apply damage to player
          turnManager.applyDamage('player', damage);
          totalDamageDealt += damage;

          console.log(`💥 AI dealt ${damage} damage to player (Base: ${baseDamage}, Accuracy: +${accuracyBonus})`);
        } else {
          // Attack a creature
          const defender = gameState.playerBoard.find((c: Card) => c.id === target.targetId);
          if (defender) {
            const damageCalc = calculateDamage(attacker, defender, isCorrect);

            // For simplicity, we apply damage to player based on the battle
            // In a full implementation, this would handle creature combat
            console.log(`⚔️  Combat: ${attacker.name} vs ${defender.name}`);
            console.log(`💥 Damage calculation: Base ${damageCalc.baseDamage}, Accuracy +${damageCalc.accuracyBonus}, Elemental +${damageCalc.elementalBonus} = ${damageCalc.totalDamage}`);

            // Apply excess damage to player if attacker wins
            if (damageCalc.totalDamage > defender.defense) {
              const excessDamage = damageCalc.totalDamage - defender.defense;
              turnManager.applyDamage('player', excessDamage);
              totalDamageDealt += excessDamage;
              console.log(`💥 Excess damage to player: ${excessDamage}`);
            }
          }
        }

        // Check if game is over
        const gameOverCheck = turnManager.isGameOver();
        if (gameOverCheck.gameOver) {
          console.log(`🏆 Game Over! Winner: ${gameOverCheck.winner}`);
          break;
        }

      } catch (error) {
        console.error('❌ Error during battle resolution:', error);
        // Continue with next attack even if this one fails
      }

      // Refresh state for next attack
      gameState = turnManager.getState();
    }

    console.log(`✅ AI executed ${targets.length} attack(s), dealt ${totalDamageDealt} total damage`);
  }
}

/**
 * Create and execute an AI turn (convenience function)
 */
export async function executeAITurn(
  gameId: string,
  difficulty: AIDifficulty = 'normal'
): Promise<void> {
  const ai = new AIOpponent(gameId, difficulty);
  await ai.takeTurn();
}
