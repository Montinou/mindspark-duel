'use client';

import { motion } from 'framer-motion';
import { Swords, X } from 'lucide-react';
import { memo } from 'react';
import { attackerRingPulse, SPRING_BOUNCY } from './CombatAnimations';

interface AttackerIndicatorProps {
  /** Whether the card is selected as an attacker */
  isSelected: boolean;
  /** Order number if multiple attackers (1, 2, 3...) */
  attackerNumber?: number;
  /** Callback to deselect this attacker */
  onDeselect?: () => void;
  /** Position relative to card (for absolute positioning) */
  position?: 'top-right' | 'top-left' | 'center';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: {
    container: 'w-8 h-8',
    icon: 14,
    ring: 'w-10 h-10',
    number: 'text-[10px]',
    offset: '-top-2 -right-2',
  },
  md: {
    container: 'w-10 h-10',
    icon: 18,
    ring: 'w-14 h-14',
    number: 'text-xs',
    offset: '-top-3 -right-3',
  },
  lg: {
    container: 'w-12 h-12',
    icon: 22,
    ring: 'w-16 h-16',
    number: 'text-sm',
    offset: '-top-4 -right-4',
  },
};

const positionConfig = {
  'top-right': '-top-3 -right-3',
  'top-left': '-top-3 -left-3',
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
};

/**
 * AttackerIndicator - Visual badge for cards declared as attackers
 *
 * Shows:
 * - Sword icon with pulsing red glow
 * - Attacker number if multiple attackers
 * - X button to deselect on hover
 */
export const AttackerIndicator = memo(function AttackerIndicator({
  isSelected,
  attackerNumber,
  onDeselect,
  position = 'top-right',
  size = 'md',
}: AttackerIndicatorProps) {
  if (!isSelected) return null;

  const sizes = sizeConfig[size];
  const posClass = position === 'top-right' ? sizes.offset : positionConfig[position];

  return (
    <motion.div
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 45 }}
      transition={SPRING_BOUNCY}
      className={`absolute ${posClass} z-20`}
    >
      {/* Pulsing ring background */}
      <motion.div
        variants={attackerRingPulse}
        initial="initial"
        animate="animate"
        className={`absolute inset-0 ${sizes.ring} -m-2 rounded-full bg-red-500/30`}
      />

      {/* Main badge */}
      <motion.div
        className={`
          relative ${sizes.container} rounded-full
          bg-gradient-to-br from-red-500 to-red-700
          flex items-center justify-center
          shadow-lg shadow-red-500/50
          border-2 border-red-400
          cursor-pointer
          group
        `}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          onDeselect?.();
        }}
      >
        {/* Sword icon (default) or X on hover */}
        <motion.div className="relative">
          {/* Sword - visible by default */}
          <motion.div
            className="group-hover:opacity-0 transition-opacity duration-150"
          >
            <Swords size={sizes.icon} className="text-white drop-shadow-md" />
          </motion.div>

          {/* X - visible on hover */}
          {onDeselect && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            >
              <X size={sizes.icon} className="text-white drop-shadow-md" />
            </motion.div>
          )}
        </motion.div>

        {/* Attacker number badge */}
        {attackerNumber !== undefined && attackerNumber > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`
              absolute -bottom-1 -right-1
              ${sizes.number} font-bold
              w-5 h-5 rounded-full
              bg-yellow-500 text-black
              flex items-center justify-center
              border border-yellow-300
              shadow-sm
            `}
          >
            {attackerNumber}
          </motion.div>
        )}
      </motion.div>

      {/* Glow effect */}
      <motion.div
        animate={{
          opacity: [0.5, 0.8, 0.5],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`
          absolute inset-0 ${sizes.container} rounded-full
          bg-red-500 blur-md -z-10
        `}
      />
    </motion.div>
  );
});

export default AttackerIndicator;
