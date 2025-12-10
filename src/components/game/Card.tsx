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
    frame: 'from-red-700 via-red-600 to-red-800',
    border: 'border-red-500/60',
    glow: 'shadow-[0_0_30px_var(--element-fire-glow)]',
    textBox: 'bg-gradient-to-b from-red-950/95 to-red-900/90',
    accent: 'text-red-300',
    badge: 'bg-red-600',
  },
  Water: {
    frame: 'from-blue-700 via-blue-600 to-blue-800',
    border: 'border-blue-500/60',
    glow: 'shadow-[0_0_30px_var(--element-water-glow)]',
    textBox: 'bg-gradient-to-b from-blue-950/95 to-blue-900/90',
    accent: 'text-blue-300',
    badge: 'bg-blue-600',
  },
  Earth: {
    frame: 'from-green-700 via-green-600 to-green-800',
    border: 'border-green-500/60',
    glow: 'shadow-[0_0_30px_var(--element-earth-glow)]',
    textBox: 'bg-gradient-to-b from-green-950/95 to-green-900/90',
    accent: 'text-green-300',
    badge: 'bg-green-600',
  },
  Air: {
    frame: 'from-purple-700 via-purple-600 to-purple-800',
    border: 'border-purple-500/60',
    glow: 'shadow-[0_0_30px_var(--element-air-glow)]',
    textBox: 'bg-gradient-to-b from-purple-950/95 to-purple-900/90',
    accent: 'text-purple-300',
    badge: 'bg-purple-600',
  },
} as const;

const DEFAULT_ELEMENT_STYLE = {
  frame: 'from-zinc-700 via-zinc-600 to-zinc-800',
  border: 'border-zinc-500/60',
  glow: 'shadow-[0_0_30px_var(--element-neutral-glow)]',
  textBox: 'bg-gradient-to-b from-zinc-950/95 to-zinc-900/90',
  accent: 'text-zinc-300',
  badge: 'bg-zinc-600',
};

// Helper function to get element-based colors
const getElementColors = (element: string) => {
  return ELEMENT_STYLES[element as keyof typeof ELEMENT_STYLES] || DEFAULT_ELEMENT_STYLE;
};

