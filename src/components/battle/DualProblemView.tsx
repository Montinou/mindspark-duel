'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BattleProblem } from '@/types/battle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Zap, Shield, Eye, EyeOff } from 'lucide-react';

interface DualProblemViewProps {
  playerProblem: BattleProblem;
  opponentProblem: BattleProblem;
  isOpen: boolean;
  onPlayerSubmit: (answer: string) => void;
  onBothComplete: (playerAnswer: string, opponentAnswer: string) => void;
  onClose: () => void;
  timer?: number;
  showOpponentAnswers?: boolean; // For testing/debugging
}

export function DualProblemView({
  playerProblem,
  opponentProblem,
  isOpen,
  onPlayerSubmit,
  onBothComplete,
  onClose,
  timer = 30,
  showOpponentAnswers = false,
}: DualProblemViewProps) {
  const [playerAnswer, setPlayerAnswer] = useState('');
  const [playerSubmitted, setPlayerSubmitted] = useState(false);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timer);

  // Simulate opponent solving problem
  useEffect(() => {
    if (!isOpen || opponentSubmitted) return;

    // Opponent takes 5-10 seconds to "think"
    const opponentThinkTime = Math.random() * 5000 + 5000; // 5-10 seconds

    const opponentTimer = setTimeout(() => {
      setOpponentSubmitted(true);
      // Check if both have submitted
      if (playerSubmitted) {
        handleBothComplete();
      }
    }, opponentThinkTime);

    return () => clearTimeout(opponentTimer);
  }, [isOpen, playerSubmitted, opponentSubmitted]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || (playerSubmitted && opponentSubmitted)) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up, auto-submit
          if (!playerSubmitted) {
            handlePlayerSubmit('');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, playerSubmitted, opponentSubmitted]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPlayerAnswer('');
      setPlayerSubmitted(false);
      setOpponentSubmitted(false);
      setTimeLeft(timer);
    }
  }, [isOpen, timer]);

  const handlePlayerSubmit = (answer: string) => {
    if (playerSubmitted) return;

    setPlayerSubmitted(true);
    onPlayerSubmit(answer);

    // Check if opponent already submitted
    if (opponentSubmitted) {
      handleBothComplete();
    }
  };

  const handleBothComplete = () => {
    // Both players have submitted, resolve battle
    // Opponent answer will be generated server-side
    onBothComplete(playerAnswer, ''); // Empty string will trigger AI answer generation
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerAnswer.trim()) return;
    handlePlayerSubmit(playerAnswer.trim());
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Math':
        return 'from-blue-600 to-cyan-600';
      case 'Logic':
        return 'from-purple-600 to-pink-600';
      case 'Science':
        return 'from-green-600 to-emerald-600';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-7xl mx-4 h-[90vh] flex gap-4"
          >
            {/* Player Problem (Large) */}
            <div className="flex-1 flex flex-col">
              <Card className="flex-1 overflow-hidden border-2 border-blue-500/50 bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl">
                {/* Header */}
                <div
                  className={`bg-gradient-to-r ${getCategoryColor(
                    playerProblem.category
                  )} p-6 text-white`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="h-8 w-8" />
                      <div>
                        <h2 className="text-2xl font-bold">Tu Problema</h2>
                        <p className="text-sm opacity-90">
                          {playerProblem.category} • Dificultad {playerProblem.difficulty}
                        </p>
                      </div>
                    </div>

                    {/* Timer */}
                    <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-2">
                      <Clock className="h-5 w-5" />
                      <span
                        className={`text-xl font-mono font-bold ${
                          timeLeft <= 10 ? 'text-red-400 animate-pulse' : ''
                        }`}
                      >
                        {timeLeft}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Context */}
                {playerProblem.cardName && (
                  <div className="bg-white/5 px-6 py-3 border-b border-white/10">
                    <p className="text-sm text-gray-400">
                      Carta:{' '}
                      <span className="text-white font-semibold">
                        {playerProblem.cardName}
                      </span>
                      {playerProblem.cardElement && (
                        <span className="ml-2 text-gray-500">
                          ({playerProblem.cardElement})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Problem Content */}
                <div className="flex-1 p-6 flex flex-col">
                  {/* Question */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-400 mb-4">
                      Pregunta:
                    </h3>
                    <p className="text-2xl text-white leading-relaxed">
                      {playerProblem.question}
                    </p>
                  </div>

                  {/* Answer or Waiting State */}
                  {playerSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center"
                    >
                      <div className="text-green-400 text-2xl font-bold mb-2">
                        ✓ Respuesta Enviada
                      </div>
                      {!opponentSubmitted && (
                        <div className="flex items-center justify-center gap-2 text-gray-400">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Infinity,
                              duration: 2,
                              ease: 'linear',
                            }}
                          >
                            <Clock className="h-5 w-5" />
                          </motion.div>
                          <span>Esperando al oponente...</span>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <div>
                        <label
                          htmlFor="player-answer"
                          className="block text-sm font-semibold text-gray-400 mb-2"
                        >
                          Tu respuesta:
                        </label>
                        <input
                          id="player-answer"
                          type="text"
                          value={playerAnswer}
                          onChange={(e) => setPlayerAnswer(e.target.value)}
                          placeholder="Escribe tu respuesta aquí..."
                          className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white text-xl placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                          autoFocus
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="submit"
                          disabled={!playerAnswer.trim()}
                          className={`flex-1 bg-gradient-to-r ${getCategoryColor(
                            playerProblem.category
                          )} hover:opacity-90 text-white font-bold py-3 text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          Enviar Respuesta
                        </Button>
                        <Button
                          type="button"
                          onClick={onClose}
                          variant="outline"
                          className="px-6 bg-white/10 border-white/20 hover:bg-white/20 text-white"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft / timer) * 100}%` }}
                      transition={{ duration: 0.3 }}
                      className={`h-full ${
                        timeLeft <= 10
                          ? 'bg-red-500'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      }`}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Opponent Problem (Small Preview) */}
            <div className="w-96 flex flex-col">
              <Card className="flex-1 overflow-hidden border-2 border-red-500/50 bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl opacity-80">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 text-white">
                  <div className="flex items-center gap-2">
                    <Shield className="h-6 w-6" />
                    <div>
                      <h3 className="text-lg font-bold">Oponente</h3>
                      <p className="text-xs opacity-90">
                        {opponentProblem.category} • Dif. {opponentProblem.difficulty}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Context */}
                {opponentProblem.cardName && (
                  <div className="bg-white/5 px-4 py-2 border-b border-white/10">
                    <p className="text-xs text-gray-400">
                      Carta: <span className="text-white text-sm">{opponentProblem.cardName}</span>
                    </p>
                  </div>
                )}

                {/* Problem Preview */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">
                      Su Pregunta:
                    </h4>
                    {showOpponentAnswers ? (
                      <p className="text-white leading-relaxed">
                        {opponentProblem.question}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-4 bg-white/10 rounded w-full" />
                        <div className="h-4 bg-white/10 rounded w-5/6" />
                        <div className="h-4 bg-white/10 rounded w-4/6" />
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="mt-4">
                    {opponentSubmitted ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-orange-500/20 border border-orange-500/40 rounded-lg p-3 text-center"
                      >
                        <div className="text-orange-400 font-bold">
                          ✓ Respondió
                        </div>
                      </motion.div>
                    ) : (
                      <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-yellow-400">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Infinity,
                              duration: 2,
                              ease: 'linear',
                            }}
                          >
                            <Clock className="h-4 w-4" />
                          </motion.div>
                          <span className="text-sm font-semibold">Pensando...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Toggle visibility (debug) */}
                  {showOpponentAnswers && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-gray-500 hover:text-white"
                      onClick={() => {}}
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      Modo Depuración
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
