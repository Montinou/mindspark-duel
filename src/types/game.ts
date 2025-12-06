export type ElementType = 'Fire' | 'Water' | 'Earth' | 'Air';
export type ProblemCategory = 'Math' | 'Logic' | 'Science';
export type Phase = 'start' | 'draw' | 'main' | 'combat' | 'end';

export interface CardBatch {
  id: string;
  name: string;
  theme: string;
  description?: string;
  styleGuidelines?: string;
  createdById?: string;
  createdAt: Date;
}

export interface Card {
  id: string;
  name: string;
  description: string; // Flavor text - thematic narrative
  flavorText?: string; // Thematic narrative text (alias)
  effectDescription?: string; // Game mechanics description
  cost: number;
  power: number;
  defense: number;
  element: ElementType;
  problemCategory: ProblemCategory;
  imageUrl?: string;
  imagePrompt?: string; // For regeneration/debugging
  theme?: string; // Thematic category (e.g., "Dragons", "Samurai")
  tags?: string[]; // Array of thematic tags
  batchId?: string; // Link to batch
  batchOrder?: number; // Position in batch (1-10)
  createdById?: string;
  createdAt?: Date;

  // Problem Generation Hints - used to dynamically generate problems when card is played
  problemHints?: ProblemHints;

  // Game State Properties
  canAttack?: boolean;
  isTapped?: boolean; // Exhausted
  summonedThisTurn?: boolean; // For summoning sickness validation

  // Ability System
  ability?: CardAbility;
  abilityUsedThisTurn?: boolean;
}

/**
 * Problem generation hints - stored on card, used to generate unique problems each play
 * NOTE: This interface should match the zod schema in src/lib/validators/problem-hints.ts
 */
export interface ProblemHints {
  keywords: string[]; // Thematic keywords for problem context (e.g., "volcano", "eruption", "lava")
  topics: string[]; // Required topics for problem generation
  difficulty?: number; // 1-10, complexity level
  subCategory?: string; // More specific category (e.g., "algebra", "geometry", "physics")
  contextType?: 'fantasy' | 'real_world' | 'abstract'; // How to frame the problem
  suggestedTopics?: string[]; // Optional specific topics (e.g., "fractions", "velocity")
  examples?: string[]; // Optional example problems
}

/**
 * Card ability - simple damage-based abilities with mana cost
 */
export interface CardAbility {
  name: string;
  manaCost: number;
  damage: number;
  target: 'enemy_hero' | 'enemy_creature' | 'all_enemies' | 'self_heal';
  description: string;
}

export interface Problem {
  question: string;
  options: string[];
  correctAnswer: string; // Index or value
  difficulty: number; // 1-10
  themeContext?: string; // Context for thematic problems
  cardId?: string; // Link to card
}

export interface Player {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  hand: Card[];
  board: Card[]; // Cards in play
  deck: number; // Count of cards remaining in deck
}

export interface GameState {
  turn: number;
  player: Player;
  enemy: Player;
  currentPhase: Phase;
  activeProblem: Problem | null;
  pendingCard: Card | null; // Card waiting for problem resolution
  winner: 'player' | 'enemy' | null;
}

// ═══════════════════════════════════════════════════════════════════════
// TURN MANAGER TYPES - Sistema de Fases estilo Magic: The Gathering
// ═══════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 * PhaseType - Sistema de 12 fases inspirado en Magic: The Gathering
 * ============================================================================
 *
 * ESTRUCTURA DE UN TURNO:
 *
 * ┌─ BEGINNING PHASE ─────────────────────────────────────────────────────────┐
 * │  untap    → Desbloquear criaturas (automático)                            │
 * │  upkeep   → Regenerar maná, efectos de mantenimiento                      │
 * │  draw     → Robar carta (fatiga si deck vacío)                            │
 * └───────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─ FIRST MAIN PHASE ────────────────────────────────────────────────────────┐
 * │  pre_combat_main → Jugar cartas (resolver problema al jugar)              │
 * └───────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─ COMBAT PHASE ────────────────────────────────────────────────────────────┐
 * │  begin_combat       → Inicio de combate, triggers                         │
 * │  declare_attackers  → Jugador declara atacantes (tap criaturas)           │
 * │  declare_blockers   → Defensor declara bloqueadores (IA en PvE)           │
 * │  combat_damage      → Resolver daño (dual-problem system)                 │
 * │  end_combat         → Fin de combate, limpiar efectos                     │
 * └───────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─ SECOND MAIN PHASE ───────────────────────────────────────────────────────┐
 * │  post_combat_main → Jugar cartas adicionales                              │
 * └───────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─ END PHASE ───────────────────────────────────────────────────────────────┐
 * │  end_step → Efectos de "al final del turno"                               │
 * │  cleanup  → Descartar exceso, remover daño temporal, pasar turno          │
 * └───────────────────────────────────────────────────────────────────────────┘
 */
