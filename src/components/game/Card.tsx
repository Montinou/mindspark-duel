'use client';

import { motion } from 'framer-motion';
import { Card as CardType } from '@/types/game';
import { Shield, Zap, Brain, Sword } from 'lucide-react';

interface CardProps {
  card: CardType;
  onClick?: (card: CardType) => void;
  disabled?: boolean;
  isPlayable?: boolean;
}

export function Card({ card, onClick, disabled, isPlayable }: CardProps) {
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.1, y: -20, zIndex: 100 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      className={`
        relative w-56 h-80 rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200
        ${disabled ? 'opacity-60 grayscale cursor-not-allowed' : 'shadow-2xl hover:shadow-blue-500/20'}
        ${isPlayable ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-zinc-900' : ''}
        ${card.canAttack ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-900 animate-pulse' : ''}
        ${card.isTapped ? 'opacity-70 grayscale' : ''}
        bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700
      `}
      onClick={() => !disabled && onClick?.(card)}
      style={{
        transformOrigin: 'center bottom'
      }}
    >
      {/* Cost Badge */}
      <div className="absolute -top-3 -left-3 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-4 border-zinc-900 z-10 shadow-lg">
        <span className="text-white font-bold text-lg">{card.cost}</span>
      </div>

      {/* Header */}
      <div className="pl-6 flex justify-between items-start">
        <h3 className="text-white font-bold text-sm leading-tight truncate">{card.name}</h3>
      </div>

      {/* Image Placeholder */}
      <div className="w-full h-36 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative group shadow-inner">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <Zap className="w-8 h-8" />
          </div>
        )}
        
        {/* Element Icon Overlay */}
        <div className="absolute top-1 right-1 bg-black/50 backdrop-blur-sm p-1 rounded-full">
            <div className="text-[10px] text-zinc-300 uppercase font-bold px-1">{card.element}</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/50 h-full">
          <p className="text-zinc-300 text-[11px] leading-snug line-clamp-4 font-serif">
            {card.description}
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-1 text-red-400 bg-zinc-900/80 px-2 py-1 rounded-full border border-zinc-800" title="Power">
            <Sword size={14} />
            <span className="font-bold text-sm">{card.power}</span>
          </div>
          
          <div className="flex items-center gap-1 text-purple-400" title="Problem Type">
            <Brain size={14} />
            <span className="text-[10px] uppercase tracking-tighter">{card.problemCategory}</span>
          </div>

          <div className="flex items-center gap-1 text-green-400 bg-zinc-900/80 px-2 py-1 rounded-full border border-zinc-800" title="Defense">
            <Shield size={14} />
            <span className="font-bold text-sm">{card.defense}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
