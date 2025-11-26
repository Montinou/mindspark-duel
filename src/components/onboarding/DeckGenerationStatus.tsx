'use client';

import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkDeckStatus } from '@/app/actions/user';

export function DeckGenerationStatus() {
  const router = useRouter();
  const [status, setStatus] = useState('generating');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await checkDeckStatus();
        
        if (result.status === 'completed' || (result.progress && result.progress === 100)) {
          setStatus('completed');
          setProgress(100);
          router.push('/dashboard');
        } else if (result.progress) {
          setProgress(result.progress);
        }
      } catch (error) {
        console.error("Failed to check deck status:", error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="mb-6 relative"
      >
        <div className="w-24 h-24 rounded-full border-4 border-blue-500/30 border-t-blue-500" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="text-blue-400 animate-pulse" size={32} />
        </div>
      </motion.div>

      <h2 className="text-2xl font-bold text-white mb-2">Crafting Your Deck</h2>
      <p className="text-zinc-400 max-w-md mb-8">
        The AI is weaving magic into your cards. This process ensures your deck is perfectly balanced for your chosen path.
      </p>

      <div className="w-full max-w-md bg-zinc-800/50 rounded-full h-2 overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      <div className="flex justify-between w-full max-w-md px-1">
        <p className="text-xs text-zinc-500 font-mono">
          {status === 'completed' ? 'Deck Ready! Redirecting...' : 'Generating card art and stats...'}
        </p>
        <p className="text-xs text-zinc-500 font-mono">
          {progress}%
        </p>
      </div>
    </div>
  );
}
