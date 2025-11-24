/**
 * Turn Manager - Core Game Orchestrator
 *
 * This is the "heart" of the game - the system that makes turns flow smoothly
 * from start to finish, enforces game rules, and provides a structured framework
 * for all player actions.
 *
 * Responsibilities:
 * 1. Turn progression (increment counter, switch players)
 * 2. Phase progression (Start -> Main -> Combat -> End)
 * 3. Mana management (recharge, increment, spend)
 * 4. Card drawing (with fatigue system)
 * 5. Action validation (phase-specific rules)
 * 6. Integration with Battle System
 * 7. State persistence
 *
 * Design principles:
 * - Deterministic: Same inputs = same outputs
 * - Atomic: State changes complete fully or not at all
 * - Validated: All actions checked before execution
 */

import { db } from '@/db';
import { gameSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TurnState, GameAction, ActionResult, PhaseType, Card } from '@/types/game';
import { getNextPhase, isActionAllowedInPhase } from './phase-controller';
import {
  DeckState,
  drawCard,
  drawMultipleCards,
  initializeDeck,
  getDeckStats,
} from './deck-service';

/**
 * Extended game state that includes deck states
 */
export interface ExtendedGameState extends TurnState {
  playerDeckState: DeckState;
  opponentDeckState: DeckState;
  playerHand: Card[];
  opponentHand: Card[];
  playerBoard: Card[];
  opponentBoard: Card[];
  playerHealth: number;
  opponentHealth: number;
}

/**
 * TurnManager class - manages all turn-related logic
 */
export class TurnManager {
  private state: ExtendedGameState;

  constructor(state: ExtendedGameState) {
    this.state = state;
  }

  /**
   * Start a new turn for the active player
   * Executes Start Phase automatically:
   * 1. Increment turn counter
   * 2. Recharge mana to maxMana
   * 3. Increment maxMana by 1 (cap at 10)
   * 4. Draw 1 card (or apply fatigue if deck empty)
   * 5. Advance to Main Phase
   *
   * @returns Updated game state
   */
  async startTurn(): Promise<ExtendedGameState> {
    const { activePlayer } = this.state;

    console.log(`🎮 Starting turn ${this.state.turnNumber + 1} for ${activePlayer}`);

    // 1. Increment turn counter
    this.state.turnNumber += 1;

    // 2 & 3. Recharge mana and increment maxMana
    if (activePlayer === 'player') {
      // Increment max mana (cap at 10)
      this.state.playerMaxMana = Math.min(10, this.state.playerMaxMana + 1);
      // Recharge to max
      this.state.playerMana = this.state.playerMaxMana;
    } else {
      this.state.opponentMaxMana = Math.min(10, this.state.opponentMaxMana + 1);
      this.state.opponentMana = this.state.opponentMaxMana;
    }

    console.log(`💎 Mana: ${this.getCurrentMana()}/${this.getCurrentMaxMana()}`);

    // 4. Draw card (handles fatigue if deck empty)
    await this.drawCardForActivePlayer();

    // 5. Advance to Main Phase (Start Phase is automatic)
    this.state.currentPhase = 'main';

    // Clear actions from previous turn
    this.state.actions = [];

    return this.state;
  }

  /**
   * Execute a game action (play card, attack, etc.)
   * Validates action is legal before executing
   *
   * @param action - The action to execute
   * @returns Result indicating success or failure with updated state
   */
  async executeAction(action: GameAction): Promise<ActionResult> {
    console.log(`⚡ Executing action: ${action.type} in ${this.state.currentPhase} phase`);

    // Validate action is legal
    const validationResult = this.validateAction(action);
    if (!validationResult.success) {
      console.error(`❌ ${validationResult.message}`);
      return validationResult;
    }

    // Execute action logic
    const result = await this.performAction(action);

    if (result.success) {
      // Record in history
      this.state.actions.push(action);
      result.updatedState = this.state;
    }

    return result;
  }

  /**
   * Advance to next phase in sequence
   * If in End Phase, ends turn and starts opponent's turn
   *
   * @returns Updated game state
   */
  async advancePhase(): Promise<ExtendedGameState> {
    const previousPhase = this.state.currentPhase;
    const nextPhase = getNextPhase(this.state.currentPhase);

    console.log(`📍 Advancing phase: ${previousPhase} → ${nextPhase}`);

    if (nextPhase === 'start') {
      // End Phase completed, pass turn to opponent
      await this.endTurn();
      return this.startTurn();
    } else {
      this.state.currentPhase = nextPhase;
      return this.state;
    }
  }

  /**
   * Get current game state (for API responses)
   *
   * @returns Current extended game state
   */
  public getState(): ExtendedGameState {
    return { ...this.state };
  }

