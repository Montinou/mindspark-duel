/**
 * AI Opponent Type Definitions
 *
 * Types for "The Dark Quizmaster" AI system
 */

export type AIDifficulty = 'easy' | 'normal' | 'hard';

export interface AIState {
  gameId: string;
  difficulty: AIDifficulty;
  personality: 'aggressive' | 'defensive' | 'balanced';
  thinkingDelay: boolean; // Enable/disable thinking delays
}

export interface CardEvaluation {
  cardId: string;
  value: number;
  reasoning: string; // For debugging
}

export interface AIDecision {
  type: 'play_card' | 'attack' | 'end_turn';
  cardId?: string;
  targetId?: string;
  reasoning: string;
}

export interface LethalCheckResult {
  hasLethal: boolean;
  totalDamage?: number;
  actions?: AIDecision[];
}

export interface SurvivalCheckResult {
  isThreatenedLethal: boolean;
  estimatedDamage?: number;
  defensiveActions?: AIDecision[];
}

export interface CombatTarget {
  attackerId: string;
  targetId: string | 'face'; // 'face' = player's HP
  expectedDamage: number;
  reasoning: string;
}
