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

// Element color mapping for theming
const ELEMENT_STYLES = {
  Fire: {
    frame: 'from-red-600 via-red-500 to-red-700',
    border: 'border-red-400',
    glow: 'shadow-[0_0_25px_rgba(239,68,68,0.5)]',
    textBoxBg: 'from-red-950/85 via-red-900/80 to-red-950/85',
    accent: 'text-red-200',
    badge: 'bg-red-600',
    statsBg: 'bg-red-800/90',
  },
  Water: {
    frame: 'from-blue-600 via-blue-500 to-blue-700',
    border: 'border-blue-400',
    glow: 'shadow-[0_0_25px_rgba(59,130,246,0.5)]',
    textBoxBg: 'from-blue-950/85 via-blue-900/80 to-blue-950/85',
    accent: 'text-blue-200',
    badge: 'bg-blue-600',
    statsBg: 'bg-blue-800/90',
  },
  Earth: {
    frame: 'from-green-600 via-green-500 to-green-700',
    border: 'border-green-400',
    glow: 'shadow-[0_0_25px_rgba(34,197,94,0.5)]',
    textBoxBg: 'from-green-950/85 via-green-900/80 to-green-950/85',
    accent: 'text-green-200',
    badge: 'bg-green-600',
    statsBg: 'bg-green-800/90',
  },
  Air: {
    frame: 'from-purple-600 via-purple-500 to-purple-700',
    border: 'border-purple-400',
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.5)]',
    textBoxBg: 'from-purple-950/85 via-purple-900/80 to-purple-950/85',
    accent: 'text-purple-200',
    badge: 'bg-purple-600',
    statsBg: 'bg-purple-800/90',
  },
} as const;

