'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Card as CardType } from '@/types/game';
import { Shield, Zap, Brain, Sword, Sparkles } from 'lucide-react';
import { canUseAbility } from '@/lib/game/abilities';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface CardProps {
  card: CardType;
  onClick?: (card: CardType) => void;
  onUseAbility?: (card: CardType) => void;
  disabled?: boolean;
  isPlayable?: boolean;
  isOnBoard?: boolean;
  currentMana?: number;
  className?: string;
}

// Element color mapping using CSS variables for centralized theming
const ELEMENT_STYLES = {
  Fire: {
    badge: 'bg-[var(--element-fire)]',
    glow: 'shadow-[0_25px_50px_-12px_var(--element-fire-glow)]',
    ring: 'ring-[var(--element-fire-ring)]'
  },
  Water: {
    badge: 'bg-[var(--element-water)]',
    glow: 'shadow-[0_25px_50px_-12px_var(--element-water-glow)]',
    ring: 'ring-[var(--element-water-ring)]'
  },
  Earth: {
    badge: 'bg-[var(--element-earth)]',
    glow: 'shadow-[0_25px_50px_-12px_var(--element-earth-glow)]',
    ring: 'ring-[var(--element-earth-ring)]'
  },
  Air: {
    badge: 'bg-[var(--element-air)]',
    glow: 'shadow-[0_25px_50px_-12px_var(--element-air-glow)]',
    ring: 'ring-[var(--element-air-ring)]'
  },
} as const;

const DEFAULT_ELEMENT_STYLE = {
  badge: 'bg-[var(--element-neutral)]',
  glow: 'shadow-[0_25px_50px_-12px_var(--element-neutral-glow)]',
  ring: 'ring-[var(--element-neutral-ring)]'
};

// Helper function to get element-based colors
const getElementColors = (element: string) => {
  return ELEMENT_STYLES[element as keyof typeof ELEMENT_STYLES] || DEFAULT_ELEMENT_STYLE;
};

