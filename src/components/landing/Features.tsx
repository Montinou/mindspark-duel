'use client';

import { motion } from 'framer-motion';
import { Brain, Sparkles, Zap } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: "Knowledge is Power",
    description: "Your intellect is your weapon. Solve math, science, and logic problems to charge your spells."
  },
  {
    icon: Sword,
    title: "Strategic Battles",
    description: "Build your deck, manage your mana, and outsmart opponents in turn-based card combat."
  },
  {
    icon: Scroll,
    title: "Collect & Master",
    description: "Research ancient tomes to discover rare cards. Build the ultimate deck tailored to your playstyle."
  },
  {
    icon: Sparkles,
    title: "Magical Progression",
    description: "Earn Sparks, level up your mastery, and unlock exclusive cosmetic rewards."
  }
];

export function Features() {
  return (
    <section className="py-24 bg-zinc-900/50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Why Mindspark Duel?
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Unlike traditional games, your power here comes from your mind. Unlike traditional education, learning here is an epic adventure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-900/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">AI-Powered Creation</h3>
                <p className="text-zinc-400">
                  Every card is unique. Our AI engine generates custom artwork, lore, and abilities based on your inputs. No two decks are alike.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-900/30 flex items-center justify-center shrink-0">
                <Brain className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Learn to Earn</h3>
                <p className="text-zinc-400">
                  Solve math, science, and logic problems to cast spells. The more you learn, the more powerful you become.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-pink-900/30 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Strategic Depth</h3>
                <p className="text-zinc-400">
                  Combine elemental affinities, manage mana resources, and outsmart opponents in tactical turn-based combat.
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-2xl opacity-20" />
            <img 
              src="/feature-creation.png" 
              alt="AI Card Creation Process" 
              className="relative rounded-2xl border border-zinc-700 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500"
            />
          </div>
        </div>

        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Mindspark Duel combines the depth of a TCG with the value of education.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl hover:border-purple-500/50 transition-colors group"
            >
              <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-900/20 transition-colors">
                <feature.icon className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
