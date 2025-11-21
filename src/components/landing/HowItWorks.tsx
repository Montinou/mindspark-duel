'use client';

import { motion } from 'framer-motion';
import { Wand2, Brain, Swords } from 'lucide-react';

const STEPS = [
  {
    icon: Wand2,
    title: "1. Choose Your Theme",
    description: "Select from elemental powers like Fire, Water, or Earth to shape your deck's destiny.",
    color: "text-purple-400",
    bg: "bg-purple-900/20"
  },
  {
    icon: Brain,
    title: "2. Generate Your Deck",
    description: "Watch as AI crafts unique cards based on your choices. Every deck is one-of-a-kind.",
    color: "text-blue-400",
    bg: "bg-blue-900/20"
  },
  {
    icon: Swords,
    title: "3. Battle with Knowledge",
    description: "Solve math and logic problems to cast spells. Your mind is your greatest weapon.",
    color: "text-pink-400",
    bg: "bg-pink-900/20"
  }
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-zinc-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              How to Play
            </span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Your journey from apprentice to archmage begins with three simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-2xl transform transition-transform group-hover:scale-105" />
              <div className="relative p-8 text-center space-y-6">
                <div className={`w-16 h-16 mx-auto rounded-full ${step.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <step.icon className={`w-8 h-8 ${step.color}`} />
                </div>
                <h3 className="text-xl font-bold text-white">{step.title}</h3>
                <p className="text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
