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
import { generateBattleProblem } from '@/lib/battle-service';

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
   * Combat Phase: Execute attacks
   */
  private async executeCombat(turnManager: any): Promise<void> {
    console.log('⚔️  AI Combat Phase: Attacking...');

    const gameState = turnManager.getState();

    if (gameState.opponentBoard.length === 0) {
      console.log('🛑 No creatures to attack with');
      return;
    }

    // Select all targets at once
    const targets = selectCombatTargets(gameState);

    for (const target of targets) {
      await thinkingDelay('choose_target', this.thinkingDelayEnabled);

      console.log(`⚔️  AI attacking with ${target.attackerId} → ${target.targetId}: ${target.reasoning}`);

      // Execute attack action
      const result = await turnManager.executeAction({
        type: 'attack',
        playerId: 'opponent',
        timestamp: new Date(),
        data: {
          attackerId: target.attackerId,
          targetId: target.targetId === 'face' ? undefined : target.targetId,
        },
      });

      if (!result.success) {
        console.log(`❌ Attack failed: ${result.error}`);
        continue;
      }

      // If a battle problem was generated, answer it
      if (result.data?.problem) {
        await thinkingDelay('answer_problem', this.thinkingDelayEnabled);

        const answer = simulateAIAnswer(result.data.problem, this.difficulty);

        console.log(`🧠 AI answering problem: "${result.data.problem.question}"`);
        console.log(`🧠 AI answer: "${answer}" (Correct: ${result.data.problem.answer})`);

        // Submit answer (this would typically go through another API call)
        // For now, we'll just log it. In the full implementation,
        // this would trigger the battle resolution.
      }
    }

    console.log(`✅ AI executed ${targets.length} attack(s)`);
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
