'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Problem } from '@/types/game';

interface ProblemModalProps {
  problem: Problem | null;
  onSolve: (answer: string, timeTaken: number) => void;
}

export function ProblemModal({ problem, onSolve }: ProblemModalProps) {
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    if (problem) {
      setStartTime(Date.now());
    }
  }, [problem]);

  if (!problem) return null;

  const handleAnswer = (answer: string) => {
    const timeTaken = Date.now() - startTime;
    onSolve(answer, timeTaken);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Knowledge Check!</h2>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 15, ease: "linear" }}
              />
            </div>
            <p className="text-zinc-400 text-sm mt-2">Solve quickly for critical effect!</p>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-6 mb-6 border border-zinc-700/50">
            <p className="text-xl text-white font-medium text-center">
              {problem.question}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {problem.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                className="p-4 rounded-lg bg-zinc-800 hover:bg-blue-600 text-zinc-200 hover:text-white font-semibold transition-all border border-zinc-700 hover:border-blue-500 active:scale-95"
              >
                {option}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