  /**
   * Get current turn state (without extended fields)
   *
   * @returns Current turn state
   */
  public getTurnState(): TurnState {
    return {
      gameId: this.state.gameId,
      turnNumber: this.state.turnNumber,
      activePlayer: this.state.activePlayer,
      currentPhase: this.state.currentPhase,
      playerMana: this.state.playerMana,
      playerMaxMana: this.state.playerMaxMana,
      opponentMana: this.state.opponentMana,
      opponentMaxMana: this.state.opponentMaxMana,
      playerFatigueCounter: this.state.playerFatigueCounter,
      opponentFatigueCounter: this.state.opponentFatigueCounter,
      actions: this.state.actions,
    };
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Validate if an action can be executed in current game state
   */
  private validateAction(action: GameAction): ActionResult {
    const { currentPhase, activePlayer } = this.state;

    // 1. Check if it's the active player's turn
    if (action.playerId !== activePlayer) {
      return {
        success: false,
        error: `Not your turn (active player: ${activePlayer})`,
      };
    }

    // 2. Check if action is allowed in current phase
    if (!isActionAllowedInPhase(action.type, currentPhase)) {
      return {
        success: false,
        error: `Action '${action.type}' not allowed in ${currentPhase} phase`,
      };
    }

    // 3. Action-specific validation
    switch (action.type) {
      case 'play_card':
        return this.validatePlayCard(action);
      case 'attack':
        return this.validateAttack(action);
      case 'end_phase':
        return { success: true };
      case 'pass_turn':
        return { success: true };
      default:
        return {
          success: false,
          error: `Unknown action type: ${action.type}`,
        };
    }
  }

  /**
   * Validate play_card action
   */
  private validatePlayCard(action: GameAction): ActionResult {
    const { cardId } = action.data;

    if (!cardId) {
      return {
        success: false,
        error: 'Missing cardId in action data',
      };
    }

    // Check if card is in player's hand
    const hand =
      this.state.activePlayer === 'player'
        ? this.state.playerHand
        : this.state.opponentHand;

    const card = hand.find((c) => c.id === cardId);

    if (!card) {
      return {
        success: false,
        error: 'Card not in hand',
      };
    }

    // Check if player has enough mana
    const currentMana = this.getCurrentMana();
    if (currentMana < card.cost) {
      return {
        success: false,
        error: `Insufficient mana (need ${card.cost}, have ${currentMana})`,
      };
    }

    // Check if board has space (max 7 creatures)
    const board =
      this.state.activePlayer === 'player'
        ? this.state.playerBoard
        : this.state.opponentBoard;

    if (board.length >= 7) {
      return {
        success: false,
        error: 'Board full (maximum 7 creatures)',
      };
    }

    return { success: true };
  }

  /**
   * Validate attack action
   */
  private validateAttack(action: GameAction): ActionResult {
    const { attackerId, targetId } = action.data;

    if (!attackerId || !targetId) {
      return {
        success: false,
        error: 'Missing attackerId or targetId in action data',
      };
    }

    // Check if attacker is on player's board
    const board =
      this.state.activePlayer === 'player'
        ? this.state.playerBoard
        : this.state.opponentBoard;

    const attacker = board.find((c) => c.id === attackerId);

    if (!attacker) {
      return {
        success: false,
        error: 'Attacker not on your board',
      };
    }

    // Check if attacker can attack (not tapped, no summoning sickness)
    if (attacker.isTapped) {
      return {
        success: false,
        error: 'Creature is tapped (already attacked this turn)',
      };
    }

    if (!attacker.canAttack) {
      return {
        success: false,
        error: 'Creature has summoning sickness (cannot attack this turn)',
      };
    }

    return { success: true };
  }

  /**
   * Perform the actual action logic after validation
   */
  private async performAction(action: GameAction): Promise<ActionResult> {
    switch (action.type) {
      case 'play_card':
        return this.playCard(action.data.cardId);
      case 'attack':
        return this.attack(action.data.attackerId, action.data.targetId);
      case 'end_phase':
        await this.advancePhase();
        return { success: true, message: 'Phase advanced' };
      case 'pass_turn':
        await this.endTurn();
        await this.startTurn();
        return { success: true, message: 'Turn passed to opponent' };
      default:
        return {
          success: false,
          error: `Unknown action type: ${action.type}`,
        };
    }
  }

  /**
   * Play a card from hand
   * 1. Deduct mana
   * 2. Remove card from hand
   * 3. Add card to board
   * 4. Set summoning sickness
   *
   * Note: Problem solving integration will be added in step 6
   */
  private async playCard(cardId: string): Promise<ActionResult> {
    const hand =
      this.state.activePlayer === 'player'
        ? this.state.playerHand
        : this.state.opponentHand;

    const board =
      this.state.activePlayer === 'player'
        ? this.state.playerBoard
        : this.state.opponentBoard;

    // Find and remove card from hand
    const cardIndex = hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in hand' };
    }

    const card = hand[cardIndex];

    // Deduct mana
    if (this.state.activePlayer === 'player') {
      this.state.playerMana -= card.cost;
    } else {
      this.state.opponentMana -= card.cost;
    }

    // Remove from hand
    hand.splice(cardIndex, 1);

    // Add to board with summoning sickness
    const playedCard = {
      ...card,
      canAttack: false, // Summoning sickness
      isTapped: false,
    };

    board.push(playedCard);

    console.log(`🎴 ${this.state.activePlayer} played: ${card.name}`);
    console.log(`💎 Mana remaining: ${this.getCurrentMana()}/${this.getCurrentMaxMana()}`);

    return {
      success: true,
      message: `Played ${card.name}`,
    };
  }

