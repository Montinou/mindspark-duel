/**
 * Combat Phase UI Components
 *
 * This module provides all UI components for the MTG 12-phase combat system.
 * Components are designed to be integrated directly into Battlefield.tsx
 * without full-screen overlays (except for the problem modal).
 */

// Main components
export { CombatArrow } from './CombatArrow';
export { AttackerIndicator } from './AttackerIndicator';
export {
  BlockerAssignmentUI,
  BlockerCardOverlay,
  AttackerTargetOverlay,
} from './BlockerAssignmentUI';
export { CombatProblemModal } from './CombatProblemModal';
export { CombatOverlay } from './CombatOverlay';

// Animation utilities
export {
  // Spring configs
  SPRING_SNAPPY,
  SPRING_BOUNCY,
  SPRING_GENTLE,
  // Attacker animations
  attackerGlow,
  attackerRingPulse,
  // Blocker animations
  blockerPulse,
  blockerShieldBounce,
  // Combat feedback
  damageShake,
  correctFlash,
  incorrectFlash,
  // Selection animations
  selectableHover,
  selectPop,
  // Overlay animations
  slideUpFade,
  slideDownFade,
  modalScale,
  backdropFade,
  // Timer animations
  timerProgress,
  timerUrgency,
  // CSS classes
  combatStateClasses,
  type CombatStateClass,
} from './CombatAnimations';
