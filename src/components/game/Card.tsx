'use client';

import { motion } from 'framer-motion';
import { Card as CardType } from '@/types/game';
import { Shield, Zap, Brain } from 'lucide-react';

interface CardProps {
  card: CardType;
  onClick?: (card: CardType) => void;
  disabled?: boolean;
}

export function Card({ card, onClick, disabled }: CardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -10 }}
      whileTap={{ scale: 0.95 }}
      className={`
        relative w-48 h-72 rounded-xl p-3 flex flex-col gap-2 cursor-pointer transition-all
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'shadow-xl hover:shadow-2xl'}
        bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-700
      `}
      onClick={() => !disabled && onClick?.(card)}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold border border-blue-500/50">
          {card.cost} Mana
        </div>
        <div className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
          {card.element}
        </div>
      </div>

      {/* Image Placeholder */}
      <div className="w-full h-32 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative group">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <Zap className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-white font-bold text-sm leading-tight mb-1">{card.name}</h3>
          <p className="text-zinc-400 text-[10px] leading-snug line-clamp-3">
            {card.description}
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-1 text-red-400" title="Power">
            <Zap size={14} />
            <span className="font-bold text-sm">{card.power}</span>
          </div>
          
          <div className="flex items-center gap-1 text-purple-400" title="Problem Type">
            <Brain size={14} />
            <span className="text-[10px] uppercase">{card.problemCategory}</span>
          </div>

          <div className="flex items-center gap-1 text-green-400" title="Defense">
            <Shield size={14} />
            <span className="font-bold text-sm">{card.defense}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