// Mana gem component for cost display (MTG style)
const ManaGem = ({ cost, element }: { cost: number; element: string }) => {
  const colors = getElementColors(element);
  return (
    <div className={`
      w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center
      ${colors.badge} border-2 border-black/50
      shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.3)]
    `}>
      <span className="text-white font-bold text-sm md:text-base drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
        {cost}
      </span>
    </div>
  );
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
    y: -10,
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
        relative w-48 h-[272px] md:w-56 md:h-[320px] lg:w-64 lg:h-[368px] cursor-pointer transition-all duration-200
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
      style={{
        transformOrigin: 'center bottom'
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════════
          OUTER FRAME - Marco exterior con gradiente del elemento
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className={`
        absolute inset-0 rounded-xl overflow-hidden
        bg-gradient-to-b ${elementColors.frame}
        border-2 ${elementColors.border}
      `}>
        {/* Inner black border */}
        <div className="absolute inset-[3px] rounded-lg bg-black/90 overflow-hidden">

          {/* ═══════════════════════════════════════════════════════════════════════════
              HEADER BAR - Nombre + Costo de maná (estilo MTG)
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div className={`
            relative h-8 md:h-9 lg:h-10 mx-1.5 mt-1.5 rounded-t-md overflow-hidden
            bg-gradient-to-r ${elementColors.frame}
            border border-black/40
            flex items-center justify-between px-2
          `}>
            {/* Card Name */}
            <h3 className="text-white font-bold text-xs md:text-sm lg:text-base truncate flex-1 pr-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {card.name}
            </h3>

            {/* Mana Cost */}
            <ManaGem cost={card.cost} element={card.element} />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              ART BOX - Imagen de la carta (área principal)
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div className="relative mx-1.5 mt-0.5 h-[100px] md:h-[130px] lg:h-[160px] overflow-hidden border border-black/60">
            {card.imageUrl && !imgError ? (
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 192px, (max-width: 1024px) 224px, 256px"
                onError={() => setImgError(true)}
                priority={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                <Zap className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14" />
              </div>
            )}

            {/* Shimmer overlay on hover */}
            {!prefersReducedMotion && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none"
                initial={{ opacity: 0, x: '-100%' }}
                whileHover={{
                  opacity: 1,
                  x: '100%',
                  transition: { duration: 0.6, ease: "easeInOut" }
                }}
              />
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              TYPE BAR - Tipo de carta + Categoría de problema
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div className={`
            relative h-6 md:h-7 mx-1.5 mt-0.5 rounded-sm overflow-hidden
            bg-gradient-to-r ${elementColors.frame}
            border border-black/40
            flex items-center justify-between px-2
          `}>
            {/* Element Type */}
            <span className="text-white text-[10px] md:text-xs font-semibold uppercase tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
              {card.element} Creature
            </span>

            {/* Problem Category Badge */}
            <div className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded">
              <Brain size={10} className="text-purple-300" />
              <span className="text-purple-200 text-[8px] md:text-[10px] uppercase font-bold">
                {card.problemCategory}
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              TEXT BOX - Descripción + Habilidades + Flavor Text
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div className={`
            relative mx-1.5 mt-0.5 rounded-b-sm overflow-hidden
            ${elementColors.textBox}
            border border-black/40
            p-2 flex flex-col
            h-[72px] md:h-[88px] lg:h-[104px]
          `}>
            {/* Ability (if exists) */}
            {card.ability && (
              <div className="mb-1">
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
                    w-full text-left px-1.5 py-0.5 rounded text-[9px] md:text-[10px]
                    transition-all duration-200
                    ${abilityAvailable
                      ? 'bg-purple-600/60 hover:bg-purple-500/70 text-white cursor-pointer border border-purple-400/40'
                      : 'bg-black/30 text-zinc-500 border border-zinc-700/30'
                    }
                  `}
                  title={card.ability.description}
                >
                  <span className="flex items-center gap-1">
                    <Sparkles size={10} className="flex-shrink-0" />
                    <span className="font-bold">{card.ability.name}</span>
                    <span className="text-purple-300 ml-auto">({card.ability.manaCost})</span>
                  </span>
                </button>
              </div>
            )}

            {/* Effect Description */}
            {card.effectDescription && (
              <p className="text-white text-[9px] md:text-[10px] leading-tight mb-1">
                {card.effectDescription}
              </p>
            )}

            {/* Flavor Text - Italic narrative */}
            <p className={`
              ${elementColors.accent} text-[8px] md:text-[9px] leading-tight italic
              line-clamp-2 md:line-clamp-3
              ${card.ability || card.effectDescription ? 'mt-auto' : ''}
            `}>
              &ldquo;{card.description}&rdquo;
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              FOOTER BAR - Stats Power/Defense (estilo MTG)
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div className="relative mx-1.5 mt-0.5 mb-1.5 flex items-center justify-between">
            {/* Theme/Collection indicator */}
            {card.theme && (
              <span className="text-zinc-500 text-[7px] md:text-[8px] italic truncate max-w-[60%]">
                {card.theme}
              </span>
            )}

            {/* Spacer if no theme */}
            {!card.theme && <div />}

            {/* Power/Toughness Box - MTG style corner stats */}
            <div className={`
              flex items-center gap-0 rounded overflow-hidden
              bg-gradient-to-r ${elementColors.frame}
              border border-black/60
              shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]
            `}>
              {/* Power */}
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 border-r border-black/40">
                <Sword size={10} className="text-white/80" />
                <span className="text-white font-bold text-xs md:text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  {card.power}
                </span>
              </div>

              {/* Defense */}
              <div className="flex items-center gap-0.5 px-1.5 py-0.5">
                <Shield size={10} className="text-white/80" />
                <span className="text-white font-bold text-xs md:text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  {card.defense}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          STATUS BADGES - Indicadores de estado del juego
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-3 right-3 flex flex-col gap-0.5 z-20">
        {isPlayable && (
          <span className="bg-yellow-500 text-black text-[7px] md:text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-lg">
            Playable
          </span>
        )}
        {card.canAttack && (
          <span className="bg-red-600 text-white text-[7px] md:text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-lg animate-pulse">
            Attack!
          </span>
        )}
        {card.isTapped && (
          <span className="bg-zinc-700 text-zinc-300 text-[7px] md:text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            Tapped
          </span>
        )}
      </div>
    </motion.div>
  );
}

export const Card = memo(CardComponent);
