'use client';

import type { Variants, Transition } from 'framer-motion';

/**
 * Shared animation configurations for combat UI
 * Consistent with existing motion patterns in Card.tsx and PhaseIndicator.tsx
 */

// ============================================================================
// SPRING CONFIGURATIONS
// ============================================================================

export const SPRING_SNAPPY: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
};

export const SPRING_BOUNCY: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 20,
};

export const SPRING_GENTLE: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 30,
};

// ============================================================================
// ATTACKER ANIMATIONS
// ============================================================================

/** Red pulsing glow for selected attackers */
export const attackerGlow: Variants = {
  initial: {
    boxShadow: '0 0 0 rgba(239, 68, 68, 0)',
  },
  animate: {
    boxShadow: [
      '0 0 15px rgba(239, 68, 68, 0.4)',
      '0 0 30px rgba(239, 68, 68, 0.7)',
      '0 0 15px rgba(239, 68, 68, 0.4)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/** Ring pulse for attack indicator badge */
export const attackerRingPulse: Variants = {
  initial: { scale: 1, opacity: 0.7 },
  animate: {
    scale: [1, 1.3, 1],
    opacity: [0.7, 0.3, 0.7],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================================================
// BLOCKER ANIMATIONS
// ============================================================================

/** Blue pulsing border for selected blockers */
export const blockerPulse: Variants = {
  initial: {
    boxShadow: '0 0 0 rgba(59, 130, 246, 0)',
    scale: 1,
  },
  animate: {
    boxShadow: [
      '0 0 10px rgba(59, 130, 246, 0.4)',
      '0 0 25px rgba(59, 130, 246, 0.7)',
      '0 0 10px rgba(59, 130, 246, 0.4)',
    ],
    scale: [1, 1.02, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/** Shield icon animation for blockers */
export const blockerShieldBounce: Variants = {
  initial: { scale: 0, rotate: -15 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: SPRING_BOUNCY,
  },
  exit: {
    scale: 0,
    rotate: 15,
    transition: { duration: 0.2 },
  },
};

// ============================================================================
// COMBAT FEEDBACK ANIMATIONS
// ============================================================================

/** Shake animation for incorrect answers / damage taken */
export const damageShake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [-8, 8, -6, 6, -4, 4, -2, 2, 0],
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

/** Green flash for correct answers */
export const correctFlash: Variants = {
  initial: { backgroundColor: 'transparent' },
  animate: {
    backgroundColor: ['transparent', 'rgba(34, 197, 94, 0.3)', 'transparent'],
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/** Red flash for incorrect answers */
export const incorrectFlash: Variants = {
  initial: { backgroundColor: 'transparent' },
  animate: {
    backgroundColor: ['transparent', 'rgba(239, 68, 68, 0.3)', 'transparent'],
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

// ============================================================================
// SELECTION ANIMATIONS
// ============================================================================

/** Hover effect for selectable cards */
export const selectableHover: Variants = {
  initial: { scale: 1, y: 0 },
  hover: {
    scale: 1.08,
    y: -8,
    transition: SPRING_SNAPPY,
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },
};

/** Selection confirmation pop */
export const selectPop: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.15, 1],
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// ============================================================================
// OVERLAY/PANEL ANIMATIONS
// ============================================================================

/** Fade in from bottom */
export const slideUpFade: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: SPRING_GENTLE,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

/** Fade in from top (for banners) */
export const slideDownFade: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: SPRING_GENTLE,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

/** Scale up modal appearance */
export const modalScale: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: SPRING_BOUNCY,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

/** Backdrop fade */
export const backdropFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// ============================================================================
// TIMER ANIMATIONS
// ============================================================================

/** Progress bar depletion */
export const timerProgress = (duration: number): Variants => ({
  initial: { scaleX: 1 },
  animate: {
    scaleX: 0,
    transition: {
      duration,
      ease: 'linear',
    },
  },
});

/** Timer urgency pulse (last 10 seconds) */
export const timerUrgency: Variants = {
  initial: { opacity: 1 },
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================================================
// CARD COMBAT STATE CLASSES
// ============================================================================

/** CSS classes for different combat states */
export const combatStateClasses = {
  /** Card is selected as attacker */
  attacker: 'ring-4 ring-red-500 shadow-lg shadow-red-500/50',
  /** Card is ready to block (pending assignment) */
  pendingBlocker: 'ring-4 ring-blue-500 shadow-lg shadow-blue-500/50 animate-pulse',
  /** Card is assigned as blocker */
  assignedBlocker: 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/50',
  /** Card can be selected (eligible) */
  selectable: 'cursor-pointer hover:ring-2 hover:ring-white/50',
  /** Card cannot be selected (tapped/ineligible) */
  disabled: 'opacity-50 cursor-not-allowed grayscale',
  /** Card is being targeted by an attacker */
  targeted: 'ring-4 ring-yellow-500 shadow-lg shadow-yellow-500/50',
} as const;

export type CombatStateClass = keyof typeof combatStateClasses;