export type PhaseType =
  // Beginning Phase (3 sub-fases, mayormente automáticas)
  | 'untap'              // Desbloquear todas las criaturas del jugador activo
  | 'upkeep'             // Regenerar maná, efectos de mantenimiento
  | 'draw'               // Robar 1 carta (o daño de fatiga)

  // First Main Phase (1 fase, interactiva)
  | 'pre_combat_main'    // Jugar cartas, usar habilidades (antes del combate)

  // Combat Phase (5 sub-fases)
  | 'begin_combat'       // Inicio del combate, triggers de "al entrar en combate"
  | 'declare_attackers'  // Jugador activo declara qué criaturas atacan
  | 'declare_blockers'   // Defensor declara qué criaturas bloquean (IA en PvE)
  | 'combat_damage'      // Resolver problemas y calcular daño
  | 'end_combat'         // Fin del combate, limpiar efectos temporales

  // Second Main Phase (1 fase, interactiva)
  | 'post_combat_main'   // Jugar cartas adicionales (después del combate)

  // End Phase (2 sub-fases, mayormente automáticas)
  | 'end_step'           // Efectos de "al final del turno"
  | 'cleanup';           // Descartar exceso de mano, remover daño, pasar turno

/**
 * PhaseGroup - Agrupación de fases para la UI
 * Permite mostrar una barra simplificada de progreso del turno
 */
export type PhaseGroup = 'beginning' | 'main1' | 'combat' | 'main2' | 'end';

/**
 * Mapping de cada fase a su grupo correspondiente
 * Usado por el componente PhaseIndicator para mostrar el progreso
 */
export const PHASE_TO_GROUP: Record<PhaseType, PhaseGroup> = {
  // Beginning Phase
  untap: 'beginning',
  upkeep: 'beginning',
  draw: 'beginning',
  // First Main Phase
  pre_combat_main: 'main1',
  // Combat Phase
  begin_combat: 'combat',
  declare_attackers: 'combat',
  declare_blockers: 'combat',
  combat_damage: 'combat',
  end_combat: 'combat',
  // Second Main Phase
  post_combat_main: 'main2',
  // End Phase
  end_step: 'end',
  cleanup: 'end',
};

/**
 * Información de cada grupo de fases para la UI
 */
export const PHASE_GROUP_INFO: Record<PhaseGroup, { label: string; labelEs: string; color: string }> = {
  beginning: { label: 'Beginning', labelEs: 'Inicio', color: 'from-yellow-500 to-orange-500' },
  main1: { label: 'Main 1', labelEs: 'Principal 1', color: 'from-blue-500 to-cyan-500' },
  combat: { label: 'Combat', labelEs: 'Combate', color: 'from-red-500 to-pink-500' },
  main2: { label: 'Main 2', labelEs: 'Principal 2', color: 'from-blue-500 to-cyan-500' },
  end: { label: 'End', labelEs: 'Fin', color: 'from-purple-500 to-indigo-500' },
};

/**
 * Etiquetas para cada fase en español
 */
export const PHASE_LABELS: Record<PhaseType, string> = {
  untap: 'Desbloquear',
  upkeep: 'Mantenimiento',
  draw: 'Robar',
  pre_combat_main: 'Fase Principal',
  begin_combat: 'Inicio Combate',
  declare_attackers: 'Declarar Atacantes',
  declare_blockers: 'Declarar Bloqueadores',
  combat_damage: 'Resolver Daño',
  end_combat: 'Fin Combate',
  post_combat_main: 'Fase Principal 2',
  end_step: 'Paso Final',
  cleanup: 'Limpieza',
};

// ============================================================================
// COMBAT STATE - Estado detallado del combate
// ============================================================================

/**
 * Estado completo del combate actual
 * Se crea al inicio del combate y se limpia al final
 */
export interface CombatState {
  /** Lista de atacantes declarados */
  attackers: AttackerDeclaration[];

  /** Lista de bloqueadores declarados */
  blockers: BlockerDeclaration[];

  /** ¿Ya se resolvió el daño de combate? */
  combatDamageResolved: boolean;

  /** Fase actual dentro del combate */
  combatPhase: 'declaring_attackers' | 'declaring_blockers' | 'resolving_damage' | 'complete';
}

/**
 * Declaración de un atacante
 * Generado cuando el jugador declara que una criatura ataca
 */
export interface AttackerDeclaration {
  /** ID de la carta atacante */
  attackerId: string;

  /** ID del objetivo: ID de criatura enemiga o 'opponent_hero' para ataque directo */
  targetId: string | 'opponent_hero';

  /** Problema generado para este atacante (si aplica) */
  problem?: BattleProblem;

  /** ¿Ya respondió el problema? */
  answered: boolean;

  /** ¿Respondió correctamente? */
  answerCorrect?: boolean;

