'use client';

import { motion } from 'framer-motion';
import { Zap, Leaf, BookOpen } from 'lucide-react';

interface ThemeOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bias: string;
}

const THEMES: ThemeOption[] = [
  {
    id: 'technomancer',
    name: "Technomancer's Legion",
    description: "Masters of machines and calculation. High attack power, focused on Math problems.",
    icon: <Zap size={32} />,
    color: "from-blue-600 to-cyan-500",
    bias: "Math"
  },
  {
    id: 'nature',
    name: "Grove Guardians",
    description: "Defenders of the natural world. High defense and healing, focused on Science problems.",
    icon: <Leaf size={32} />,
    color: "from-green-600 to-emerald-500",
    bias: "Science"
  },
  {
    id: 'arcane',
    name: "Arcane Scholars",
    description: "Wielders of pure magic and logic. Balanced stats with powerful spells, focused on Logic problems.",
    icon: <BookOpen size={32} />,
    color: "from-purple-600 to-pink-500",
    bias: "Logic"
  }
];

interface ThemeSelectorProps {
  onSelect: (themeId: string) => void;
  isSubmitting: boolean;
}

export function ThemeSelector({ onSelect, isSubmitting }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
      {THEMES.map((theme) => (
        <motion.button
          key={theme.id}
          whileHover={{ scale: 1.05, y: -10 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(theme.id)}
          disabled={isSubmitting}
          className={`
            relative group overflow-hidden rounded-2xl p-1 text-left h-full
            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {/* Gradient Border */}
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
          
          {/* Card Content */}
          <div className="relative bg-zinc-900 h-full rounded-xl p-6 flex flex-col gap-4 border border-zinc-800 group-hover:border-transparent transition-colors">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.color} flex items-center justify-center text-white shadow-lg mb-2`}>
              {theme.icon}
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{theme.name}</h3>
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                Bias: <span className="text-white">{theme.bias}</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {theme.description}
              </p>
            </div>

            <div className="mt-auto pt-4">
              <div className={`w-full py-2 rounded-lg bg-zinc-800 text-center text-sm font-bold text-zinc-300 group-hover:bg-white group-hover:text-black transition-colors`}>
                Select Path
              </div>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
