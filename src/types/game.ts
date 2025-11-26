export type ElementType = 'Fire' | 'Water' | 'Earth' | 'Air';
export type ProblemCategory = 'Math' | 'Logic' | 'Science';
export type Phase = 'start' | 'draw' | 'main' | 'combat' | 'end';

export interface CardBatch {
  id: string;
  name: string;
  theme: string;
  description?: string;
  styleGuidelines?: string;
  createdById?: string;
  createdAt: Date;
}

export interface Card {
  id: string;
  name: string;
  description: string; // Flavor text - thematic narrative
  flavorText?: string; // Thematic narrative text (alias)
  effectDescription?: string; // Game mechanics description
  cost: number;
  power: number;
  defense: number;
  element: ElementType;
  problemCategory: ProblemCategory;
  imageUrl?: string;
  imagePrompt?: string; // For regeneration/debugging
  theme?: string; // Thematic category (e.g., "Dragons", "Samurai")
  tags?: string[]; // Array of thematic tags
  batchId?: string; // Link to batch
  batchOrder?: number; // Position in batch (1-10)
  createdById?: string;
  createdAt?: Date;

  // Problem Generation Hints - used to dynamically generate problems when card is played
  problemHints?: ProblemHints;

  // Game State Properties
  canAttack?: boolean;
  isTapped?: boolean; // Exhausted

  // Ability System
  ability?: CardAbility;
  abilityUsedThisTurn?: boolean;
}

/**
 * Problem generation hints - stored on card, used to generate unique problems each play
 */
export interface ProblemHints {
  keywords: string[]; // Thematic keywords for problem context (e.g., "volcano", "eruption", "lava")
  difficulty: number; // 1-10, complexity level
  subCategory?: string; // More specific category (e.g., "algebra", "geometry", "physics")
  contextType?: 'fantasy' | 'real_world' | 'abstract'; // How to frame the problem
  suggestedTopics?: string[]; // Optional specific topics (e.g., "fractions", "velocity")
}

/**
 * Card ability - simple damage-based abilities with mana cost
 */
export interface CardAbility {
  name: string;
  manaCost: number;
  damage: number;
  target: 'enemy_hero' | 'enemy_creature' | 'all_enemies' | 'self_heal';
  description: string;
}

export interface Problem {
  question: string;
  options: string[];
  correctAnswer: string; // Index or value
  difficulty: number; // 1-10
  themeContext?: string; // Context for thematic problems
  cardId?: string; // Link to card
}

export interface Player {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  hand: Card[];
  board: Card[]; // Cards in play
  deck: number; // Count of cards remaining in deck
}

export interface GameState {
  turn: number;
  player: Player;
  enemy: Player;
  currentPhase: Phase;
  activeProblem: Problem | null;
  pendingCard: Card | null; // Card waiting for problem resolution
  winner: 'player' | 'enemy' | null;
}

// ═══════════════════════════════════════════════════════════════════════
// TURN MANAGER TYPES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Phase types for turn management (aligned with game rules)
 * 'start' -> 'main' -> 'combat' -> 'end'
 */
export type PhaseType = 'start' | 'main' | 'combat' | 'end';

/**
 * Complete state of a turn in the game
 * This is the single source of truth for turn progression
 */
export interface TurnState {
  gameId: string;
  turnNumber: number;
  activePlayer: 'player' | 'opponent';
  currentPhase: PhaseType;

  // Mana tracking
  playerMana: number;
  playerMaxMana: number;
  opponentMana: number;
  opponentMaxMana: number;

  // Fatigue tracking (for empty deck draws)
  playerFatigueCounter: number;
  opponentFatigueCounter: number;

  // Action history for this turn
  actions: GameAction[];
}

/**
 * Types of actions a player can take during a turn
 */
export type GameActionType =
  | 'play_card'       // Play a card from hand (Main Phase only)
  | 'attack'          // Attack with a creature (Combat Phase only)
  | 'use_ability'     // Use a creature's ability (Main or Combat Phase)
  | 'end_phase'       // Manually end current phase
  | 'pass_turn';      // Pass turn to opponent

/**
 * Represents a single action taken by a player
 */
export interface GameAction {
  type: GameActionType;
  playerId: string;
  timestamp: Date;
  data: Record<string, any>; // Action-specific data (cardId, targetId, etc.)
}

/**
 * Result of executing a game action
 */
export interface ActionResult {
  success: boolean;
  message?: string;
  updatedState?: TurnState;
  error?: string;
  data?: Record<string, any>; // Action-specific return data
}