const DEFAULT_ELEMENT_STYLE = {
  frame: 'from-zinc-600 via-zinc-500 to-zinc-700',
  border: 'border-zinc-400',
  glow: 'shadow-[0_0_25px_rgba(161,161,170,0.5)]',
  textBoxBg: 'from-zinc-950/85 via-zinc-900/80 to-zinc-950/85',
  accent: 'text-zinc-200',
  badge: 'bg-zinc-600',
  statsBg: 'bg-zinc-800/90',
};

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

  const abilityAvailable = isOnBoard && card.ability && canUseAbility(card, currentMana);

  const hoverAnimation = prefersReducedMotion ? undefined : {
    scale: 1.05,
    y: -8,
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
        relative w-52 h-72 md:w-60 md:h-[336px] lg:w-64 lg:h-[360px] cursor-pointer transition-all duration-200 rounded-xl overflow-hidden
        ${disabled ? 'grayscale brightness-75 cursor-not-allowed' : elementColors.glow}
        ${isPlayable ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}
        ${card.canAttack ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-black animate-pulse' : ''}
        ${card.isTapped ? 'grayscale brightness-90' : ''}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black
        ${className || ''}
      `}
      onClick={() => !disabled && onClick?.(card)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onClick?.(card);
        }
      }}
      style={{ transformOrigin: 'center bottom' }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════════
          CARD FRAME - Borde exterior con gradiente del elemento
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className={`
        absolute inset-0 rounded-xl
        bg-gradient-to-b ${elementColors.frame}
        p-[3px]
      `}>
        <div className="relative w-full h-full rounded-lg overflow-hidden bg-black">

          {/* ═══════════════════════════════════════════════════════════════════════════
              FULL-ART BACKGROUND IMAGE - Imagen como fondo completo
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div className="absolute inset-0">
            {card.imageUrl && !imgError ? (
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 208px, (max-width: 1024px) 240px, 256px"
                onError={() => setImgError(true)}
                priority={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-700">
                <Zap className="w-16 h-16 md:w-20 md:h-20" />
              </div>
            )}
          </div>

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

          {/* ═══════════════════════════════════════════════════════════════════════════
              HEADER - Nombre + Costo de maná (sobre la imagen)
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div className={`
            absolute top-0 left-0 right-0 z-10
            bg-gradient-to-r ${elementColors.frame}
            border-b-2 border-black/50
            px-2 py-1.5 md:py-2
            flex items-center justify-between
          `}>
            <h3 className="text-white font-bold text-sm md:text-base truncate flex-1 pr-2 drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
              {card.name}
            </h3>

            {/* Mana Cost Gem */}
            <div className={`
              w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center
              ${elementColors.badge} border-2 border-black/60
              shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.5)]
            `}>
              <span className="text-white font-bold text-base md:text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {card.cost}
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              TYPE BAR - Tipo de criatura + Categoría (barra intermedia)
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div className={`
            absolute left-0 right-0 z-10
            bottom-[120px] md:bottom-[140px] lg:bottom-[150px]
            bg-gradient-to-r ${elementColors.frame}
            border-y-2 border-black/50
            px-2 py-1
            flex items-center justify-between
          `}>
            <span className="text-white text-[10px] md:text-xs font-semibold uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {card.element} Creature
            </span>

            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/20">
              <Brain size={12} className="text-purple-300" />
              <span className="text-purple-200 text-[9px] md:text-[10px] uppercase font-bold">
                {card.problemCategory}
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              TEXT BOX - Caja de texto transparente en la parte inferior
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div className={`
            absolute bottom-0 left-0 right-0 z-10
            bg-gradient-to-b ${elementColors.textBoxBg}
            backdrop-blur-sm
            border-t-2 border-black/50
            px-2.5 pt-2 pb-1.5
            h-[100px] md:h-[115px] lg:h-[125px]
            flex flex-col
          `}>
            {/* Ability Button (if exists) */}
            {card.ability && (
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
                  w-full text-left px-2 py-1 rounded text-[10px] md:text-[11px] mb-1.5
                  transition-all duration-200
                  ${abilityAvailable
                    ? 'bg-purple-600/70 hover:bg-purple-500/80 text-white cursor-pointer border border-purple-400/50 shadow-lg'
                    : 'bg-black/40 text-zinc-400 border border-zinc-600/40'
                  }
                `}
                title={card.ability.description}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={12} className="flex-shrink-0" />
                  <span className="font-bold truncate">{card.ability.name}</span>
                  <span className="text-purple-200 ml-auto font-mono">({card.ability.manaCost})</span>
                </span>
              </button>
            )}

            {/* Flavor Text */}
            <p className={`
              ${elementColors.accent} text-[9px] md:text-[10px] lg:text-[11px] leading-snug italic
              ${card.ability ? 'line-clamp-2' : 'line-clamp-3 md:line-clamp-4'}
              flex-1
            `}>
              &ldquo;{card.description}&rdquo;
            </p>

            {/* ═══════════════════════════════════════════════════════════════════════════
                STATS BAR - Power/Defense en la parte inferior de la caja de texto
                ═══════════════════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-white/10">
              {/* Theme indicator */}
              {card.theme && (
                <span className="text-white/50 text-[8px] md:text-[9px] italic truncate max-w-[50%]">
                  {card.theme}
                </span>
              )}
              {!card.theme && <div />}

              {/* Power / Defense Box */}
              <div className={`
                flex items-center rounded overflow-hidden
                ${elementColors.statsBg}
                border border-black/60
                shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]
              `}>
                <div className="flex items-center gap-1 px-2 py-0.5 border-r border-black/40">
                  <Sword size={12} className="text-red-300" />
                  <span className="text-white font-bold text-sm md:text-base drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    {card.power}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5">
                  <Shield size={12} className="text-green-300" />
                  <span className="text-white font-bold text-sm md:text-base drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    {card.defense}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Shimmer effect on hover */}
          {!prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none z-20"
              initial={{ opacity: 0, x: '-100%' }}
              whileHover={{
                opacity: 1,
                x: '100%',
                transition: { duration: 0.5, ease: "easeInOut" }
              }}
            />
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          STATUS BADGES - Indicadores de estado flotantes
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-12 right-2 flex flex-col gap-1 z-30">
        {isPlayable && (
          <span className="bg-yellow-500 text-black text-[8px] md:text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-lg">
            Playable
          </span>
        )}
        {card.canAttack && (
          <span className="bg-red-600 text-white text-[8px] md:text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-lg animate-pulse">
            Attack!
          </span>
        )}
        {card.isTapped && (
          <span className="bg-zinc-700 text-zinc-300 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            Tapped
          </span>
        )}
      </div>
    </motion.div>
  );
}

export const Card = memo(CardComponent);
