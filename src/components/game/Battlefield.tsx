'use client';

import { useGameLoop } from '@/hooks/useGameLoop';
import { Card } from './Card';
import { Hand } from './Hand';
import { EnemyArea } from './EnemyArea';
import { ProblemModal } from './ProblemModal';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Zap, Hourglass } from 'lucide-react';

export function Battlefield() {
  const { gameState, playCard, resolveProblem, endTurn } = useGameLoop();
  const [isGenerating, setIsGenerating] = useState(false);

  const isMyTurn = gameState.currentPhase === 'main' || gameState.currentPhase === 'draw';

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden flex flex-col relative selection:bg-blue-500/30">
      {/* Background Ambient Effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-zinc-950/80 to-blue-900/10 pointer-events-none" />
      
      {/* --- TOP BAR: Enemy Info --- */}
      <div className="h-20 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between px-8 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="relative">
             <div className="w-14 h-14 rounded-full bg-red-900 flex items-center justify-center text-xl font-bold border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                E
             </div>
             <div className="absolute -bottom-2 -right-2 bg-zinc-900 rounded-full p-1 border border-zinc-700">
                <Shield size={16} className="text-zinc-400" />
             </div>
          </div>
          <div>
            <h2 className="font-bold text-red-200 text-lg tracking-tight">{gameState.enemy.name}</h2>
            <div className="flex items-center gap-3 text-sm">
                <span className="text-red-400 font-mono font-bold">HP: {gameState.enemy.health}/{gameState.enemy.maxHealth}</span>
                <span className="text-blue-400 font-mono">MP: {gameState.enemy.mana}/{gameState.enemy.maxMana}</span>
            </div>
          </div>
        </div>
        
        {/* Turn Indicator */}
        <div className="flex flex-col items-end">
            <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-1">Turn {gameState.turn}</div>
            <div className={`px-4 py-1 rounded-full border ${isMyTurn ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-red-500/20 border-red-500 text-red-300'} text-sm font-bold flex items-center gap-2`}>
                {isMyTurn ? 'YOUR TURN' : 'ENEMY TURN'}
                {isMyTurn && <Hourglass size={14} className="animate-spin-slow" />}
            </div>
        </div>
      </div>

      {/* --- MIDDLE: Battlefield --- */}
      <div className="flex-1 relative flex flex-col items-center justify-center perspective-1000 py-8">
        
        {/* Enemy Area */}
        <div className="w-full mb-8">
            <EnemyArea enemy={gameState.enemy} />
        </div>

        {/* Divider / Combat Zone */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-4 opacity-50" />

        {/* Player Board */}
        <div className="flex justify-center gap-4 min-h-[240px] w-full px-12 items-center">
          <AnimatePresence>
            {gameState.player.board.map(card => (
              <motion.div 
                key={card.id}
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative"
              >
                <Card card={card} disabled={!isMyTurn} />
                {/* Attack Indicator (if can attack) */}
                {card.canAttack && isMyTurn && (
                    <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-red-600 z-20"
                        title="Attack!"
                    >
                        <Swords size={20} />
                    </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {gameState.player.board.length === 0 && (
            <div className="text-zinc-600 font-mono text-sm border-2 border-dashed border-zinc-800 rounded-xl px-8 py-12 opacity-50">
                Summon creatures to defend yourself
            </div>
          )}
        </div>

      </div>

      {/* --- BOTTOM BAR: Player Hand & Controls --- */}
      <div className="h-[350px] bg-gradient-to-t from-zinc-950 via-zinc-900/95 to-transparent relative z-30 flex flex-col justify-end pb-4">
        
        {/* Phase & End Turn Controls */}
        <div className="absolute top-12 right-8 flex flex-col gap-4 items-end z-40">
            <div className="bg-zinc-900/80 backdrop-blur border border-zinc-700 px-4 py-2 rounded-lg shadow-xl">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Current Phase</div>
                <div className="text-white font-bold text-lg capitalize flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {gameState.currentPhase}
                </div>
            </div>

            <button 
                onClick={endTurn}
                disabled={!isMyTurn}
                className={`
                    group relative px-8 py-3 rounded-xl font-bold text-lg shadow-xl transition-all
                    ${isMyTurn 
                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white hover:scale-105 hover:shadow-yellow-500/20' 
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'}
                `}
            >
                <span className="relative z-10 flex items-center gap-2">
                    End Turn
                    <Hourglass size={18} />
                </span>
                {isMyTurn && <div className="absolute inset-0 rounded-xl bg-yellow-400/20 blur-md group-hover:blur-lg transition-all" />}
            </button>
        </div>

        {/* Player Stats (Left) */}
        <div className="absolute bottom-8 left-8 z-40">
            <div className="flex items-end gap-4">
                <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-blue-900 flex items-center justify-center text-3xl font-bold border-4 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all group-hover:scale-105">
                        {gameState.player.health}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-900 text-blue-200 text-xs font-bold px-2 py-0.5 rounded border border-blue-900">
                        HP
                    </div>
                </div>

                <div className="flex flex-col gap-1 mb-2">
                    <h2 className="font-bold text-blue-100 text-xl">{gameState.player.name}</h2>
                    <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-blue-900/50">
                        <div className="flex gap-0.5">
                            {Array.from({ length: gameState.player.maxMana }).map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`w-3 h-4 rounded-sm ${i < gameState.player.mana ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]' : 'bg-zinc-700'}`} 
                                />
                            ))}
                        </div>
                        <span className="text-blue-300 font-mono font-bold text-sm ml-2">
                            {gameState.player.mana}/{gameState.player.maxMana}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Hand Component */}
        <div className="w-full flex justify-center items-end pb-4 z-30 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-6xl">
                <Hand 
                    cards={gameState.player.hand} 
                    onPlayCard={playCard} 
                    currentMana={gameState.player.mana}
                    isMyTurn={isMyTurn}
                />
            </div>
        </div>
      </div>

      {/* Problem Modal */}
      <AnimatePresence>
        {gameState.activeProblem && (
            <ProblemModal 
                problem={gameState.activeProblem} 
                onSolve={resolveProblem}
            />
        )}
      </AnimatePresence>
    </div>
  );
}
