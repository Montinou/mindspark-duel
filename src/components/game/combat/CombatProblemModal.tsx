'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Clock, Check, X, Zap } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  modalScale,
  backdropFade,
  damageShake,
  correctFlash,
  incorrectFlash,
  timerProgress,
  timerUrgency,
} from './CombatAnimations';
import type { BattleProblem, Card } from '@/types/game';

interface CombatProblemModalProps {
  /** The problem to solve */
  problem: BattleProblem;
  /** The card associated with this problem */
  card: Card;
  /** Whether this is for an attacker (true) or blocker (false) */
  isAttacker: boolean;
  /** Time limit in seconds (default 30) */
  timeLimit?: number;
  /** Called when answer is submitted */
  onSubmit: (answer: string, timeMs: number, isCorrect: boolean) => void;
  /** Current problem index (1-based) for progress indicator */
  currentIndex?: number;
  /** Total number of problems */
  totalProblems?: number;
}

/**
 * CombatProblemModal - Modal for solving combat problems
 *
 * Features:
 * - 30-second countdown timer with progress bar
 * - Visual feedback for correct/incorrect answers
 * - Card preview showing the creature
 * - Auto-submit on timeout
 */
export const CombatProblemModal = memo(function CombatProblemModal({
  problem,
  card,
  isAttacker,
  timeLimit = 30,
  onSubmit,
  currentIndex = 1,
  totalProblems = 1,
}: CombatProblemModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto-submit with empty answer
          clearInterval(timerRef.current!);
          handleSubmit('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle answer submission
  const handleSubmit = useCallback(
    (answer: string) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      const timeMs = Date.now() - startTimeRef.current;
      const isCorrect = answer.toLowerCase().trim() === problem.correctAnswer.toLowerCase().trim();

      // Show feedback
      setFeedback(isCorrect ? 'correct' : 'incorrect');

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Delay before submitting to show feedback
      setTimeout(() => {
        onSubmit(answer, timeMs, isCorrect);
      }, 800);
    },
    [isSubmitting, problem.correctAnswer, onSubmit]
  );

  // Select answer
  const handleSelectAnswer = useCallback(
    (answer: string) => {
      if (isSubmitting) return;
      setSelectedAnswer(answer);
    },
    [isSubmitting]
  );

  // Confirm selection
  const handleConfirm = useCallback(() => {
    if (selectedAnswer) {
      handleSubmit(selectedAnswer);
    }
  }, [selectedAnswer, handleSubmit]);

  // Theme colors based on attacker/blocker
  const themeColor = isAttacker ? 'red' : 'blue';
  const Icon = isAttacker ? Swords : Shield;

  // Timer urgency (last 10 seconds)
  const isUrgent = timeRemaining <= 10;

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropFade}
        initial="initial"
        animate="animate"
        exit="exit"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          variants={modalScale}
          initial="initial"
          animate={feedback === 'incorrect' ? { x: [-8, 8, -6, 6, -4, 4, -2, 2, 0] } : 'animate'}
          exit="exit"
          transition={feedback === 'incorrect' ? { duration: 0.5, ease: 'easeOut' } : undefined}
          className={`
            relative w-full max-w-2xl
            bg-gradient-to-b from-zinc-900 to-zinc-950
            rounded-2xl border-2
            ${feedback === 'correct' ? 'border-green-500' : feedback === 'incorrect' ? 'border-red-500' : `border-${themeColor}-500/50`}
            shadow-2xl overflow-hidden
          `}
        >
          {/* Feedback overlay */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                variants={feedback === 'correct' ? correctFlash : incorrectFlash}
                initial="initial"
                animate="animate"
                className="absolute inset-0 pointer-events-none z-10"
              />
            )}
          </AnimatePresence>

          {/* Header */}
          <div className={`bg-${themeColor}-900/50 px-6 py-4 border-b border-${themeColor}-500/30`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${themeColor}-500/20`}>
                  <Icon className={`text-${themeColor}-400`} size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {isAttacker ? 'Problema de Ataque' : 'Problema de Defensa'}
                  </h2>
                  <p className="text-sm text-zinc-400">
                    {card.name} - {problem.category}
                  </p>
                </div>
              </div>

              {/* Progress indicator */}
              {totalProblems > 1 && (
                <div className="text-sm text-zinc-400">
                  {currentIndex} / {totalProblems}
                </div>
              )}
            </div>
          </div>

          {/* Timer bar */}
          <div className="h-2 bg-zinc-800 relative overflow-hidden">
            <motion.div
              variants={timerProgress(timeLimit)}
              initial="initial"
              animate="animate"
              className={`
                absolute inset-y-0 left-0 origin-left
                ${isUrgent ? 'bg-red-500' : `bg-${themeColor}-500`}
              `}
              style={{ width: '100%' }}
            />
          </div>

          {/* Timer text */}
          <motion.div
            variants={isUrgent ? timerUrgency : undefined}
            initial={isUrgent ? 'initial' : undefined}
            animate={isUrgent ? 'animate' : undefined}
            className={`
              flex items-center justify-center gap-2 py-2
              ${isUrgent ? 'text-red-400' : 'text-zinc-400'}
            `}
          >
            <Clock size={16} />
            <span className="font-mono font-bold">{timeRemaining}s</span>
          </motion.div>

          {/* Question */}
          <div className="px-6 py-6">
            <div className="bg-zinc-800/50 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <Zap className="text-yellow-400 mt-1 flex-shrink-0" size={20} />
                <p className="text-xl text-white leading-relaxed">
                  {problem.question}
                </p>
              </div>
            </div>

            {/* Answer options */}
            {problem.options && problem.options.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {problem.options.map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleSelectAnswer(option)}
                    disabled={isSubmitting}
                    whileHover={!isSubmitting ? { scale: 1.02 } : undefined}
                    whileTap={!isSubmitting ? { scale: 0.98 } : undefined}
                    className={`
                      p-4 rounded-xl text-left transition-all
                      ${isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'}
                      ${
                        selectedAnswer === option
                          ? `bg-${themeColor}-600 border-2 border-${themeColor}-400 text-white`
                          : 'bg-zinc-800 border-2 border-zinc-700 text-zinc-200 hover:border-zinc-500'
                      }
                      ${
                        feedback === 'correct' && option === problem.correctAnswer
                          ? 'bg-green-600 border-green-400'
                          : ''
                      }
                      ${
                        feedback === 'incorrect' && selectedAnswer === option
                          ? 'bg-red-600 border-red-400'
                          : ''
                      }
                    `}
                  >
                    <span className="text-sm font-medium">{option}</span>
                  </motion.button>
                ))}
              </div>
            ) : (
              // Free text input (for non-multiple choice)
              <input
                type="text"
                value={selectedAnswer || ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                disabled={isSubmitting}
                placeholder="Escribe tu respuesta..."
                className="w-full p-4 rounded-xl bg-zinc-800 border-2 border-zinc-700 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedAnswer) {
                    handleConfirm();
                  }
                }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex justify-end gap-3">
            <Button
              onClick={handleConfirm}
              disabled={!selectedAnswer || isSubmitting}
              className={`bg-${themeColor}-600 hover:bg-${themeColor}-500`}
            >
              {isSubmitting ? (
                feedback === 'correct' ? (
                  <>
                    <Check size={16} className="mr-2" />
                    ¡Correcto!
                  </>
                ) : feedback === 'incorrect' ? (
                  <>
                    <X size={16} className="mr-2" />
                    Incorrecto
                  </>
                ) : (
                  'Verificando...'
                )
              ) : (
                <>
                  <Check size={16} className="mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </div>

          {/* Feedback result overlay */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`
                  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  p-6 rounded-2xl z-20
                  ${feedback === 'correct' ? 'bg-green-500' : 'bg-red-500'}
                `}
              >
                {feedback === 'correct' ? (
                  <div className="flex items-center gap-3 text-white">
                    <Check size={32} />
                    <span className="text-2xl font-bold">¡Correcto!</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white">
                    <div className="flex items-center gap-3">
                      <X size={32} />
                      <span className="text-2xl font-bold">Incorrecto</span>
                    </div>
                    <span className="text-sm opacity-80">
                      Respuesta: {problem.correctAnswer}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default CombatProblemModal;
