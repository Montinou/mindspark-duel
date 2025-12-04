'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types/game';
import { BattleProblem, ResolveBattleResponse } from '@/types/battle';
import { ProblemModal } from './ProblemModal';
import { Swords, Heart, Shield, Zap } from 'lucide-react';

interface BattleSequenceProps {
  playerCard: Card;
  opponentCard: Card;
  playerProblem: BattleProblem;
  opponentProblem: BattleProblem;
  onComplete: (result: ResolveBattleResponse) => void;
  onCancel: () => void;
  battleId: string;
}

type SequenceStep =
  | 'card_animation'
  | 'player_problem'
  | 'opponent_problem'
  | 'calculating'
  | 'damage_animation'
  | 'result'
  | 'complete';

export function BattleSequence({
  playerCard,
  opponentCard,
  playerProblem,
  opponentProblem,
  onComplete,
  onCancel,
  battleId,
}: BattleSequenceProps) {
  const [currentStep, setCurrentStep] = useState<SequenceStep>('card_animation');
  const [playerAnswer, setPlayerAnswer] = useState<string>('');
  const [opponentAnswer, setOpponentAnswer] = useState<string>('');
  const [battleResult, setBattleResult] = useState<ResolveBattleResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-advance through steps
  useEffect(() => {
    if (currentStep === 'card_animation') {
      const timer = setTimeout(() => {
        setCurrentStep('player_problem');
      }, 2000); // Show card animation for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Handle player answer submission
  const handlePlayerSubmit = (answer: string) => {
    setPlayerAnswer(answer);
    setCurrentStep('opponent_problem');
  };

  // Handle opponent answer submission (simulated or real)
  const handleOpponentSubmit = async (answer: string) => {
    setOpponentAnswer(answer);
    setCurrentStep('calculating');
    await resolveBattle(playerAnswer, answer);
  };

  // Call battle resolution API
  const resolveBattle = async (playerAns: string, opponentAns: string) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/battle/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battleId,
          playerCardId: playerCard.id,
          opponentCardId: opponentCard.id,
          playerProblem,
          opponentProblem,
          playerAnswer: playerAns,
          opponentAnswer: opponentAns,
          playerHealth: 100, // TODO: Get from game state
          opponentHealth: 100, // TODO: Get from game state
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve battle');
      }

      const result: ResolveBattleResponse = await response.json();
      setBattleResult(result);
      setCurrentStep('damage_animation');

      // Show damage animation, then result
      setTimeout(() => {
        setCurrentStep('result');
      }, 2000);

      // Auto-close after showing result
      setTimeout(() => {
        setCurrentStep('complete');
        onComplete(result);
      }, 5000);
    } catch (error) {
      console.error('Error resolving battle:', error);
      // TODO: Show error state
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Card Animation */}
      <AnimatePresence>
        {currentStep === 'card_animation' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center"
          >
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 lg:gap-16">
              {/* Player Card */}
              <motion.div
                initial={{ x: -200, opacity: 0, rotate: -10 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: 'spring' }}
                className="relative"
              >
                <div className="w-44 h-64 md:w-52 md:h-80 lg:w-64 lg:h-96 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-2xl flex flex-col items-center justify-center p-4 md:p-6 border-4 border-white/20">
                  <p className="text-white text-2xl font-bold mb-4">{playerCard.name}</p>
                  <div className="flex gap-4 text-white">
                    <div className="flex items-center gap-2">
                      <Zap className="h-6 w-6" />
                      <span className="text-3xl font-bold">{playerCard.power}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-6 w-6" />
                      <span className="text-3xl font-bold">{playerCard.defense}</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-white mt-4 text-xl font-semibold">Tu Carta</p>
              </motion.div>

              {/* VS */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Swords className="h-24 w-24 text-red-500" />
              </motion.div>

              {/* Opponent Card */}
              <motion.div
                initial={{ x: 200, opacity: 0, rotate: 10 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: 'spring' }}
                className="relative"
              >
                <div className="w-44 h-64 md:w-52 md:h-80 lg:w-64 lg:h-96 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl shadow-2xl flex flex-col items-center justify-center p-4 md:p-6 border-4 border-white/20">
                  <p className="text-white text-lg md:text-xl lg:text-2xl font-bold mb-2 md:mb-4">{opponentCard.name}</p>
                  <div className="flex gap-4 text-white">
                    <div className="flex items-center gap-2">
                      <Zap className="h-6 w-6" />
                      <span className="text-3xl font-bold">{opponentCard.power}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-6 w-6" />
                      <span className="text-3xl font-bold">{opponentCard.defense}</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-white mt-4 text-xl font-semibold">Oponente</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Problem Modal */}
      <ProblemModal
        problem={playerProblem}
        isOpen={currentStep === 'player_problem'}
        onSubmit={handlePlayerSubmit}
        onClose={onCancel}
        role="attacker"
        timer={30}
      />

      {/* Opponent Problem Modal (simulated) */}
      <ProblemModal
        problem={opponentProblem}
        isOpen={currentStep === 'opponent_problem'}
        onSubmit={handleOpponentSubmit}
        onClose={onCancel}
        role="defender"
        timer={30}
        waitingForOpponent={false} // For now, opponent answers immediately
      />

      {/* Calculating */}
      <AnimatePresence>
        {currentStep === 'calculating' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="inline-block mb-4"
              >
                <Swords className="h-24 w-24 text-yellow-500" />
              </motion.div>
              <p className="text-white text-3xl font-bold">Calculando daño...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Damage Animation */}
      <AnimatePresence>
        {currentStep === 'damage_animation' && battleResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center"
          >
            <div className="flex items-center gap-32">
              {/* Player Damage */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1] }}
                transition={{ duration: 1 }}
                className="text-center"
              >
                <p className="text-white text-2xl mb-2">Daño Recibido</p>
                <div className="flex items-center gap-2 text-red-500">
                  <Heart className="h-16 w-16" />
                  <span className="text-6xl font-bold">-{battleResult.playerDamage}</span>
                </div>
                <p className="text-gray-400 mt-2">
                  HP: {battleResult.playerHealthRemaining}
                </p>
              </motion.div>

              {/* Opponent Damage */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1] }}
                transition={{ duration: 1, delay: 0.3 }}
                className="text-center"
              >
                <p className="text-white text-2xl mb-2">Daño Infligido</p>
                <div className="flex items-center gap-2 text-green-500">
                  <Zap className="h-16 w-16" />
                  <span className="text-6xl font-bold">-{battleResult.opponentDamage}</span>
                </div>
                <p className="text-gray-400 mt-2">
                  HP Oponente: {battleResult.opponentHealthRemaining}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {currentStep === 'result' && battleResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center"
          >
            <div className="text-center space-y-6">
              {/* Winner announcement */}
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <p
                  className={`text-7xl font-bold ${
                    battleResult.winner === 'player'
                      ? 'text-green-500'
                      : battleResult.winner === 'opponent'
                      ? 'text-red-500'
                      : 'text-yellow-500'
                  }`}
                >
                  {battleResult.winner === 'player'
                    ? '¡VICTORIA!'
                    : battleResult.winner === 'opponent'
                    ? 'DERROTA'
                    : 'EMPATE'}
                </p>
              </motion.div>

              {/* Results summary */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white/10 rounded-xl p-6 max-w-md mx-auto"
              >
                <div className="space-y-3 text-white">
                  <div className="flex justify-between">
                    <span>Tu respuesta:</span>
                    <span className={battleResult.playerResult.correct ? 'text-green-400' : 'text-red-400'}>
                      {battleResult.playerResult.correct ? '✓ Correcta' : '✗ Incorrecta'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Respuesta oponente:</span>
                    <span className={battleResult.opponentResult.correct ? 'text-green-400' : 'text-red-400'}>
                      {battleResult.opponentResult.correct ? '✓ Correcta' : '✗ Incorrecta'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
