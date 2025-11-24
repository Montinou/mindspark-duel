/**
 * Phase Controller
 *
 * Pure, deterministic module that handles phase transitions and validates
 * actions per phase. No side effects.
 *
 * Game rules enforce sequential phase progression:
 * 'start' -> 'main' -> 'combat' -> 'end' -> (back to 'start' for next turn)
 */

import { PhaseType, GameActionType } from '@/types/game';

/**
 * Get the next phase in sequence
 * If current phase is 'end', returns 'start' (indicating turn should pass to opponent)
 *
 * @param currentPhase - The current phase
 * @returns The next phase in the sequence
 * @throws Error if currentPhase is invalid
 */
export function getNextPhase(currentPhase: PhaseType): PhaseType {
  const sequence: PhaseType[] = ['start', 'main', 'combat', 'end'];
  const currentIndex = sequence.indexOf(currentPhase);

  if (currentIndex === -1) {
    throw new Error(`Invalid phase: ${currentPhase}`);
  }

  // If at end, wrap to start (signals turn pass)
  if (currentIndex === sequence.length - 1) {
    return 'start';
  }

  return sequence[currentIndex + 1];
}

/**
 * Get the previous phase in sequence (for undo functionality)
 * If current phase is 'start', returns 'end'
 *
 * @param currentPhase - The current phase
 * @returns The previous phase in the sequence
 */
export function getPreviousPhase(currentPhase: PhaseType): PhaseType {
  const sequence: PhaseType[] = ['start', 'main', 'combat', 'end'];
  const currentIndex = sequence.indexOf(currentPhase);

  if (currentIndex === -1) {
    throw new Error(`Invalid phase: ${currentPhase}`);
  }

  // If at start, wrap to end
  if (currentIndex === 0) {
    return 'end';
  }

  return sequence[currentIndex - 1];
}

/**
 * Check if an action type is allowed in a given phase
 *
 * Phase restrictions (from game rules):
 * - Start Phase: No manual actions (automatic: recharge mana, draw card, increment maxMana)
 * - Main Phase: play_card, end_phase
 * - Combat Phase: attack, end_phase
 * - End Phase: No manual actions (automatic: cleanup, remove summoning sickness, pass turn)
 *
 * @param actionType - The type of action being attempted
 * @param phase - The current phase
 * @returns true if action is allowed in this phase, false otherwise
 */
export function isActionAllowedInPhase(
  actionType: GameActionType,
  phase: PhaseType
): boolean {
  const phaseRules: Record<PhaseType, GameActionType[]> = {
    start: [], // No manual actions in Start Phase (automatic)
    main: ['play_card', 'end_phase'],
    combat: ['attack', 'end_phase'],
    end: [], // No manual actions in End Phase (automatic)
  };

  const allowedActions = phaseRules[phase] || [];
  return allowedActions.includes(actionType);
}

/**
 * Get a human-readable description of what actions are allowed in a phase
 *
 * @param phase - The phase to describe
 * @returns A string describing allowed actions
 */
export function getPhaseDescription(phase: PhaseType): string {
  const descriptions: Record<PhaseType, string> = {
    start: 'Automatic: Recharge mana, draw card, increment max mana',
    main: 'You can play cards from your hand',
    combat: 'You can attack with your creatures',
    end: 'Automatic: Cleanup effects, remove summoning sickness, pass turn',
  };

  return descriptions[phase] || 'Unknown phase';
}

/**
 * Get the list of allowed actions for a given phase
 *
 * @param phase - The phase to query
 * @returns Array of allowed action types
 */
export function getAllowedActions(phase: PhaseType): GameActionType[] {
  const phaseRules: Record<PhaseType, GameActionType[]> = {
    start: [],
    main: ['play_card', 'end_phase'],
    combat: ['attack', 'end_phase'],
    end: [],
  };

  return phaseRules[phase] || [];
}

/**
 * Check if a phase is automatic (no player input required)
 *
 * @param phase - The phase to check
 * @returns true if phase is automatic, false if it requires player input
 */
export function isAutomaticPhase(phase: PhaseType): boolean {
  return phase === 'start' || phase === 'end';
}

/**
 * Phase hooks interface for future extensibility
 * Can be used to add phase-specific effects or triggers
 */
export interface PhaseHooks {
  onEnterPhase?: (phase: PhaseType) => void | Promise<void>;
  onExitPhase?: (phase: PhaseType) => void | Promise<void>;
}

/**
 * Get phase hooks (for future extensibility)
 *
 * @param phase - The phase to get hooks for
 * @returns Object with optional hook functions
 */
export function getPhaseHooks(phase: PhaseType): PhaseHooks {
  // Future: Add phase-specific hooks here
  // Example: onEnterCombat, onExitMain, etc.
  return {};
}

/**
 * Validate a complete phase sequence
 * Useful for testing or verifying game state integrity
 *
 * @param phases - Array of phases to validate
 * @returns true if sequence is valid (follows start->main->combat->end pattern)
 */
export function validatePhaseSequence(phases: PhaseType[]): boolean {
  if (phases.length === 0) return true;

  for (let i = 0; i < phases.length - 1; i++) {
    const current = phases[i];
    const next = phases[i + 1];
    const expectedNext = getNextPhase(current);

    // If we're at 'end', next should be 'start' (new turn)
    // Otherwise, next should match expectedNext
    if (next !== expectedNext) {
      return false;
    }
  }

  return true;
}
