/**
 * Deck Service
 *
 * Handles card drawing mechanics and fatigue system according to game rules:
 * - Players draw 5 cards at game start
 * - Players draw 1 card at start of each turn
 * - If deck is empty, apply progressive fatigue damage (1, 2, 3, 4, ...)
 *
 * This module is pure and deterministic - it operates on game state data
 * without side effects on the database.
 */

import { Card } from '@/types/game';

/**
 * Result of attempting to draw a card
 */
export interface DrawCardResult {
  success: boolean;
  card?: Card;
  fatigueDamage?: number;
  message?: string;
}

/**
 * Represents a player's deck state
 */
export interface DeckState {
  cards: Card[]; // Remaining cards in deck (ordered)
  drawnCards: Card[]; // Cards drawn this session (for history)
  fatigueCounter: number; // Tracks fatigue damage progression
}

/**
 * Draw a single card from the deck
 *
 * @param deckState - Current state of the player's deck
 * @returns Result indicating success or fatigue damage
 */
export function drawCard(deckState: DeckState): DrawCardResult {
  // Check if deck is empty
  if (deckState.cards.length === 0) {
    // Increment fatigue counter
    deckState.fatigueCounter += 1;
    const fatigueDamage = deckState.fatigueCounter;

    return {
      success: false,
      fatigueDamage,
      message: `Deck empty! Fatigue damage: ${fatigueDamage}`,
    };
  }

  // Draw the top card (first in array)
  const drawnCard = deckState.cards.shift();

  if (!drawnCard) {
    throw new Error('Failed to draw card - deck state inconsistent');
  }

  // Add to drawn cards history
  deckState.drawnCards.push(drawnCard);

  return {
    success: true,
    card: drawnCard,
    message: `Drew card: ${drawnCard.name}`,
  };
}

/**
 * Draw multiple cards at once (e.g., starting hand of 5 cards)
 *
 * @param deckState - Current state of the player's deck
 * @param count - Number of cards to draw
 * @returns Array of draw results (may include fatigue if deck runs out)
 */
export function drawMultipleCards(
  deckState: DeckState,
  count: number
): DrawCardResult[] {
  const results: DrawCardResult[] = [];

  for (let i = 0; i < count; i++) {
    const result = drawCard(deckState);
    results.push(result);
  }

  return results;
}

/**
 * Calculate total fatigue damage from draw results
 *
 * @param drawResults - Array of draw results
 * @returns Total fatigue damage taken
 */
export function calculateTotalFatigueDamage(drawResults: DrawCardResult[]): number {
  return drawResults.reduce((total, result) => {
    return total + (result.fatigueDamage || 0);
  }, 0);
}

/**
 * Initialize a shuffled deck from a list of cards
 *
 * @param cards - Array of cards to create deck from
 * @returns Initial deck state with shuffled cards
 */
export function initializeDeck(cards: Card[]): DeckState {
  // Shuffle cards using Fisher-Yates algorithm
  const shuffledCards = shuffleArray([...cards]);

  return {
    cards: shuffledCards,
    drawnCards: [],
    fatigueCounter: 0,
  };
}

/**
 * Fisher-Yates shuffle algorithm
 * Returns a new shuffled array without mutating the original
 *
 * @param array - Array to shuffle
 * @returns New shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Get the number of cards remaining in deck
 *
 * @param deckState - Current deck state
 * @returns Number of cards left
 */
export function getDeckCount(deckState: DeckState): number {
  return deckState.cards.length;
}

/**
 * Check if deck is empty
 *
 * @param deckState - Current deck state
 * @returns true if no cards remain, false otherwise
 */
export function isDeckEmpty(deckState: DeckState): boolean {
  return deckState.cards.length === 0;
}

/**
 * Get the next fatigue damage (without actually drawing)
 * Useful for UI to show "Next draw will cause X fatigue damage"
 *
 * @param deckState - Current deck state
 * @returns Next fatigue damage amount if deck is empty, 0 otherwise
 */
export function getNextFatigueDamage(deckState: DeckState): number {
  if (isDeckEmpty(deckState)) {
    return deckState.fatigueCounter + 1;
  }
  return 0;
}

/**
 * Reset fatigue counter (e.g., for new game or special card effect)
 *
 * @param deckState - Current deck state
 */
export function resetFatigue(deckState: DeckState): void {
  deckState.fatigueCounter = 0;
}

/**
 * Peek at the top N cards of the deck without drawing them
 * Useful for card abilities like "Look at top 3 cards"
 *
 * @param deckState - Current deck state
 * @param count - Number of cards to peek at
 * @returns Array of cards at the top of the deck (up to count)
 */
export function peekTopCards(deckState: DeckState, count: number): Card[] {
  return deckState.cards.slice(0, count);
}

/**
 * Add cards to the bottom of the deck
 * Used for card effects like "Shuffle this card into your deck"
 *
 * @param deckState - Current deck state
 * @param cards - Cards to add to bottom of deck
 */
export function addToBottomOfDeck(deckState: DeckState, cards: Card[]): void {
  deckState.cards.push(...cards);
}

/**
 * Add cards to the top of the deck
 * Used for card effects like "Put this card on top of your deck"
 *
 * @param deckState - Current deck state
 * @param cards - Cards to add to top of deck
 */
export function addToTopOfDeck(deckState: DeckState, cards: Card[]): void {
  deckState.cards.unshift(...cards);
}

/**
 * Validate deck size and composition
 * Game rules: Decks should be 20-30 cards
 *
 * @param cards - Cards to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateDeck(cards: Card[]): {
  isValid: boolean;
  error?: string;
} {
  const MIN_DECK_SIZE = 20;
  const MAX_DECK_SIZE = 30;

  if (cards.length < MIN_DECK_SIZE) {
    return {
      isValid: false,
      error: `Deck too small: ${cards.length} cards (minimum ${MIN_DECK_SIZE})`,
    };
  }

  if (cards.length > MAX_DECK_SIZE) {
    return {
      isValid: false,
      error: `Deck too large: ${cards.length} cards (maximum ${MAX_DECK_SIZE})`,
    };
  }

  return { isValid: true };
}

/**
 * Get deck statistics (useful for debugging and UI)
 *
 * @param deckState - Current deck state
 * @returns Object with deck statistics
 */
export function getDeckStats(deckState: DeckState): {
  cardsRemaining: number;
  cardsDrawn: number;
  fatigueCounter: number;
  isEmpty: boolean;
  nextFatigueDamage: number;
} {
  return {
    cardsRemaining: getDeckCount(deckState),
    cardsDrawn: deckState.drawnCards.length,
    fatigueCounter: deckState.fatigueCounter,
    isEmpty: isDeckEmpty(deckState),
    nextFatigueDamage: getNextFatigueDamage(deckState),
  };
}
