import { Card, ProblemCategory, ElementType } from './game';

// Battle Problem - Generated for each card played
export interface BattleProblem {
  id: string;
  question: string;
  answer: string;
  category: ProblemCategory;
  difficulty: number; // 1-10
  cardId: string;
  cardName: string;
  cardElement: ElementType;
  cardTags?: string[];
  createdAt: Date;
}

// Battle action types
export type BattleActionType = 'play_card' | 'attack' | 'solve_problem' | 'pass_turn';

export interface BattleAction {
  type: BattleActionType;
  cardId?: string; // For play_card or attack actions
  targetPlayerId?: string; // For attack actions
  problemAnswer?: string; // For solve_problem actions
}

// Problem submission result
export interface ProblemSubmissionResult {
  correct: boolean;
  expectedAnswer: string;
  userAnswer: string;
  damage?: number; // Damage dealt if correct
  explanation?: string;
}

// Battle state - Extends GameState with battle-specific fields
export interface BattleState {
  battleId: string;
  playerId: string;
  opponentId: string;

  // Current battle problems (dual problem system)
  playerProblem: BattleProblem | null; // Problem for player's card
  opponentProblem: BattleProblem | null; // Problem for opponent's card

  // Cards involved in current battle
  playerCard: Card | null;
  opponentCard: Card | null;

  // Battle resolution state
  playerAnswered: boolean;
  opponentAnswered: boolean;
  playerAnswer: string | null;
  opponentAnswer: string | null;

  // Battle result
  winner: 'player' | 'opponent' | 'draw' | null;
  playerDamage: number;
  opponentDamage: number;

  // Timestamps
  startedAt: Date;
  resolvedAt: Date | null;
}

// Battle initiation request
export interface InitiateBattleRequest {
  playerCardId: string;
  opponentCardId: string;
}

// Battle initiation response
export interface InitiateBattleResponse {
  battleId: string;
  playerProblem: BattleProblem;
  opponentProblem: BattleProblem;
  playerCard: Card;
  opponentCard: Card;
}

// Battle resolution request
export interface ResolveBattleRequest {
  battleId: string;
  playerAnswer: string;
  opponentAnswer?: string; // Optional for AI opponent (auto-generated)
}

// Battle resolution response
export interface ResolveBattleResponse {
  battleId: string;
  playerResult: ProblemSubmissionResult;
  opponentResult: ProblemSubmissionResult;
  winner: 'player' | 'opponent' | 'draw';
  playerDamage: number;
  opponentDamage: number;
  playerHealthRemaining: number;
  opponentHealthRemaining: number;
}

// Battle damage calculation
export interface DamageCalculation {
  baseDamage: number; // From card power/defense
  accuracyBonus: number; // Bonus for correct answer
  elementalBonus: number; // Bonus for elemental advantage
  totalDamage: number;
}