  /**
   * Execute an attack
   * Integrates with Battle System for dual problem resolution
   *
   * Note: Full battle integration will be added in step 6
   */
  private async attack(attackerId: string, targetId: string): Promise<ActionResult> {
    console.log(`⚔️  Attack: ${attackerId} → ${targetId}`);

    // Mark attacker as tapped (can't attack again this turn)
    const board =
      this.state.activePlayer === 'player'
        ? this.state.playerBoard
        : this.state.opponentBoard;

    const attacker = board.find((c) => c.id === attackerId);
    if (attacker) {
      attacker.isTapped = true;
    }

    return {
      success: true,
      message: 'Attack initiated (battle resolution pending)',
    };
  }

  /**
   * Draw card for active player
   * Handles fatigue if deck is empty
   */
  private async drawCardForActivePlayer(): Promise<void> {
    const deckState =
      this.state.activePlayer === 'player'
        ? this.state.playerDeckState
        : this.state.opponentDeckState;

    const hand =
      this.state.activePlayer === 'player'
        ? this.state.playerHand
        : this.state.opponentHand;

    const result = drawCard(deckState);

    if (result.success && result.card) {
      // Add card to hand
      hand.push(result.card);
      console.log(`🃏 ${this.state.activePlayer} drew: ${result.card.name}`);
    } else if (result.fatigueDamage) {
      // Apply fatigue damage
      if (this.state.activePlayer === 'player') {
        this.state.playerHealth -= result.fatigueDamage;
        this.state.playerFatigueCounter = deckState.fatigueCounter;
      } else {
        this.state.opponentHealth -= result.fatigueDamage;
        this.state.opponentFatigueCounter = deckState.fatigueCounter;
      }

      console.log(
        `💀 ${this.state.activePlayer} suffers ${result.fatigueDamage} fatigue damage`
      );
    }
  }

  /**
   * End current turn and prepare for opponent's turn
   * 1. Clear temporary effects
   * 2. Remove summoning sickness from creatures
   * 3. Untap all creatures
   * 4. Switch active player
   */
  private async endTurn(): Promise<void> {
    console.log(`🏁 Ending turn ${this.state.turnNumber}`);

    const board =
      this.state.activePlayer === 'player'
        ? this.state.playerBoard
        : this.state.opponentBoard;

    // Remove summoning sickness and untap all creatures
    for (const creature of board) {
      creature.canAttack = true; // Can attack next turn
      creature.isTapped = false; // Untap
    }

    // Switch active player
    this.state.activePlayer =
      this.state.activePlayer === 'player' ? 'opponent' : 'player';

    // Clear actions for new turn
    this.state.actions = [];
  }

  /**
   * Get current mana of active player
   */
  private getCurrentMana(): number {
    return this.state.activePlayer === 'player'
      ? this.state.playerMana
      : this.state.opponentMana;
  }

  /**
   * Get current max mana of active player
   */
  private getCurrentMaxMana(): number {
    return this.state.activePlayer === 'player'
      ? this.state.playerMaxMana
      : this.state.opponentMaxMana;
  }
}

/**
 * Create a new Turn Manager instance with initial game state
 *
 * @param gameId - Unique identifier for the game session
 * @param playerDeck - Player's deck cards
 * @param opponentDeck - Opponent's deck cards
 * @returns Initialized TurnManager instance
 */
export function createTurnManager(
  gameId: string,
  playerDeck: Card[],
  opponentDeck: Card[]
): TurnManager {
  // Initialize deck states
  const playerDeckState = initializeDeck(playerDeck);
  const opponentDeckState = initializeDeck(opponentDeck);

  // Draw starting hands (5 cards each)
  const playerStartingHand = drawMultipleCards(playerDeckState, 5)
    .filter((r) => r.success && r.card)
    .map((r) => r.card!);

  const opponentStartingHand = drawMultipleCards(opponentDeckState, 5)
    .filter((r) => r.success && r.card)
    .map((r) => r.card!);

  // Create initial state
  const initialState: ExtendedGameState = {
    gameId,
    turnNumber: 0,
    activePlayer: 'player', // Player goes first
    currentPhase: 'start',

    // Mana (will be set to 1/1 when first turn starts)
    playerMana: 0,
    playerMaxMana: 0,
    opponentMana: 0,
    opponentMaxMana: 0,

    // Fatigue
    playerFatigueCounter: 0,
    opponentFatigueCounter: 0,

    // Actions
    actions: [],

    // Extended state
    playerDeckState,
    opponentDeckState,
    playerHand: playerStartingHand,
    opponentHand: opponentStartingHand,
    playerBoard: [],
    opponentBoard: [],
    playerHealth: 100,
    opponentHealth: 100,
  };

  return new TurnManager(initialState);
}
