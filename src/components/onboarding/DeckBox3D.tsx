'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface DeckBox3DProps {
  color: string;
  icon: ReactNode;
  name: string;
  bias: string;
}

export function DeckBox3D({ color, icon, name, bias }: DeckBox3DProps) {
  // Extract gradient colors for different faces
  // Assuming color prop is like "from-blue-600 to-cyan-500"
  const gradientClass = `bg-gradient-to-br ${color}`;
  
  return (
    <div className="perspective-1000 w-64 h-80 relative group cursor-pointer">
      <motion.div
        className="w-full h-full relative preserve-3d transition-transform duration-500 ease-out group-hover:rotate-y-12 group-hover:rotate-x-6"
        initial={{ rotateY: -20, rotateX: 10 }}
        animate={{ rotateY: -20, rotateX: 10 }}
        whileHover={{ rotateY: 15, rotateX: 5, scale: 1.05 }}
      >
        {/* Front Face */}
        <div className={`absolute inset-0 ${gradientClass} rounded-xl border-2 border-white/20 shadow-2xl backface-hidden flex flex-col items-center justify-center p-6 z-20`}>
          {/* Texture Overlay */}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <div className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                {icon}
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-md">{name}</h3>
            <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-xs font-mono text-zinc-300 uppercase tracking-widest">
              {bias}
            </div>
          </div>

          {/* Decorative Lines */}
          <div className="absolute top-4 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>

        {/* Right Face (Side) */}
        <div className={`absolute inset-0 ${gradientClass} brightness-75 rounded-r-xl border-r-2 border-white/10 backface-hidden origin-left transform translate-x-full rotate-y-90 w-16 h-full`}>
           <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Top Face (Lid) */}
        <div className={`absolute inset-0 ${gradientClass} brightness-125 rounded-t-xl border-t-2 border-white/30 backface-hidden origin-bottom transform -translate-y-full rotate-x-90 w-full h-16`}>
           <div className="absolute inset-0 bg-white/10" />
           {/* Lid Detail */}
           <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30" />
        </div>

        {/* Back Face (for depth illusion if rotated far) */}
        <div className={`absolute inset-0 bg-zinc-900 rounded-xl transform translate-z-[-64px] w-full h-full`} />

      </motion.div>
      
      {/* Shadow */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-black/60 blur-2xl rounded-full opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
    </div>
  );
}
