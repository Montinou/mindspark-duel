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
    <div className="relative h-80 flex justify-center items-end w-full max-w-6xl mx-auto perspective-1000">
      {cards.map((card, index) => {
        const totalCards = cards.length;
        const centerIndex = (totalCards - 1) / 2;
        const offset = index - centerIndex;
        const rotate = offset * 4; // Slightly less rotation
        const translateY = Math.abs(offset) * 8; // Gentler curve
        const translateX = offset * -25; // Less overlap for easier hover

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
              y: -50,
              zIndex: 50,
              scale: 1.08,
              rotate: 0,
              transition: { type: "spring", stiffness: 300, damping: 20 }
            }}
            className="absolute bottom-0 origin-bottom cursor-pointer"
            style={{
                left: '50%',
                marginLeft: '-7rem'
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
