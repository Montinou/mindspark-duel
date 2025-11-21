'use client';

import { SignupButton } from '@/components/auth/AuthComponents';
import { motion } from 'framer-motion';

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-zinc-950 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-zinc-900/80 border border-zinc-800 p-12 rounded-3xl backdrop-blur-sm"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Become a Legend?
          </h2>
          <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
            Join thousands of students mastering math and logic through the power of magic. Your first deck awaits.
          </p>
          <div className="flex justify-center">
            <SignupButton className="px-8 py-4 bg-white text-black hover:bg-zinc-200 font-bold rounded-full text-lg transition-colors shadow-xl hover:shadow-white/10" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
