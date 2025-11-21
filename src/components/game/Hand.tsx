'use client';

import { Card as CardType } from '@/types/game';
import { Card } from './Card';
import { motion } from 'framer-motion';

interface HandProps {
  cards: CardType[];
  onPlayCard: (card: CardType) => void;
  currentMana: number;
  isMyTurn: boolean;
}

export function Hand({ cards, onPlayCard, currentMana, isMyTurn }: HandProps) {
  return (
    <div className="relative h-64 flex justify-center items-end w-full max-w-5xl mx-auto perspective-1000">
      {cards.map((card, index) => {
        const totalCards = cards.length;
        const centerIndex = (totalCards - 1) / 2;
        const offset = index - centerIndex;
        const rotate = offset * 5; // Degrees to rotate
        const translateY = Math.abs(offset) * 10; // Curve effect
        const translateX = offset * -40; // Overlap

        const isPlayable = isMyTurn && currentMana >= card.cost;

        return (
          <motion.div
            key={card.id}
            initial={{ y: 100, opacity: 0 }}
            animate={{ 
              y: translateY, 
              x: translateX,
              rotate: rotate,
              opacity: 1,
              zIndex: index
            }}
            whileHover={{ 
              y: -80, 
              zIndex: 100,
              scale: 1.1,
              rotate: 0,
              transition: { duration: 0.2 }
            }}
            className="absolute bottom-0 origin-bottom"
            style={{
                left: '50%',
                marginLeft: '-7rem' // Half card width approx
            }}
          >
            <Card 
              card={card} 
              onClick={onPlayCard}
              disabled={!isPlayable}
              isPlayable={isPlayable}
            />
          </motion.div>
        );
      })}
      
      {cards.length === 0 && (
        <div className="text-zinc-500 italic mb-12">Your hand is empty...</div>
      )}
    </div>
  );
}
