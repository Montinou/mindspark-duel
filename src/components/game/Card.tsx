'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Card as CardType } from '@/types/game';
import { Shield, Zap, Brain, Sword, Sparkles } from 'lucide-react';
import { canUseAbility } from '@/lib/game/abilities';

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

// Helper function to get element-based colors
const getElementColors = (element: string) => {
  switch(element) {
    case 'Fire':
      return {
        badge: 'bg-red-600',
        glow: 'shadow-red-500/50',
        ring: 'ring-red-500/30'
      };
    case 'Water':
      return {
        badge: 'bg-blue-600',
        glow: 'shadow-blue-500/50',
        ring: 'ring-blue-500/30'
      };
    case 'Earth':
      return {
        badge: 'bg-green-600',
        glow: 'shadow-green-500/50',
        ring: 'ring-green-500/30'
      };
    case 'Air':
      return {
        badge: 'bg-purple-600',
        glow: 'shadow-purple-500/50',
        ring: 'ring-purple-500/30'
      };
    default:
      return {
        badge: 'bg-zinc-600',
        glow: 'shadow-zinc-500/50',
        ring: 'ring-zinc-500/30'
      };
  }
};

export function Card({
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

  // Check if ability can be used (only on board, has ability, has mana, not used this turn)
  const abilityAvailable = isOnBoard && card.ability && canUseAbility(card, currentMana);

  return (
    <motion.div
      whileHover={!disabled ? {
        scale: 1.05,
        y: -15,
        zIndex: 100,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      className={`
        relative w-56 h-80 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden
        ${disabled ? 'grayscale brightness-75 cursor-not-allowed' : `shadow-2xl hover:shadow-lg ${elementColors.glow}`}
        ${isPlayable ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-zinc-900' : ''}
        ${card.canAttack ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-900 animate-pulse' : ''}
        ${card.isTapped ? 'grayscale brightness-90' : ''}
        bg-gradient-to-br from-zinc-900 to-zinc-950
        ${className || ''}
      `}
      onClick={() => !disabled && onClick?.(card)}
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
            sizes="224px"
            onError={() => setImgError(true)}
            priority={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-700">
            <Zap className="w-16 h-16" />
          </div>
        )}
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      {/* Shimmer/Shine overlay on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent z-5 pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{
          opacity: [0, 0.5, 0],
          transition: { duration: 0.8, ease: "easeInOut" }
        }}
      />

      {/* Cost Badge */}
      <div className={`absolute -top-3 -left-3 w-10 h-10 ${elementColors.badge} rounded-full flex items-center justify-center border-4 border-zinc-900 z-20 shadow-lg`}>
        <span className="text-white font-bold text-lg">{card.cost}</span>
      </div>

      {/* Name Bar (Top Overlay) */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent pt-4 pb-6 px-4">
        <div className="flex justify-between items-start">
          <h3 className="text-white font-bold text-base drop-shadow-lg leading-tight flex-1 pr-2">
            {card.name}
          </h3>
          <div className={`${elementColors.badge} px-2 py-1 rounded-full flex-shrink-0`}>
            <span className="text-[10px] text-white uppercase font-bold tracking-wide">
              {card.element}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Glassmorphism Text Box */}
      <div className="absolute bottom-0 left-0 right-0 z-10 backdrop-blur-md bg-black/60 border-t border-white/20 rounded-t-lg p-3">
        {/* Description */}
        <p className="text-zinc-200 text-[11px] leading-snug line-clamp-2 font-serif mb-2">
          {card.description}
        </p>

        {/* Ability Row (if card has ability) */}
        {card.ability && (
          <div className="mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (abilityAvailable && onUseAbility) {
                  onUseAbility(card);
                }
              }}
              disabled={!abilityAvailable}
              className={`
                w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold
                transition-all duration-200
                ${abilityAvailable
                  ? 'bg-purple-600/80 hover:bg-purple-500 text-white cursor-pointer border border-purple-400/50 shadow-lg shadow-purple-500/30'
                  : 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                }
              `}
              title={card.ability.description}
            >
              <span className="flex items-center gap-1">
                <Sparkles size={10} />
                {card.ability.name}
              </span>
              <span className="flex items-center gap-0.5 bg-black/30 px-1.5 py-0.5 rounded">
                {card.ability.manaCost}💎
              </span>
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          {/* Power */}
          <div className="flex items-center gap-1 text-red-400 bg-black/40 px-2 py-1 rounded-full border border-red-500/30" title="Power">
            <Sword size={12} />
            <span className="font-bold text-xs">{card.power}</span>
          </div>

          {/* Problem Category */}
          <div className="flex items-center gap-1 text-purple-300" title="Problem Type">
            <Brain size={12} />
            <span className="text-[9px] uppercase tracking-tighter font-semibold">
              {card.problemCategory}
            </span>
          </div>

          {/* Defense */}
          <div className="flex items-center gap-1 text-green-400 bg-black/40 px-2 py-1 rounded-full border border-green-500/30" title="Defense">
            <Shield size={12} />
            <span className="font-bold text-xs">{card.defense}</span>
          </div>
        </div>
      </div>

      {/* Element-colored ring glow on hover (subtle) */}
      {!disabled && (
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
