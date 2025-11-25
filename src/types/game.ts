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
  description: string; // Kept for backwards compatibility
  flavorText?: string; // Thematic narrative text
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
  
  // Game State Properties
  canAttack?: boolean;
  isTapped?: boolean; // Exhausted
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