function CardComponent({
  card,
  onClick,
  onUseAbility,
  disabled,
  isPlayable,
  isOnBoard = false,
  currentMana = 0,
  className
}: CardProps) {
  const elementColors = getElementColors(card.element);
  const [imgError, setImgError] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Check if ability can be used (only on board, has ability, has mana, not used this turn)
  const abilityAvailable = isOnBoard && card.ability && canUseAbility(card, currentMana);

  // Reduced motion safe animation props
  const hoverAnimation = prefersReducedMotion ? undefined : {
    scale: 1.05,
    y: -15,
    zIndex: 100,
    transition: { type: "spring" as const, stiffness: 400, damping: 25 }
  };

  const tapAnimation = prefersReducedMotion ? undefined : { scale: 0.97 };

  return (
    <motion.div
      role="article"
      aria-label={`${card.name}, ${card.element} element, Cost ${card.cost}, Power ${card.power}, Defense ${card.defense}${card.ability ? `, Ability: ${card.ability.name}` : ''}${disabled ? ', not playable' : isPlayable ? ', playable' : ''}${card.canAttack ? ', can attack' : ''}${card.isTapped ? ', tapped' : ''}`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      whileHover={!disabled ? hoverAnimation : undefined}
      whileTap={!disabled ? tapAnimation : undefined}
      className={`
        relative w-44 h-64 md:w-52 md:h-76 lg:w-56 lg:h-80 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden
        ${disabled ? 'grayscale brightness-75 cursor-not-allowed' : `shadow-2xl hover:shadow-lg ${elementColors.glow}`}
        ${isPlayable ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-zinc-900' : ''}
        ${card.canAttack ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-900 animate-pulse' : ''}
        ${card.isTapped ? 'grayscale brightness-90' : ''}
        bg-gradient-to-br from-zinc-900 to-zinc-950
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900
        ${className || ''}
      `}
      onClick={() => !disabled && onClick?.(card)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onClick?.(card);
        }
      }}
      style={{
        transformOrigin: 'center bottom'
      }}
    >
      {/* Full Art Background Image */}
      <div className="absolute inset-0 z-0">
        {card.imageUrl && !imgError ? (
          <Image
            src={card.imageUrl}
            alt={card.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 176px, (max-width: 1024px) 208px, 224px"
            onError={() => setImgError(true)}
            priority={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-700">
            <Zap className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16" />
          </div>
        )}
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      {/* Shimmer/Shine overlay on hover */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent z-5 pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{
            opacity: [0, 0.5, 0],
            transition: { duration: 0.8, ease: "easeInOut" }
          }}
        />
      )}

      {/* Cost Badge */}
      <div className={`absolute -top-2 -left-2 md:-top-3 md:-left-3 w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 ${elementColors.badge} rounded-full flex items-center justify-center border-3 md:border-4 border-zinc-900 z-20 shadow-lg`}>
        <span className="text-white font-bold text-sm md:text-base lg:text-lg">{card.cost}</span>
      </div>

      {/* Status Badges for accessibility and visual clarity */}
      <div className="absolute top-1 right-1 flex flex-col gap-0.5 z-20">
        {isPlayable && (
          <span className="bg-blue-500 text-white text-[6px] md:text-[7px] lg:text-[8px] px-1 md:px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-lg">
            Playable
          </span>
        )}
        {card.canAttack && (
          <span className="bg-red-500 text-white text-[6px] md:text-[7px] lg:text-[8px] px-1 md:px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-lg animate-pulse">
            Attack!
          </span>
        )}
        {card.isTapped && (
          <span className="bg-zinc-600 text-zinc-200 text-[6px] md:text-[7px] lg:text-[8px] px-1 md:px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Tapped
          </span>
        )}
      </div>

      {/* Name Bar (Top Overlay) */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent pt-3 md:pt-4 pb-4 md:pb-6 px-3 md:px-4">
        <div className="flex justify-between items-start">
          <h3 className="text-white font-bold text-sm md:text-base drop-shadow-lg leading-tight flex-1 pr-2">
            {card.name}
          </h3>
          <div className={`${elementColors.badge} px-1.5 md:px-2 py-0.5 md:py-1 rounded-full flex-shrink-0`}>
            <span className="text-[8px] md:text-[10px] text-white uppercase font-bold tracking-wide">
              {card.element}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Glassmorphism Text Box */}
      <div className="absolute bottom-0 left-0 right-0 z-10 backdrop-blur-md bg-black/60 border-t border-white/20 rounded-t-lg p-1.5 md:p-2">
        {/* Description - only show if no ability or on board */}
        {(!card.ability || isOnBoard) && (
          <p className="text-zinc-200 text-[8px] md:text-[10px] leading-snug line-clamp-2 font-serif mb-1 md:mb-1.5">
            {card.description}
          </p>
        )}

        {/* Ability Row (if card has ability) */}
        {card.ability && (
          <div className="mb-1 md:mb-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (abilityAvailable && onUseAbility) {
                  onUseAbility(card);
                }
              }}
              disabled={!abilityAvailable}
              aria-label={`Use ability ${card.ability.name}, costs ${card.ability.manaCost} mana`}
              className={`
                w-full flex items-center justify-between gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-[8px] md:text-[9px] font-bold
                transition-all duration-200
                ${abilityAvailable
                  ? 'bg-purple-600/80 hover:bg-purple-500 text-white cursor-pointer border border-purple-400/50 shadow-lg shadow-purple-500/30'
                  : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50'
                }
              `}
              title={card.ability.description}
            >
              <span className="flex items-center gap-1">
                <Sparkles size={8} className="md:w-[9px] md:h-[9px]" />
                <span className="truncate max-w-[60px] md:max-w-[80px]">{card.ability.name}</span>
              </span>
              <span className="flex items-center gap-0.5 bg-black/30 px-1 py-0.5 rounded text-[7px] md:text-[8px]">
                {card.ability.manaCost}💎
              </span>
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex justify-between items-center pt-1 md:pt-1.5 border-t border-white/10">
          {/* Power */}
          <div className="flex items-center gap-0.5 text-red-400 bg-black/40 px-1 md:px-1.5 py-0.5 rounded-full border border-red-500/30" title="Power">
            <Sword size={8} className="md:w-[10px] md:h-[10px]" />
            <span className="font-bold text-[8px] md:text-[10px]">{card.power}</span>
          </div>

          {/* Problem Category */}
          <div className="flex items-center gap-0.5 text-purple-300" title="Problem Type">
            <Brain size={8} className="md:w-[10px] md:h-[10px]" />
            <span className="text-[6px] md:text-[8px] uppercase tracking-tighter font-semibold">
              {card.problemCategory}
            </span>
          </div>

          {/* Defense */}
          <div className="flex items-center gap-0.5 text-green-400 bg-black/40 px-1 md:px-1.5 py-0.5 rounded-full border border-green-500/30" title="Defense">
            <Shield size={8} className="md:w-[10px] md:h-[10px]" />
            <span className="font-bold text-[8px] md:text-[10px]">{card.defense}</span>
          </div>
        </div>
      </div>

      {/* Element-colored ring glow on hover (subtle) */}
      {!disabled && !prefersReducedMotion && (
        <motion.div
          className={`absolute inset-0 rounded-xl ring-2 ${elementColors.ring} pointer-events-none z-5`}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
}

export const Card = memo(CardComponent);
