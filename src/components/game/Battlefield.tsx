'use client';

import { useGameLoop } from '@/hooks/useGameLoop';
import { Card } from './Card';
import { ProblemModal } from './ProblemModal';
import { generateCard } from '@/lib/ai/card-generator';
import { useState } from 'react';

export function Battlefield() {
  const { gameState, playCard, resolveProblem, endTurn, addCardToHand } = useGameLoop();
  const [isGenerating, setIsGenerating] = useState(false);

  // Temporary function to add cards to hand for testing
  const drawCard = async () => {
    setIsGenerating(true);
    try {
      const newCard = await generateCard("Space Exploration", 5);
      addCardToHand(newCard);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden flex flex-col">
      {/* Top Bar: Enemy Info */}
      <div className="h-24 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-900 flex items-center justify-center text-xl font-bold border-2 border-red-500">
            E
          </div>
          <div>
            <h2 className="font-bold text-red-200">{gameState.enemy.name}</h2>
            <div className="text-sm text-red-400">HP: {gameState.enemy.health}/{gameState.enemy.maxHealth}</div>
          </div>
        </div>
        <div className="text-zinc-500 font-mono">Turn {gameState.turn}</div>
      </div>

      {/* Middle: Battlefield */}
      <div className="flex-1 relative flex items-center justify-center bg-[url('/grid.svg')] bg-center opacity-80">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-transparent to-zinc-950/50 pointer-events-none" />
        
        {/* Enemy Board */}
        <div className="absolute top-8 flex gap-4">
          {gameState.enemy.board.map(card => (
            <div key={card.id} className="w-32 h-48 bg-zinc-800 rounded-lg border border-zinc-700 opacity-80"></div>
          ))}
        </div>

        {/* Player Board */}
        <div className="absolute bottom-8 flex gap-4">
          {gameState.player.board.map(card => (
            <Card key={card.id} card={card} disabled />
          ))}
        </div>
      </div>

      {/* Bottom Bar: Player Hand & Info */}
      <div className="h-48 bg-zinc-900/90 border-t border-zinc-800 backdrop-blur-md relative z-10">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2">
          <button 
            onClick={endTurn}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-full border border-zinc-600 font-semibold shadow-lg transition-all"
          >
            End Turn
          </button>
          <button 
            onClick={drawCard}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-semibold shadow-lg transition-all disabled:opacity-50"
          >
            {isGenerating ? 'Conjuring...' : 'Draw Card (AI)'}
          </button>
        </div>

        <div className="h-full flex items-center justify-between px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center text-2xl font-bold border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              {gameState.player.mana}
            </div>
            <div>
              <h2 className="font-bold text-blue-200">{gameState.player.name}</h2>
              <div className="text-sm text-blue-400">HP: {gameState.player.health}/{gameState.player.maxHealth}</div>
            </div>
          </div>

          <div className="flex-1 flex justify-center items-end gap-[-2rem] px-12 h-full pb-4 overflow-visible">
            {gameState.player.hand.map((card, index) => (
              <div 
                key={card.id} 
                className="relative transition-all hover:-translate-y-12 hover:z-50"
                style={{ 
                  zIndex: index, 
                  marginLeft: index === 0 ? 0 : '-3rem',
                  transform: `rotate(${(index - gameState.player.hand.length / 2) * 5}deg) translateY(${Math.abs(index - gameState.player.hand.length / 2) * 5}px)`
                }}
              >
                <Card 
                  card={card} 
                  onClick={playCard}
                  disabled={gameState.player.mana < card.cost}
                />
              </div>
            ))}
            {gameState.player.hand.length === 0 && (
              <div className="text-zinc-600 italic">Your hand is empty...</div>
            )}
          </div>
        </div>
      </div>

      <ProblemModal 
        problem={gameState.activeProblem} 
        onSolve={resolveProblem}
      />
    </div>
  );
}
