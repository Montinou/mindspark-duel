'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BattleProblem } from '@/types/battle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Zap, Shield } from 'lucide-react';

interface ProblemModalProps {
  problem: BattleProblem;
  isOpen: boolean;
  onSubmit: (answer: string) => void;
  onClose: () => void;
  role: 'attacker' | 'defender';
  timer?: number; // Timer in seconds (optional)
  waitingForOpponent?: boolean; // Show "waiting for opponent" state
}

export function ProblemModal({
  problem,
  isOpen,
  onSubmit,
  onClose,
  role,
  timer = 30,
  waitingForOpponent = false,
}: ProblemModalProps) {
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(timer);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || isSubmitted || waitingForOpponent) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up, auto-submit empty answer
          handleSubmit('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isSubmitted, waitingForOpponent]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAnswer('');
      setTimeLeft(timer);
      setIsSubmitted(false);
    }
  }, [isOpen, timer]);

  const handleSubmit = (submittedAnswer: string) => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    onSubmit(submittedAnswer);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    handleSubmit(answer.trim());
  };

  // Category-based colors
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

  // Role-based icon
  const RoleIcon = role === 'attacker' ? Zap : Shield;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitted) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl mx-4"
          >
            <Card className="relative overflow-hidden border-2 border-white/20 bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl">
              {/* Header with gradient */}
              <div
                className={`bg-gradient-to-r ${getCategoryColor(
                  problem.category
                )} p-6 text-white`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RoleIcon className="h-8 w-8" />
                    <div>
                      <h2 className="text-2xl font-bold">
                        {role === 'attacker' ? 'Ataque' : 'Defensa'}
                      </h2>
                      <p className="text-sm opacity-90">
                        {problem.category} • Dificultad {problem.difficulty}
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

              {/* Card context */}
              {problem.cardName && (
                <div className="bg-white/5 px-6 py-3 border-b border-white/10">
                  <p className="text-sm text-gray-400">
                    Carta:{' '}
                    <span className="text-white font-semibold">
                      {problem.cardName}
                    </span>
                    {problem.cardElement && (
                      <span className="ml-2 text-gray-500">
                        ({problem.cardElement})
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Problem content */}
              <div className="p-6 space-y-6">
                {/* Question */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">
                    Pregunta:
                  </h3>
                  <p className="text-xl text-white leading-relaxed">
                    {problem.question}
                  </p>
                </div>

                {/* Waiting for opponent state */}
                {waitingForOpponent && isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 text-center"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: 'linear',
                      }}
                      className="inline-block mb-3"
                    >
                      <Clock className="h-12 w-12 text-blue-400" />
                    </motion.div>
                    <p className="text-blue-300 text-lg font-semibold">
                      Esperando al oponente...
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      Tu respuesta ha sido enviada
                    </p>
                  </motion.div>
                ) : (
                  /* Answer input */
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="answer"
                        className="block text-sm font-semibold text-gray-400 mb-2"
                      >
                        Tu respuesta:
                      </label>
                      <input
                        id="answer"
                        type="text"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        disabled={isSubmitted}
                        placeholder="Escribe tu respuesta aquí..."
                        className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        autoFocus
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={!answer.trim() || isSubmitted}
                        className={`flex-1 bg-gradient-to-r ${getCategoryColor(
                          problem.category
                        )} hover:opacity-90 text-white font-bold py-3 text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isSubmitted ? 'Enviado ✓' : 'Enviar Respuesta'}
                      </Button>
                      {!isSubmitted && (
                        <Button
                          type="button"
                          onClick={onClose}
                          variant="outline"
                          className="px-6 bg-white/10 border-white/20 hover:bg-white/20 text-white"
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </form>
                )}

                {/* Progress indicator */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
