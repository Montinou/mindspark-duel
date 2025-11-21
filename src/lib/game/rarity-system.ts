export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1
};

const PITY_THRESHOLD = 10; // Guaranteed Epic+ after 10 packs without one

export function determineRarity(pityCounter: number): Rarity {
  // Hard Pity Check
  if (pityCounter >= PITY_THRESHOLD) {
    // Guaranteed Epic or Legendary
    const roll = Math.random() * 100;
    return roll < 20 ? 'legendary' : 'epic';
  }

  // Standard Roll
  const roll = Math.random() * 100;
  let cumulative = 0;

  if (roll < (cumulative += RARITY_WEIGHTS.legendary)) return 'legendary';
  if (roll < (cumulative += RARITY_WEIGHTS.epic)) return 'epic';
  if (roll < (cumulative += RARITY_WEIGHTS.rare)) return 'rare';
  if (roll < (cumulative += RARITY_WEIGHTS.uncommon)) return 'uncommon';
  
  return 'common';
}

export function getRarityColor(rarity: Rarity): string {
  switch (rarity) {
    case 'common': return 'border-zinc-600 shadow-none';
    case 'uncommon': return 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]';
    case 'rare': return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]';
    case 'epic': return 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]';
    case 'legendary': return 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)]';
    default: return 'border-zinc-600';
  }
}
