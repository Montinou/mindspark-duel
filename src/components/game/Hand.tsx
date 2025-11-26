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
  const totalCards = cards.length;

  // Calculate spread based on number of cards
  const cardWidth = 180; // approximate card width in pixels
  const maxSpread = Math.min(totalCards * 100, 800); // max total spread
  const spacing = totalCards > 1 ? maxSpread / (totalCards - 1) : 0;

  return (
    <div className="relative h-80 w-full max-w-6xl mx-auto perspective-1000">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end justify-center">
        {cards.map((card, index) => {
          const centerIndex = (totalCards - 1) / 2;
          const offset = index - centerIndex;

          // Position each card with proper spacing
          const translateX = offset * spacing;
          const rotate = offset * 5; // Rotation for fan effect
          const translateY = Math.abs(offset) * 15; // Arc effect - cards at edges are higher

          const isPlayable = isMyTurn && currentMana >= card.cost;

          return (
            <motion.div
              key={card.id}
              initial={{ y: 100, opacity: 0, scale: 0.8 }}
              animate={{
                y: translateY,
                x: translateX,
                rotate: rotate,
                opacity: 1,
                scale: 1,
                zIndex: index
              }}
              whileHover={{
                y: -60,
                zIndex: 100,
                scale: 1.15,
                rotate: 0,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: index * 0.05
              }}
              className="absolute origin-bottom cursor-pointer"
              style={{
                left: '50%',
                marginLeft: `-${cardWidth / 2}px`,
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
      </div>

      {cards.length === 0 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-zinc-500 italic">
          Your hand is empty...
        </div>
      )}
    </div>
  );
}
