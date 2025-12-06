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
 *
 * NOTA: Esta interfaz extiende TurnState que ahora incluye:
 * - combatState: Estado del combate actual (sistema MTG)
 * - playerStreakCount: Racha del jugador
 * - opponentStreakCount: Racha del oponente
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

    // 5. Advance to pre_combat_main Phase (Beginning Phase is automatic)
    // NOTA: En el sistema MTG completo, pasaríamos por untap → upkeep → draw → pre_combat_main
    // Por ahora simplificamos iniciando directamente en pre_combat_main
    this.state.currentPhase = 'pre_combat_main';

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

    if (nextPhase === 'untap') {
      // End Phase completed (cleanup → untap), pass turn to opponent
      // 'untap' es la primera fase del nuevo turno en el sistema MTG
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
      // Nuevos campos del sistema MTG
      combatState: this.state.combatState,
      playerStreakCount: this.state.playerStreakCount,
      opponentStreakCount: this.state.opponentStreakCount,
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
      // Nuevas acciones del sistema MTG de combate
      case 'declare_attacker':
        return this.validateDeclareAttacker(action);
      case 'declare_blocker':
        return this.validateDeclareBlocker(action);
      case 'confirm_attackers':
        if (this.state.currentPhase !== 'declare_attackers') {
          return { success: false, error: 'Can only confirm attackers in declare_attackers phase' };
        }
        return { success: true };
      case 'skip_blockers':
        if (this.state.currentPhase !== 'declare_blockers') {
          return { success: false, error: 'Can only skip blockers in declare_blockers phase' };
        }
        return { success: true };
      case 'submit_combat_answer':
        if (!this.state.combatState) {
          return { success: false, error: 'No active combat to submit answer for' };
        }
        return { success: true };
      case 'use_ability':
        return this.validateUseAbility(action);
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
   * Validate declare_attacker action
   * Checks if the creature can be declared as attacker
   */
  private validateDeclareAttacker(action: GameAction): ActionResult {
    const { cardId } = action.data;

    if (!cardId) {
      return { success: false, error: 'Missing cardId in action data' };
    }

    if (this.state.currentPhase !== 'declare_attackers') {
      return { success: false, error: 'Can only declare attackers in declare_attackers phase' };
    }

    const board = this.getActiveBoard();
    const creature = board.find((c) => c.id === cardId);

    if (!creature) {
      return { success: false, error: 'Creature not on your board' };
    }

    if (creature.isTapped) {
      return { success: false, error: 'Creature is tapped and cannot attack' };
    }

    if (!creature.canAttack) {
      return { success: false, error: 'Creature has summoning sickness' };
    }

    // Check if already declared as attacker
    if (this.state.combatState?.attackers.some((a) => a.attackerId === cardId)) {
      return { success: false, error: 'Creature already declared as attacker' };
    }

    return { success: true };
  }

  /**
   * Validate declare_blocker action
   * Checks if the creature can block the specified attacker
   */
  private validateDeclareBlocker(action: GameAction): ActionResult {
    const { attackerId, blockerId } = action.data;

    if (!attackerId || !blockerId) {
      return { success: false, error: 'Missing attackerId or blockerId in action data' };
    }

    if (this.state.currentPhase !== 'declare_blockers') {
      return { success: false, error: 'Can only declare blockers in declare_blockers phase' };
    }

    if (!this.state.combatState) {
      return { success: false, error: 'No combat state initialized' };
    }

    // Check if attacker exists in combat state
    const attacker = this.state.combatState.attackers.find((a) => a.attackerId === attackerId);
    if (!attacker) {
      return { success: false, error: 'Invalid attacker - not declared as attacking' };
    }

    // Check if blocker is on the defending player's board
    const defenderBoard = this.getDefenderBoard();
    const blocker = defenderBoard.find((c) => c.id === blockerId);

    if (!blocker) {
      return { success: false, error: 'Blocker not on defending board' };
    }

    if (blocker.isTapped) {
      return { success: false, error: 'Tapped creatures cannot block' };
    }

    return { success: true };
  }

  /**
   * Validate use_ability action
   * Checks if the card has an activatable ability
   */
  private validateUseAbility(action: GameAction): ActionResult {
    const { cardId } = action.data;

    if (!cardId) {
      return { success: false, error: 'Missing cardId in action data' };
    }

    const board = this.getActiveBoard();
    const card = board.find((c) => c.id === cardId);

    if (!card) {
      return { success: false, error: 'Card not on your board' };
    }

    // Check if card has an ability
    if (!card.ability) {
      return { success: false, error: 'Card has no ability' };
    }

    // Check if ability was already used this turn
    if (card.abilityUsedThisTurn) {
      return { success: false, error: 'Ability already used this turn' };
    }

    // Check if player has enough mana
    const currentMana = this.getCurrentMana();
    if (currentMana < card.ability.manaCost) {
      return {
        success: false,
        error: `Not enough mana (need ${card.ability.manaCost}, have ${currentMana})`,
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
      // Nuevas acciones del sistema MTG de combate
      case 'declare_attacker':
        return this.declareAttacker(action.data.cardId);
      case 'declare_blocker':
        return this.declareBlocker(action.data.attackerId, action.data.blockerId);
      case 'confirm_attackers':
        this.state.currentPhase = 'declare_blockers';
        return { success: true, message: 'Attackers confirmed, moving to blockers phase' };
      case 'skip_blockers':
        this.state.currentPhase = 'combat_damage';
        return { success: true, message: 'Blockers skipped, resolving combat damage' };
      case 'submit_combat_answer':
        return this.resolveCombatProblem(action.data);
      case 'use_ability':
        return this.activateAbility(action.data.cardId, action.data.targetId);
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
      summonedThisTurn: true, // Track for summoning sickness validation
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
      data: { attackerId, targetId, attacker },
    };
  }

  /**
   * Apply damage to a player
   * @param target - 'player' or 'opponent'
   * @param damage - Amount of damage to apply
   */
  public applyDamage(target: 'player' | 'opponent', damage: number): void {
    if (target === 'player') {
      this.state.playerHealth = Math.max(0, this.state.playerHealth - damage);
      console.log(`💔 Player takes ${damage} damage. Health: ${this.state.playerHealth}`);
    } else {
      this.state.opponentHealth = Math.max(0, this.state.opponentHealth - damage);
      console.log(`💔 Opponent takes ${damage} damage. Health: ${this.state.opponentHealth}`);
    }
  }

  /**
   * Check if game is over (either player at 0 health)
   */
  public isGameOver(): { gameOver: boolean; winner?: 'player' | 'opponent' } {
    if (this.state.playerHealth <= 0) {
      return { gameOver: true, winner: 'opponent' };
    }
    if (this.state.opponentHealth <= 0) {
      return { gameOver: true, winner: 'player' };
    }
    return { gameOver: false };
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
      creature.summonedThisTurn = false; // Reset summoning sickness flag
    }

    // Switch active player
    this.state.activePlayer =
      this.state.activePlayer === 'player' ? 'opponent' : 'player';

    // Clear actions for new turn
    this.state.actions = [];

    // Clear combat state for new turn
    this.state.combatState = null;
  }

  // ========================================================================
  // COMBAT SYSTEM METHODS
  // ========================================================================

  /**
   * Get the active player's board
   */
  private getActiveBoard(): Card[] {
    return this.state.activePlayer === 'player'
      ? this.state.playerBoard
      : this.state.opponentBoard;
  }

  /**
   * Get the defending player's board
   */
  private getDefenderBoard(): Card[] {
    return this.state.activePlayer === 'player'
      ? this.state.opponentBoard
      : this.state.playerBoard;
  }

  /**
   * Initialize combat state when entering begin_combat phase
   */
  public initializeCombatState(): void {
    this.state.combatState = {
      attackers: [],
      blockers: [],
      combatDamageResolved: false,
      combatPhase: 'declaring_attackers',
    };
    console.log('⚔️ Combat state initialized');
  }

  /**
   * Declare a creature as an attacker
   */
  private declareAttacker(cardId: string): ActionResult {
    // Initialize combat state if not already done
    if (!this.state.combatState) {
      this.initializeCombatState();
    }

    const board = this.getActiveBoard();
    const creature = board.find((c) => c.id === cardId);

    if (!creature) {
      return { success: false, error: 'Creature not found on board' };
    }

    // Add to attackers list - target defaults to opponent hero
    this.state.combatState!.attackers.push({
      attackerId: cardId,
      targetId: 'opponent_hero',
      answered: false,
    });

    // Tap the creature
    creature.isTapped = true;

    console.log(`⚔️ ${creature.name} declared as attacker`);

    return {
      success: true,
      message: `${creature.name} declared as attacker`,
      data: { attackerId: cardId, attackerName: creature.name },
    };
  }

  /**
   * Declare a creature as a blocker for a specific attacker
   */
  private declareBlocker(attackerId: string, blockerId: string): ActionResult {
    if (!this.state.combatState) {
      return { success: false, error: 'No combat state initialized' };
    }

    const attacker = this.state.combatState.attackers.find((a) => a.attackerId === attackerId);
    if (!attacker) {
      return { success: false, error: 'Attacker not found in combat' };
    }

    const defenderBoard = this.getDefenderBoard();
    const blocker = defenderBoard.find((c) => c.id === blockerId);

    if (!blocker) {
      return { success: false, error: 'Blocker not found on board' };
    }

    // Update attacker's target to be the blocker instead of hero
    attacker.targetId = blockerId;

    // Add to blockers list
    this.state.combatState.blockers.push({
      blockerId,
      attackerId,
      answered: false,
    });

    // Find attacker creature for logging
    const attackerBoard = this.getActiveBoard();
    const attackerCreature = attackerBoard.find((c) => c.id === attackerId);

    console.log(`🛡️ ${blocker.name} blocks ${attackerCreature?.name || 'attacker'}`);

    return {
      success: true,
      message: `${blocker.name} blocks ${attackerCreature?.name || 'attacker'}`,
      data: { blockerId, attackerId, blockerName: blocker.name },
    };
  }

  /**
   * Resolve a combat problem answer
   * This handles both attacker and defender problem submissions
   */
  private resolveCombatProblem(data: Record<string, any>): ActionResult {
    if (!this.state.combatState) {
      return { success: false, error: 'No combat state to resolve' };
    }

    const { isCorrect, isAttacker, cardId, responseTimeMs } = data;

    if (isAttacker) {
      // Find the attacker and mark problem as answered
      const attacker = this.state.combatState.attackers.find((a) => a.attackerId === cardId);
      if (attacker) {
        attacker.answered = true;
        attacker.answerCorrect = isCorrect;
        attacker.responseTimeMs = responseTimeMs;
        if (isCorrect) {
          console.log(`✅ Attacker solved problem correctly - full damage!`);
        } else {
          console.log(`❌ Attacker failed problem - damage reduced!`);
        }
      }
    } else {
      // Find the blocker and mark problem as answered
      const blocker = this.state.combatState.blockers.find((b) => b.blockerId === cardId);
      if (blocker) {
        blocker.answered = true;
        blocker.answerCorrect = isCorrect;
        blocker.responseTimeMs = responseTimeMs;
        if (isCorrect) {
          console.log(`✅ Defender solved problem correctly - block successful!`);
        } else {
          console.log(`❌ Defender failed problem - block failed!`);
        }
      }
    }

    // Check if all combat problems are resolved
    const allAttackersResolved = this.state.combatState.attackers.every((a) => a.answered);
    const allBlockersResolved = this.state.combatState.blockers.every((b) => b.answered);

    if (allAttackersResolved && allBlockersResolved) {
      // Resolve combat damage
      this.resolveCombatDamage();
    }

    return {
      success: true,
      message: 'Combat problem resolved',
      data: { isCorrect, isAttacker },
    };
  }

  /**
   * Calculate and apply combat damage after all problems are resolved
   */
  private resolveCombatDamage(): void {
    if (!this.state.combatState) return;

    const attackerBoard = this.getActiveBoard();
    const defenderBoard = this.getDefenderBoard();
    let totalDamageToDefender = 0;

    for (const attackerDecl of this.state.combatState.attackers) {
      const attackerCard = attackerBoard.find((c) => c.id === attackerDecl.attackerId);
      if (!attackerCard) continue;

      // Calculate base damage (reduced if answer was wrong)
      const baseDamage = attackerCard.power;
      const damageMultiplier = attackerDecl.answerCorrect ? 1.5 : 0.5;
      const damageToAssign = Math.ceil(baseDamage * damageMultiplier);

      // Check if attacker was blocked
      const blocker = this.state.combatState.blockers.find((b) => b.attackerId === attackerDecl.attackerId);

      if (!blocker || attackerDecl.targetId === 'opponent_hero') {
        // Unblocked attacker - damage goes to defending player
        totalDamageToDefender += damageToAssign;
        console.log(`💥 ${attackerCard.name} deals ${damageToAssign} damage to player`);
      } else {
        // Blocked - damage is dealt to/from blockers
        const blockerCard = defenderBoard.find((c) => c.id === blocker.blockerId);
        if (blockerCard) {
          console.log(`⚔️ ${attackerCard.name} and ${blockerCard.name} clash!`);
          // In a full implementation, we'd remove creatures with damage >= defense
        }
      }
    }

    // Apply damage to defending player
    if (totalDamageToDefender > 0) {
      const defender = this.state.activePlayer === 'player' ? 'opponent' : 'player';
      this.applyDamage(defender, totalDamageToDefender);
    }

    // Mark combat as resolved
    this.state.combatState.combatDamageResolved = true;
    this.state.combatState.combatPhase = 'complete';
    console.log('✅ Combat resolved');
  }

  /**
   * Activate a card's ability
   */
  private activateAbility(cardId: string, targetId?: string): ActionResult {
    const board = this.getActiveBoard();
    const card = board.find((c) => c.id === cardId);

    if (!card || !card.ability) {
      return { success: false, error: 'Card not found or has no ability' };
    }

    const ability = card.ability;

    // Deduct mana
    if (this.state.activePlayer === 'player') {
      this.state.playerMana -= ability.manaCost;
    } else {
      this.state.opponentMana -= ability.manaCost;
    }

    // Mark ability as used
    card.abilityUsedThisTurn = true;

    // Apply ability effect based on target type
    switch (ability.target) {
      case 'enemy_hero':
        this.applyDamage(
          this.state.activePlayer === 'player' ? 'opponent' : 'player',
          ability.damage
        );
        break;

      case 'self_heal':
        if (this.state.activePlayer === 'player') {
          this.state.playerHealth = Math.min(100, this.state.playerHealth + ability.damage);
        } else {
          this.state.opponentHealth = Math.min(100, this.state.opponentHealth + ability.damage);
        }
        break;

      case 'all_enemies': {
        const enemyBoard = this.getDefenderBoard();
        for (const creature of enemyBoard) {
          creature.defense -= ability.damage;
        }
        // Remove dead creatures
        if (this.state.activePlayer === 'player') {
          this.state.opponentBoard = this.state.opponentBoard.filter((c) => c.defense > 0);
        } else {
          this.state.playerBoard = this.state.playerBoard.filter((c) => c.defense > 0);
        }
        break;
      }

      case 'enemy_creature': {
        const enemyBoard = this.getDefenderBoard();
        const target = targetId
          ? enemyBoard.find((c) => c.id === targetId)
          : enemyBoard[0];
        if (target) {
          target.defense -= ability.damage;
          if (target.defense <= 0) {
            if (this.state.activePlayer === 'player') {
              this.state.opponentBoard = this.state.opponentBoard.filter((c) => c.id !== target.id);
            } else {
              this.state.playerBoard = this.state.playerBoard.filter((c) => c.id !== target.id);
            }
          }
        }
        break;
      }
    }

    console.log(`✨ ${card.name} used ${ability.name}: ${ability.description}`);

    return {
      success: true,
      message: `${card.name} used ${ability.name}`,
      data: { cardId, abilityName: ability.name, damage: ability.damage },
    };
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

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
  // NOTA: Usamos 'untap' como fase inicial ya que es la primera del sistema MTG
  // El método startTurn() procesa automáticamente las fases de Beginning Phase
  const initialState: ExtendedGameState = {
    gameId,
    turnNumber: 0,
    activePlayer: 'player', // Player goes first
    currentPhase: 'untap', // Primera fase del sistema MTG

    // Mana (will be set to 1/1 when first turn starts)
    playerMana: 0,
    playerMaxMana: 0,
    opponentMana: 0,
    opponentMaxMana: 0,

    // Fatigue
    playerFatigueCounter: 0,
    opponentFatigueCounter: 0,

    // Sistema MTG - Estado de combate (null cuando no hay combate)
    combatState: null,

    // Sistema de Streak (racha de aciertos)
    playerStreakCount: 0,
    opponentStreakCount: 0,

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
