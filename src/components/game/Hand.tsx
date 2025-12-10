'use client';

import { Card as CardType } from '@/types/game';
import { Card } from './Card';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface HandProps {
  cards: CardType[];
  onPlayCard: (card: CardType) => void;
  currentMana: number;
  isMyTurn: boolean;
}

export function Hand({ cards, onPlayCard, currentMana, isMyTurn }: HandProps) {
  const totalCards = cards.length;
  const prefersReducedMotion = useReducedMotion();

  // Card dimensions - responsive based on viewport (MTG style cards are larger)
  const cardWidth = 192; // w-48 = 192px

  // Calculate spacing between cards based on count
  // More cards = less spacing to fit them all
  // Adjusted spacing for larger MTG-style cards
  const baseSpacing = Math.max(50, 120 - (totalCards * 10));
  const spacing = totalCards > 1 ? baseSpacing : 0;

  return (
    <div
      className="relative h-52 md:h-64 lg:h-80 w-full max-w-6xl mx-auto"
      role="region"
      aria-label={`Tu mano: ${cards.length} cartas`}
    >
      <div className="absolute bottom-2 md:bottom-4 lg:bottom-8 left-1/2 -translate-x-1/2 flex items-end justify-center">
        {cards.map((card, index) => {
          const centerIndex = (totalCards - 1) / 2;
          const offset = index - centerIndex;

          // Position each card with proper spacing
          const translateX = offset * spacing;
          const rotate = offset * 2.5; // Slightly less rotation for mobile
          const translateY = Math.abs(offset) * 6; // Reduced arc for mobile

          const isPlayable = isMyTurn && currentMana >= card.cost;

          // Animation props based on reduced motion preference
          // Adjusted scales for larger MTG-style cards
          const animateProps = prefersReducedMotion ? {
            y: translateY,
            x: translateX,
            rotate: 0,
            opacity: 1,
            scale: 0.5,
            zIndex: index
          } : {
            y: translateY,
            x: translateX,
            rotate: rotate,
            opacity: 1,
            scale: 0.5, // Smaller scale for larger cards
            zIndex: index
          };

          const hoverProps = prefersReducedMotion ? undefined : {
            y: -70,
            zIndex: 100,
            scale: 0.7,
            rotate: 0,
            transition: { type: "spring" as const, stiffness: 400, damping: 25 }
          };

          const tapProps = prefersReducedMotion ? undefined : {
            y: -90,
            zIndex: 100,
            scale: 0.8,
            rotate: 0,
          };

          return (
            <motion.div
              key={card.id}
              initial={prefersReducedMotion ? { opacity: 1 } : { y: 100, opacity: 0, scale: 0.8 }}
              animate={animateProps}
              whileHover={hoverProps}
              whileTap={tapProps}
              transition={prefersReducedMotion ? { duration: 0.01 } : {
                type: "spring" as const,
                stiffness: 300,
                damping: 25,
                delay: index * 0.05
              }}
              className="absolute origin-bottom cursor-pointer touch-manipulation"
              style={{
                left: '50%',
                marginLeft: `-${cardWidth / 2}px`,
                touchAction: 'manipulation',
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
        <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 text-zinc-500 italic text-sm md:text-base">
          Your hand is empty...
        </div>
      )}
    </div>
  );
}
