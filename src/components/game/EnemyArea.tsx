'use client';

import { Player, Card as CardType } from '@/types/game';
import { Card } from './Card';
import { motion } from 'framer-motion';
import { Skull } from 'lucide-react';

interface EnemyAreaProps {
  enemy: Player;
}

export function EnemyArea({ enemy }: EnemyAreaProps) {
  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Enemy Hand (Card Backs) */}
      <div className="flex justify-center items-start h-24 -mt-12 overflow-visible">
        {Array.from({ length: enemy.hand.length }).map((_, index) => (
          <motion.div
            key={`enemy-card-${index}`}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileHover={{ scale: 1.15, y: -10, zIndex: 50 }}
            className="w-16 h-24 bg-red-900/80 rounded-lg border-2 border-red-700 shadow-lg mx-1 relative group cursor-pointer transition-all hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
            style={{
                transform: `rotate(${(index - enemy.hand.length / 2) * 5}deg)`
            }}
          >
             <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
                <Skull size={24} />
             </div>
          </motion.div>
        ))}
      </div>

      {/* Enemy Board */}
      <div className="flex justify-center gap-4 min-h-[200px] w-full px-12">
        {enemy.board.map((card) => (
          <div key={card.id} className="transform rotate-180 scale-90 hover:scale-100 transition-transform">
             <Card card={card} disabled />
          </div>
        ))}
        {enemy.board.length === 0 && (
            <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl opacity-20">
                <span className="text-zinc-500 font-mono text-sm">Empty Battlefield</span>
            </div>
        )}
      </div>
    </div>
  );
}
