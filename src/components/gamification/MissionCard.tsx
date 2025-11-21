'use client';

import { CheckCircle, Circle, Gift } from "lucide-react";
import { motion } from "framer-motion";

interface MissionProps {
  title: string;
  description: string;
  progress: number;
  total: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
  onClaim?: () => void;
}

export function MissionCard({ title, description, progress, total, reward, completed, claimed, onClaim }: MissionProps) {
  const percentage = Math.min(100, (progress / total) * 100);

  return (
    <div className={`p-4 rounded-xl border ${completed ? 'bg-purple-900/20 border-purple-500/50' : 'bg-zinc-900/50 border-zinc-800'} relative overflow-hidden group`}>
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div>
          <h3 className="font-bold text-white">{title}</h3>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
        <div className="flex items-center gap-1 text-yellow-400 font-bold bg-yellow-400/10 px-2 py-1 rounded-lg">
          <Gift className="w-4 h-4" />
          <span>{reward}</span>
        </div>
      </div>

      <div className="mt-4 relative z-10">
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>Progress</span>
          <span>{progress} / {total}</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={`h-full ${completed ? 'bg-purple-500' : 'bg-blue-500'}`}
          />
        </div>
      </div>

      {completed && !claimed && (
        <button 
          onClick={onClaim}
          className="mt-4 w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Gift className="w-4 h-4" />
          Claim Reward
        </button>
      )}

      {claimed && (
        <div className="mt-4 w-full py-2 bg-zinc-800 text-zinc-500 font-bold rounded-lg flex items-center justify-center gap-2 cursor-default">
          <CheckCircle className="w-4 h-4" />
          Claimed
        </div>
      )}
    </div>
  );
}
