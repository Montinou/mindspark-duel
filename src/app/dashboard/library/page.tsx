'use client';

import { useState } from 'react';
import { researchTome } from '@/app/actions/library';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Sparkles, Loader2 } from 'lucide-react';
import { Card as CardComponent } from '@/components/game/Card';
import { getRarityColor } from '@/lib/game/rarity-system';

const TOMES = [
  { id: 'standard', name: 'Standard Tome', cost: 100, color: 'bg-zinc-800' },
  { id: 'fire', name: 'Tome of Fire', cost: 150, color: 'bg-red-900/50' },
  { id: 'water', name: 'Tome of Water', cost: 150, color: 'bg-blue-900/50' },
  { id: 'earth', name: 'Tome of Earth', cost: 150, color: 'bg-green-900/50' },
  { id: 'air', name: 'Tome of Air', cost: 150, color: 'bg-sky-900/50' },
];

export default function LibraryPage() {
  const [isOpening, setIsOpening] = useState(false);
  const [newCards, setNewCards] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleResearch = async (tomeId: string) => {
    setIsOpening(true);
    setError('');
    setNewCards([]);
    
    try {
      const cards = await researchTome(tomeId as any);
      setNewCards(cards);
    } catch (err) {
      setError('Failed to research tome. Not enough Sparks?');
      setIsOpening(false);
    }
  };

  const reset = () => {
    setIsOpening(false);
    setNewCards([]);
  };

  return (
    <div className="p-8 min-h-screen relative">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Book className="w-8 h-8 text-purple-400" />
          Arcane Library
        </h1>
        <p className="text-zinc-400">Spend Sparks to research new spells and creatures.</p>
      </header>

      {/* Tome Selection */}
      {!isOpening && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOMES.map((tome) => (
            <button
              key={tome.id}
              onClick={() => handleResearch(tome.id)}
              className={`${tome.color} border border-zinc-700 p-8 rounded-xl hover:scale-105 transition-transform text-left group relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-xl font-bold text-white mb-2">{tome.name}</h3>
              <div className="flex items-center gap-2 text-yellow-400 font-bold">
                <Sparkles className="w-4 h-4" />
                {tome.cost} Sparks
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-900/50 text-red-200 rounded-lg border border-red-800">
          {error}
        </div>
      )}

      {/* Opening Animation */}
      <AnimatePresence>
        {isOpening && newCards.length === 0 && !error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 z-50"
          >
            <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-4" />
            <p className="text-xl text-purple-300 animate-pulse">Researching ancient texts...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Reveal */}
      {newCards.length > 0 && (
        <div className="fixed inset-0 bg-zinc-950/90 z-50 flex flex-col items-center justify-center p-8">
          <h2 className="text-3xl font-bold text-white mb-8 animate-bounce">Discovery!</h2>
          <div className="flex gap-6 flex-wrap justify-center">
            {newCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.3 }}
                className={`relative rounded-xl ${getRarityColor(card.rarity)} border-4`}
              >
                <div className="scale-75 origin-top">
                  <CardComponent 
                    card={{...card, canAttack: false, isTapped: false}} 
                    onClick={() => {}} 
                  />
                </div>
                <div className="absolute -bottom-4 left-0 right-0 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase bg-zinc-900 border ${getRarityColor(card.rarity)}`}>
                    {card.rarity}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          <button 
            onClick={reset}
            className="mt-12 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors"
          >
            Continue Research
          </button>
        </div>
      )}
    </div>
  );
}
