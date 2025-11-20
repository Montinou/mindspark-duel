export type ElementType = 'Fire' | 'Water' | 'Earth' | 'Air';
export type ProblemCategory = 'Math' | 'Logic' | 'Science';

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
