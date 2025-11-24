/**
 * Decision Maker for AI Opponent
 *
 * Core AI logic using priority-based decision framework:
 * Priority 1: Lethal Check - Can AI win this turn?
 * Priority 2: Survival Check - Does player have lethal next turn?
 * Priority 3: Tempo Play - Play cards efficiently
 * Priority 4: Combat - Attack strategically
 * Priority 5: End Turn - No more useful actions
 */

import { ExtendedGameState } from '@/lib/game/turn-manager';
import { Card } from '@/types/game';
import {
  AIState,
  AIDecision,
  LethalCheckResult,
  SurvivalCheckResult,
  CombatTarget,
} from '@/types/ai';
import { selectBestCard } from './card-evaluator';

/**
 * Priority 1: Check if AI can win this turn (lethal)
 */
export function checkLethal(gameState: ExtendedGameState): LethalCheckResult {
  // Calculate total potential damage from board + hand
  const boardDamage = gameState.opponentBoard.reduce(
    (sum, card) => sum + card.power,
    0
  );

  // For simplicity, assume hand cards can contribute damage equal to their power
  // (in reality, would need to account for mana cost and card effects)
  const playableHandDamage = gameState.opponentHand
    .filter((card) => card.cost <= gameState.opponentMana)
    .reduce((sum, card) => sum + card.power, 0);

  const totalDamage = boardDamage + playableHandDamage;

  if (totalDamage >= gameState.playerHealth) {
    console.log(`🎯 LETHAL DETECTED! Total damage: ${totalDamage} >= Player HP: ${gameState.playerHealth}`);

    // Generate lethal sequence: play all affordable damage cards, then attack face
    const actions: AIDecision[] = [];

    // Play all affordable cards
    gameState.opponentHand
      .filter((card) => card.cost <= gameState.opponentMana)
      .forEach((card) => {
        actions.push({
          type: 'play_card',
          cardId: card.id,
          reasoning: 'LETHAL: Play all cards for face damage',
        });
      });

    // Attack with all creatures on board
    gameState.opponentBoard.forEach((card) => {
      actions.push({
        type: 'attack',
        cardId: card.id,
        targetId: 'face',
        reasoning: 'LETHAL: Attack face for kill',
      });
    });

    return {
      hasLethal: true,
      totalDamage,
      actions,
    };
  }

  return { hasLethal: false };
}

/**
 * Priority 2: Check if player has lethal next turn (survival check)
 */
export function checkSurvival(
  gameState: ExtendedGameState
): SurvivalCheckResult {
  // Estimate player's potential damage next turn
  const playerBoardDamage = gameState.playerBoard.reduce(
    (sum, card) => sum + card.power,
    0
  );

  // Assume player might draw and play one more creature (estimate +5 power)
  const estimatedPlayerDamage = playerBoardDamage + 5;

  if (estimatedPlayerDamage >= gameState.opponentHealth) {
    console.log(
      `⚠️  SURVIVAL THREAT! Estimated player damage: ${estimatedPlayerDamage} >= AI HP: ${gameState.opponentHealth}`
    );

    // Generate defensive actions
    const defensiveActions: AIDecision[] = [];

    // Priority: Remove player's strongest creatures
    const sortedThreats = [...gameState.playerBoard].sort(
      (a, b) => b.power - a.power
    );

    sortedThreats.forEach((threat) => {
      // Find AI creatures that can kill this threat
      const canKill = gameState.opponentBoard.filter(
        (aiCard) => aiCard.power >= threat.defense
      );

      if (canKill.length > 0) {
        defensiveActions.push({
          type: 'attack',
          cardId: canKill[0].id,
          targetId: threat.id,
          reasoning: `SURVIVAL: Kill threatening ${threat.name} (${threat.power} power)`,
        });
      }
    });

    return {
      isThreatenedLethal: true,
      estimatedDamage: estimatedPlayerDamage,
      defensiveActions,
    };
  }

  return { isThreatenedLethal: false };
}

