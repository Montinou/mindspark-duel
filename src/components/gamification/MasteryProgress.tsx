'use client';

import { motion } from "framer-motion";
import { Flame, Droplets, Mountain, Wind, Brain, Calculator } from "lucide-react";

interface MasteryProps {
  category: string;
  level: number;
  xp: number;
  nextLevelXp: number;
}

const ICONS: Record<string, any> = {
  'Fire': Flame,
  'Water': Droplets,
  'Earth': Mountain,
  'Air': Wind,
  'Math': Calculator,
  'Logic': Brain
};

const COLORS: Record<string, string> = {
  'Fire': 'text-red-500 bg-red-500',
  'Water': 'text-blue-500 bg-blue-500',
  'Earth': 'text-green-500 bg-green-500',
  'Air': 'text-sky-300 bg-sky-300',
  'Math': 'text-purple-500 bg-purple-500',
  'Logic': 'text-indigo-500 bg-indigo-500'
};

export function MasteryProgress({ category, level, xp, nextLevelXp }: MasteryProps) {
  const Icon = ICONS[category] || Brain;
  const colorClass = COLORS[category] || 'text-zinc-500 bg-zinc-500';
  const percentage = Math.min(100, (xp / nextLevelXp) * 100);

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800`}>
        <Icon className={`w-6 h-6 ${colorClass.split(' ')[0]}`} />
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <h4 className="font-bold text-white">{category} Mastery</h4>
          <span className="text-sm font-bold text-zinc-400">Lvl {level}</span>
        </div>
        
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={`h-full ${colorClass.split(' ')[1]}`}
          />
        </div>
        <div className="text-xs text-zinc-500 mt-1 text-right">
          {xp} / {nextLevelXp} XP
        </div>
      </div>
    </div>
  );
}
