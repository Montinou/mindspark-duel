'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface ThemeOption {
  id: string;
  name: string;
  description: string;
  image: string;
  bias: string;
}

const THEMES: ThemeOption[] = [
  {
    id: 'technomancer',
    name: "Technomancer's Legion",
    description: "Masters of machines and calculation. High attack power, focused on Math problems.",
    image: "/assets/decks/technomancer_epic_box_1764234646053.png",
    bias: "Math"
  },
  {
    id: 'nature',
    name: "Grove Guardians",
    description: "Defenders of the natural world. High defense and healing, focused on Science problems.",
    image: "/assets/decks/nature_epic_box_1764234660611.png",
    bias: "Science"
  },
  {
    id: 'arcane',
    name: "Arcane Scholars",
    description: "Wielders of pure magic and logic. Balanced stats with powerful spells, focused on Logic problems.",
    image: "/assets/decks/arcane_epic_box_1764234805234.png",
    bias: "Logic"
  }
];

interface ThemeSelectorProps {
  onSelect: (themeId: string) => void;
  isSubmitting: boolean;
}

export function ThemeSelector({ onSelect, isSubmitting }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full px-4">
      {THEMES.map((theme) => (
        <motion.div
          key={theme.id}
          whileHover={{ scale: 1.05, y: -10 }}
          whileTap={{ scale: 0.95 }}
          className={`
            relative group flex flex-col items-center
            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => !isSubmitting && onSelect(theme.id)}
        >
          {/* Deck Box Image */}
          <div className="relative w-full aspect-[2/3] mb-6 drop-shadow-2xl">
            <Image
              src={theme.image}
              alt={`${theme.name} Deck Box`}
              fill
              className="object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all duration-300"
              priority
            />
          </div>

          {/* Theme Info */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
              {theme.name}
            </h3>
            <div className="text-sm font-mono text-zinc-400 uppercase tracking-wider">
              Bias: <span className="text-white">{theme.bias}</span>
            </div>
            <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
              {theme.description}
            </p>
          </div>

          {/* Select Button */}
          <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              disabled={isSubmitting}
              className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-colors"
            >
              Select Path
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
