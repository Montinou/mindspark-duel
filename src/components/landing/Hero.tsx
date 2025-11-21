'use client';

import { motion } from 'framer-motion';
import { LoginButton, SignupButton } from '@/components/auth/AuthComponents';

export function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-zinc-950/80 to-purple-900/20 pointer-events-none" />
      
      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-4xl mx-auto space-y-8"
      >
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">
            Mindspark Duel
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-zinc-300 leading-relaxed max-w-2xl mx-auto">
          Master the arcane arts through knowledge. Solve problems, cast spells, and challenge the Dark Quizmaster in this educational trading card game.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <div className="scale-125">
            <SignupButton />
          </div>
          <div className="text-zinc-400 text-sm">
            Already a wizard? <LoginButton />
          </div>
        </div>
      </motion.div>

      {/* Floating Cards Animation (Decorative) */}
      <motion.div 
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 right-10 w-32 h-48 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl opacity-20 rotate-12 blur-xl"
      />
      <motion.div 
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-20 left-10 w-24 h-36 bg-gradient-to-br from-pink-600 to-orange-600 rounded-xl opacity-20 -rotate-12 blur-xl"
      />
    </section>
  );
}
