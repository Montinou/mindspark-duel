/**
 * Card Evaluator for AI Opponent
 *
 * Evaluates cards in AI's hand and assigns value scores based on game state.
 * Higher value = more desirable to play.
 */

import { Card } from '@/types/game';
import { ExtendedGameState } from '@/lib/game/turn-manager';
import { CardEvaluation } from '@/types/ai';

/**
 * Calculate base value for a card
 */
function calculateBaseValue(card: Card): number {
  // For creatures: (Power + Defense) * 2
  // For now, all cards are creatures in Mindspark Duel
  return (card.power + card.defense) * 2;
}

/**
 * Calculate situation bonus based on current game state
 */
function calculateSituationBonus(
  card: Card,
  gameState: ExtendedGameState
): { bonus: number; reason: string } {
  let bonus = 0;
  const reasons: string[] = [];

  // On-curve bonus: +5 if card cost equals current mana
  if (card.cost === gameState.opponentMana) {
    bonus += 5;
    reasons.push('on-curve');
  }

  // Strong card bonus: +10 if card has high combined stats
  const statTotal = card.power + card.defense;
  if (statTotal >= 10) {
    bonus += 10;
    reasons.push('strong-stats');
  }

  // Could remove player's strongest creature
  if (gameState.playerBoard.length > 0) {
    const strongestPlayerCreature = gameState.playerBoard.reduce((max, c) =>
      c.power > max.power ? c : max
    );

    // If this card can trade favorably or remove threat
    if (card.power >= strongestPlayerCreature.defense) {
      bonus += 10;
      reasons.push('threat-removal');
    }
  }

  // Board control bonus: +5 if player has more creatures
  if (
    gameState.playerBoard.length > gameState.opponentBoard.length &&
    gameState.opponentBoard.length < 5
  ) {
    bonus += 5;
    reasons.push('board-control');
  }

  // Winning move: +100 if this could win the game
  // (Check if combined damage with board could kill player)
  const totalBoardPower = gameState.opponentBoard.reduce(
    (sum, c) => sum + c.power,
    0
  );
  if (totalBoardPower + card.power >= gameState.playerHealth) {
    bonus += 100;
    reasons.push('LETHAL');
  }

  return {
    bonus,
    reason: reasons.join(', '),
  };
}

/**
 * Evaluate a single card and return its value score
 */
export function evaluateCard(
  card: Card,
  gameState: ExtendedGameState
): CardEvaluation {
  const baseValue = calculateBaseValue(card);
  const { bonus: situationBonus, reason } =
    calculateSituationBonus(card, gameState);
  const costPenalty = card.cost * -1;

  const totalValue = baseValue + situationBonus + costPenalty;

  return {
    cardId: card.id,
    value: totalValue,
    reasoning: `Base: ${baseValue}, Situation: +${situationBonus} (${reason}), Cost: ${costPenalty} → Total: ${totalValue}`,
  };
}

/**
 * Filter cards by mana cost (only playable cards)
 */
export function getPlayableCards(hand: Card[], mana: number): Card[] {
  return hand.filter((card) => card.cost <= mana);
}

/**
 * Select the best card to play from hand
 * Returns null if no playable cards
 */
export function selectBestCard(
  hand: Card[],
  gameState: ExtendedGameState
): { card: Card; evaluation: CardEvaluation } | null {
  const playableCards = getPlayableCards(hand, gameState.opponentMana);

  if (playableCards.length === 0) {
    return null;
  }

  // Evaluate all playable cards
  const evaluations = playableCards.map((card) => ({
    card,
    evaluation: evaluateCard(card, gameState),
  }));

  // Sort by value (highest first)
  evaluations.sort((a, b) => b.evaluation.value - a.evaluation.value);

  // Return the best card
  return evaluations[0];
}

/**
 * Evaluate all cards in hand (for debugging/logging)
 */
export function evaluateAllCards(
  hand: Card[],
  gameState: ExtendedGameState
): CardEvaluation[] {
  return hand.map((card) => evaluateCard(card, gameState));
}
