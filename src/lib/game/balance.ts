export function generateCardStats(cost: number) {
  // Base stat budget = Cost * 2 + 1
  // Variance +/- 1
  const budget = (cost * 2) + 1;
  const variance = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
  const finalBudget = Math.max(1, budget + variance);

  // Split budget between Power and Defense
  // Ensure at least 1 in each if budget allows
  let power = Math.floor(finalBudget / 2);
  let defense = finalBudget - power;

  // Add some randomness to the split
  if (finalBudget > 2) {
    const shift = Math.floor(Math.random() * 2); // 0 or 1
    if (Math.random() > 0.5) {
      power += shift;
      defense -= shift;
    } else {
      power -= shift;
      defense += shift;
    }
  }

  return {
    power: Math.max(0, power),
    defense: Math.max(1, defense) // Defense should be at least 1 usually
  };
}