  /** Tiempo que tardó en responder (ms) */
  responseTimeMs?: number;
}

/**
 * Declaración de un bloqueador
 * Generado cuando el defensor declara que una criatura bloquea
 */
export interface BlockerDeclaration {
  /** ID de la carta bloqueadora */
  blockerId: string;

  /** ID del atacante que está bloqueando */
  attackerId: string;

  /** Problema generado para este bloqueador (si aplica) */
  problem?: BattleProblem;

  /** ¿Ya respondió el problema? */
  answered: boolean;

  /** ¿Respondió correctamente? */
  answerCorrect?: boolean;

  /** Tiempo que tardó en responder (ms) */
  responseTimeMs?: number;
}

/**
 * Problema de batalla generado durante el combate
 */
export interface BattleProblem {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  category: ProblemCategory;
  difficulty: number;
  cardId: string;
  cardName: string;
  timeLimit: number; // Segundos para responder
}

// ============================================================================
// LEGACY PhaseType ALIAS (para compatibilidad con código existente)
// ============================================================================

/**
 * @deprecated Use PhaseType en su lugar
 * Alias para compatibilidad hacia atrás con código que usa el sistema de 4 fases
 */
export type LegacyPhaseType = 'start' | 'main' | 'combat' | 'end';

/**
 * Convierte fase legacy a la nueva más cercana
 */
export function legacyToNewPhase(legacyPhase: LegacyPhaseType): PhaseType {
  switch (legacyPhase) {
    case 'start':
      return 'upkeep';
    case 'main':
      return 'pre_combat_main';
    case 'combat':
      return 'declare_attackers';
    case 'end':
      return 'end_step';
  }
}

/**
 * Complete state of a turn in the game
 * This is the single source of truth for turn progression
 *
 * EXTENSIONES MTG:
 * - combatState: Estado detallado del combate (atacantes, bloqueadores, problemas)
 * - streakCount: Contador de racha para bonificaciones
 */
export interface TurnState {
  gameId: string;
  turnNumber: number;
  activePlayer: 'player' | 'opponent';
  currentPhase: PhaseType;

  // Mana tracking
  playerMana: number;
  playerMaxMana: number;
  opponentMana: number;
  opponentMaxMana: number;

  // Fatigue tracking (for empty deck draws)
  playerFatigueCounter: number;
  opponentFatigueCounter: number;

  // ─────────────────────────────────────────────────────────────────────────
  // NUEVOS CAMPOS - Sistema MTG
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Estado del combate actual
   * null cuando no estamos en fase de combate
   * Se crea en begin_combat y se limpia en end_combat
   */
  combatState: CombatState | null;

  /**
   * Contador de racha del jugador (respuestas correctas consecutivas)
   * Usado para bonificaciones: si >= 3, el jugador puede recibir bonus
   */
  playerStreakCount: number;

  /**
   * Contador de racha del oponente
   */
  opponentStreakCount: number;

  // Action history for this turn
  actions: GameAction[];
}

/**
 * Types of actions a player can take during a turn
 *
 * ACCIONES ORIGINALES (mantenidas para compatibilidad):
 * - play_card, attack, use_ability, end_phase, pass_turn
 *
 * NUEVAS ACCIONES (sistema MTG):
 * - declare_attacker: Declarar una criatura como atacante
 * - declare_blocker: Declarar una criatura como bloqueador
 * - submit_combat_answer: Enviar respuesta a problema de combate
 * - skip_blockers: Saltear fase de bloqueo (no bloquear)
 * - confirm_attackers: Confirmar todos los atacantes declarados
 */
export type GameActionType =
  // Acciones originales
  | 'play_card'           // Jugar carta desde la mano (Main Phase)
  | 'attack'              // LEGACY: Ataque simple (usar declare_attacker)
  | 'use_ability'         // Usar habilidad de criatura
  | 'end_phase'           // Terminar fase actual manualmente
  | 'pass_turn'           // Pasar turno al oponente

  // Nuevas acciones del sistema MTG
  | 'declare_attacker'    // Declarar una criatura como atacante
  | 'declare_blocker'     // Declarar una criatura como bloqueador
  | 'confirm_attackers'   // Confirmar todos los atacantes y pasar a bloqueadores
  | 'skip_blockers'       // No bloquear (pasar directo a daño)
  | 'submit_combat_answer'; // Enviar respuesta al problema de combate

/**
 * Represents a single action taken by a player
 */
export interface GameAction {
  type: GameActionType;
  playerId: string;
  timestamp: Date;
  data: Record<string, any>; // Action-specific data (cardId, targetId, etc.)
}

/**
 * Result of executing a game action
 */
export interface ActionResult {
  success: boolean;
  message?: string;
  updatedState?: TurnState;
  error?: string;
  data?: Record<string, any>; // Action-specific return data
}
