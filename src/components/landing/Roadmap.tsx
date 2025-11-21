'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const MILESTONES = [
  {
    title: "Phase 1: The Awakening",
    status: "completed",
    items: ["Core Game Engine", "AI Card Generation", "Basic Deck Building"],
    date: "Q4 2024"
  },
  {
    title: "Phase 2: The Academy",
    status: "current",
    items: ["Progression System", "Arcane Library", "Daily Missions"],
    date: "Q1 2025"
  },
  {
    title: "Phase 3: The Arena",
    status: "upcoming",
    items: ["PvP Multiplayer", "Global Leaderboards", "Tournaments"],
    date: "Q2 2025"
  },
  {
    title: "Phase 4: The Expansion",
    status: "upcoming",
    items: ["Mobile App", "Guild System", "Custom Card Market"],
    date: "Q3 2025"
  }
];

export function Roadmap() {
  return (
    <section className="py-24 bg-zinc-900/50 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
            Roadmap
          </h2>
          <p className="text-zinc-400 text-lg">
            The future of Mindspark Duel is bright. Here's what's coming next.
          </p>
        </div>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-zinc-800 transform md:-translate-x-1/2" />

          <div className="space-y-12">
            {MILESTONES.map((milestone, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`relative flex flex-col md:flex-row gap-8 ${
                  index % 2 === 0 ? 'md:flex-row-reverse' : ''
                }`}
              >
                {/* Content */}
                <div className="flex-1 ml-16 md:ml-0">
                  <div className={`p-6 rounded-2xl border border-zinc-800 bg-zinc-950/50 hover:border-purple-500/30 transition-colors ${
                    index % 2 === 0 ? 'md:text-right' : 'md:text-left'
                  }`}>
                    <div className={`flex items-center gap-2 mb-2 ${
                      index % 2 === 0 ? 'md:justify-end' : 'md:justify-start'
                    }`}>
                      <span className="text-sm font-mono text-purple-400">{milestone.date}</span>
                      {milestone.status === 'current' && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 animate-pulse">
                          Current
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">{milestone.title}</h3>
                    <ul className={`space-y-2 text-zinc-400 ${
                      index % 2 === 0 ? 'md:items-end' : 'md:items-start'
                    } flex flex-col`}>
                      {milestone.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          {index % 2 === 0 ? (
                            <>
                              <span>{item}</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                              <span>{item}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Center Icon */}
                <div className="absolute left-8 md:left-1/2 w-4 h-4 transform -translate-x-1/2 mt-6 flex items-center justify-center z-10">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    milestone.status === 'completed' ? 'bg-green-500 border-green-500' :
                    milestone.status === 'current' ? 'bg-purple-500 border-purple-500 animate-ping' :
                    'bg-zinc-900 border-zinc-700'
                  }`} />
                </div>

                {/* Spacer for layout balance */}
                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