/**
 * Priority 3: Tempo Play - Select best card to play from hand
 */
export function selectTempoPlay(
  gameState: ExtendedGameState
): AIDecision | null {
  const bestCardResult = selectBestCard(
    gameState.opponentHand,
    gameState
  );

  if (!bestCardResult) {
    return null; // No playable cards
  }

  const { card, evaluation } = bestCardResult;

  return {
    type: 'play_card',
    cardId: card.id,
    reasoning: `Tempo: ${evaluation.reasoning}`,
  };
}

/**
 * Priority 4: Combat - Select targets for attacking
 */
export function selectCombatTargets(
  gameState: ExtendedGameState
): CombatTarget[] {
  const targets: CombatTarget[] = [];

  // If player has no creatures, attack face with all
  if (gameState.playerBoard.length === 0) {
    gameState.opponentBoard.forEach((attacker) => {
      targets.push({
        attackerId: attacker.id,
        targetId: 'face',
        expectedDamage: attacker.power,
        reasoning: 'No blockers - attack face',
      });
    });
    return targets;
  }

  // If player has small creatures (power ≤ 3), attack face and ignore them
  const hasOnlySmallCreatures = gameState.playerBoard.every(
    (c) => c.power <= 3
  );
  if (hasOnlySmallCreatures) {
    gameState.opponentBoard.forEach((attacker) => {
      targets.push({
        attackerId: attacker.id,
        targetId: 'face',
        expectedDamage: attacker.power,
        reasoning: 'Only small blockers - attack face',
      });
    });
    return targets;
  }

  // If player has large creatures (power ≥ 5), trade favorably
  const largeCreatures = gameState.playerBoard.filter((c) => c.power >= 5);

  gameState.opponentBoard.forEach((attacker) => {
    // Check if this attacker can kill a large creature without dying
    const canKillSafely = largeCreatures.find(
      (target) =>
        attacker.power >= target.defense && target.power < attacker.defense
    );

    if (canKillSafely) {
      targets.push({
        attackerId: attacker.id,
        targetId: canKillSafely.id,
        expectedDamage: attacker.power,
        reasoning: `Favorable trade: Kill ${canKillSafely.name} (${canKillSafely.power}/${canKillSafely.defense})`,
      });
    } else {
      // Default: attack face if unsure
      targets.push({
        attackerId: attacker.id,
        targetId: 'face',
        expectedDamage: attacker.power,
        reasoning: 'No favorable trades - attack face',
      });
    }
  });

  return targets;
}

/**
 * Main decision function - uses priority-based framework
 */
export function makeDecision(
  gameState: ExtendedGameState,
  aiState: AIState,
  currentPhase: 'main' | 'combat' | 'end'
): AIDecision | null {
  // Priority 1: Lethal Check (only in combat phase)
  if (currentPhase === 'combat') {
    const lethalCheck = checkLethal(gameState);
    if (lethalCheck.hasLethal && lethalCheck.actions) {
      return lethalCheck.actions[0]; // Return first lethal action
    }
  }

  // Priority 2: Survival Check (in main or combat phase)
  if (currentPhase === 'main' || currentPhase === 'combat') {
    const survivalCheck = checkSurvival(gameState);
    if (survivalCheck.isThreatenedLethal && survivalCheck.defensiveActions) {
      return survivalCheck.defensiveActions[0]; // Return first defensive action
    }
  }

  // Priority 3: Tempo Play (only in main phase)
  if (currentPhase === 'main') {
    return selectTempoPlay(gameState);
  }

  // Priority 4: Combat (only in combat phase)
  if (currentPhase === 'combat') {
    const targets = selectCombatTargets(gameState);
    if (targets.length > 0) {
      return {
        type: 'attack',
        cardId: targets[0].attackerId,
        targetId: targets[0].targetId,
        reasoning: targets[0].reasoning,
      };
    }
  }

  // Priority 5: End Turn (no more useful actions)
  return {
    type: 'end_turn',
    reasoning: 'No more useful actions available',
  };
}
