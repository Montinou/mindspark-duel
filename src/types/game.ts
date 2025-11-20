export type ElementType = 'Fire' | 'Water' | 'Earth' | 'Air';
export type ProblemCategory = 'Math' | 'Logic' | 'Science';

export interface Card {
  id: string;
  name: string;
  description: string;
  cost: number;
  power: number;
  defense: number; // Or health for creatures
  element: ElementType;
  problemCategory: ProblemCategory;
  imageUrl?: string;
}

export interface Problem {
  question: string;
  options: string[];
  correctAnswer: string; // Index or value
  difficulty: number; // 1-10
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
}

export interface GameState {
  turn: number;
  player: Player;
  enemy: Player;
  currentPhase: 'draw' | 'main' | 'combat' | 'end';
  activeProblem: Problem | null;
  pendingCard: Card | null; // Card waiting for problem resolution
  winner: 'player' | 'enemy' | null;
}
