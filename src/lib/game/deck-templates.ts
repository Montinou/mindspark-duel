export const DECK_TEMPLATES = {
  technomancer: {
    name: "Technomancer's Legion",
    bias: { math: 0.7, logic: 0.15, science: 0.15 },
    description: "A deck focused on calculation and machine efficiency."
  },
  nature: {
    name: "Grove Guardians",
    bias: { science: 0.7, math: 0.15, logic: 0.15 },
    description: "A deck focused on biological growth and natural defense."
  },
  arcane: {
    name: "Arcane Scholars",
    bias: { logic: 0.7, science: 0.15, math: 0.15 },
    description: "A deck focused on pure magical theory and logical deduction."
  }
} as const;

export const MANA_CURVE = {
  1: 2, // 2 cards of cost 1
  2: 2, // 2 cards of cost 2
  3: 4, // 4 cards of cost 3
  4: 4, // 4 cards of cost 4
  5: 4, // 4 cards of cost 5
  6: 2, // 2 cards of cost 6
  7: 2  // 2 cards of cost 7+
};
// Total: 20 cards

export type ProblemType = 'Math' | 'Science' | 'Logic';

export function getProblemTypeForTheme(themeId: string): ProblemType {
  const theme = DECK_TEMPLATES[themeId as keyof typeof DECK_TEMPLATES];
  if (!theme) return 'Math'; // Default

  const rand = Math.random();
  let cumulative = 0;
  
  if (rand < (cumulative += theme.bias.math)) return 'Math';
  if (rand < (cumulative += theme.bias.science)) return 'Science';
  return 'Logic';
}
