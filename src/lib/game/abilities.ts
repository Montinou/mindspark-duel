/**
 * Card Abilities System - Simplified for Playable Game
 *
 * Each ability has:
 * - Mana cost to activate
 * - Damage/healing amount
 * - Target type
 *
 * Players can use abilities during Main Phase by paying mana.
 * Each creature can only use its ability once per turn.
 */

import { Card, CardAbility, ElementType } from '@/types/game';

// ═══════════════════════════════════════════════════════════════════════════
// ELEMENTAL ABILITY POOLS - Simple damage-based abilities
// ═══════════════════════════════════════════════════════════════════════════

const FIRE_ABILITIES: CardAbility[] = [
  {
    name: 'Llamarada',
    manaCost: 2,
    damage: 3,
    target: 'enemy_hero',
    description: 'Inflige 3 de daño al héroe enemigo.',
  },
  {
    name: 'Explosión Ígnea',
    manaCost: 4,
    damage: 2,
    target: 'all_enemies',
    description: 'Inflige 2 de daño a todas las criaturas enemigas.',
  },
  {
    name: 'Golpe Ardiente',
    manaCost: 1,
    damage: 2,
    target: 'enemy_creature',
    description: 'Inflige 2 de daño a una criatura enemiga.',
  },
];

const WATER_ABILITIES: CardAbility[] = [
  {
    name: 'Oleada Curativa',
    manaCost: 2,
    damage: 3, // Healing amount
    target: 'self_heal',
    description: 'Restaura 3 de vida a tu héroe.',
  },
  {
    name: 'Torrente Gélido',
    manaCost: 3,
    damage: 4,
    target: 'enemy_hero',
    description: 'Inflige 4 de daño al héroe enemigo.',
  },
  {
    name: 'Rayo de Escarcha',
    manaCost: 1,
    damage: 2,
    target: 'enemy_creature',
    description: 'Inflige 2 de daño a una criatura enemiga.',
  },
];

const EARTH_ABILITIES: CardAbility[] = [
  {
    name: 'Regeneración Terrestre',
    manaCost: 2,
    damage: 4, // Healing amount
    target: 'self_heal',
    description: 'Restaura 4 de vida a tu héroe.',
  },
  {
    name: 'Terremoto',
    manaCost: 5,
    damage: 3,
    target: 'all_enemies',
    description: 'Inflige 3 de daño a todas las criaturas enemigas.',
  },
  {
    name: 'Golpe de Roca',
    manaCost: 2,
    damage: 3,
    target: 'enemy_creature',
    description: 'Inflige 3 de daño a una criatura enemiga.',
  },
];

const AIR_ABILITIES: CardAbility[] = [
  {
    name: 'Ráfaga Cortante',
    manaCost: 1,
    damage: 2,
    target: 'enemy_hero',
    description: 'Inflige 2 de daño al héroe enemigo.',
  },
  {
    name: 'Tormenta Eléctrica',
    manaCost: 4,
    damage: 2,
    target: 'all_enemies',
    description: 'Inflige 2 de daño a todas las criaturas enemigas.',
  },
  {
    name: 'Viento Sanador',
    manaCost: 3,
    damage: 5, // Healing amount
    target: 'self_heal',
    description: 'Restaura 5 de vida a tu héroe.',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ABILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get ability pool for a specific element
 */
export function getAbilitiesForElement(element: ElementType): CardAbility[] {
  switch (element) {
    case 'Fire':
      return FIRE_ABILITIES;
    case 'Water':
      return WATER_ABILITIES;
    case 'Earth':
      return EARTH_ABILITIES;
    case 'Air':
      return AIR_ABILITIES;
    default:
      return [];
  }
}

/**
 * Get a random ability for a card based on its element
 */
export function getRandomAbility(element: ElementType): CardAbility {
  const abilities = getAbilitiesForElement(element);
  const randomIndex = Math.floor(Math.random() * abilities.length);
  return abilities[randomIndex];
}

/**
 * Assign ability to a card based on its element
 */
export function assignAbilityToCard(card: Card): Card {
  const ability = getRandomAbility(card.element);
  return {
    ...card,
    ability,
    abilityUsedThisTurn: false,
  };
}

/**
 * Check if ability can be used (has mana, not used this turn, creature is on board)
 */
export function canUseAbility(card: Card, currentMana: number): boolean {
  if (!card.ability) return false;
  if (card.abilityUsedThisTurn) return false;
  if (currentMana < card.ability.manaCost) return false;
  return true;
}

/**
 * Execute ability effect and return result
 */
export interface AbilityResult {
  success: boolean;
  manaCost: number;
  damage: number;
  target: CardAbility['target'];
  abilityName: string;
  message: string;
}

export function executeAbility(
  card: Card,
  currentMana: number
): AbilityResult | null {
  if (!canUseAbility(card, currentMana)) {
    return null;
  }

  const ability = card.ability!;

  return {
    success: true,
    manaCost: ability.manaCost,
    damage: ability.damage,
    target: ability.target,
    abilityName: ability.name,
    message: `${card.name} usa ${ability.name}: ${ability.description}`,
  };
}

/**
 * Format ability for display on card
 */
export function formatAbilityShort(ability: CardAbility): string {
  const targetIcons: Record<CardAbility['target'], string> = {
    enemy_hero: '👤',
    enemy_creature: '🎯',
    all_enemies: '💥',
    self_heal: '💚',
  };

  return `${targetIcons[ability.target]} ${ability.name} (${ability.manaCost}💎)`;
}

/**
 * Format ability for tooltip/detailed view
 */
export function formatAbilityFull(ability: CardAbility): string {
  const targetIcons: Record<CardAbility['target'], string> = {
    enemy_hero: '👤',
    enemy_creature: '🎯',
    all_enemies: '💥',
    self_heal: '💚',
  };

  return `${targetIcons[ability.target]} ${ability.name}\nCosto: ${ability.manaCost}💎\n${ability.description}`;
}

/**
 * Reset ability usage for all cards (called at start of turn)
 */
export function resetAbilitiesForTurn(cards: Card[]): Card[] {
  return cards.map((card) => ({
    ...card,
    abilityUsedThisTurn: false,
  }));
}

/**
 * Mark ability as used on a card
 */
export function markAbilityUsed(cards: Card[], cardId: string): Card[] {
  return cards.map((card) =>
    card.id === cardId ? { ...card, abilityUsedThisTurn: true } : card
  );
}
