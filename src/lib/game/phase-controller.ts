/**
 * ============================================================================
 * PHASE CONTROLLER - Sistema de Fases estilo Magic: The Gathering
 * ============================================================================
 *
 * PROPÓSITO:
 * Módulo puro y determinístico que maneja las transiciones de fase y valida
 * qué acciones están permitidas en cada fase. Sin efectos secundarios.
 *
 * SISTEMA DE 12 FASES (inspirado en MTG):
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
 * │  declare_attackers  → Jugador declara atacantes                           │
 * │  declare_blockers   → Defensor declara bloqueadores (IA en PvE)           │
 * │  combat_damage      → Resolver daño (dual-problem system)                 │
 * │  end_combat         → Fin de combate                                      │
 * └───────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─ SECOND MAIN PHASE ───────────────────────────────────────────────────────┐
 * │  post_combat_main → Jugar cartas adicionales                              │
 * └───────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─ END PHASE ───────────────────────────────────────────────────────────────┐
 * │  end_step → Efectos de "al final del turno"                               │
 * │  cleanup  → Descartar exceso, pasar turno                                 │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * ============================================================================
 */

import {
  PhaseType,
  GameActionType,
  PhaseGroup,
  PHASE_TO_GROUP,
  PHASE_LABELS,
} from '@/types/game';

// ============================================================================
// SECUENCIA DE FASES
// ============================================================================

/**
 * Secuencia ordenada de todas las fases en un turno.
 * Después de 'cleanup', el turno pasa al oponente y comienza en 'untap'.
 */
export const PHASE_SEQUENCE: PhaseType[] = [
  // Beginning Phase
  'untap',
  'upkeep',
  'draw',
  // First Main Phase
  'pre_combat_main',
  // Combat Phase
  'begin_combat',
  'declare_attackers',
  'declare_blockers',
  'combat_damage',
  'end_combat',
  // Second Main Phase
  'post_combat_main',
  // End Phase
  'end_step',
  'cleanup',
];

// ============================================================================
// ACCIONES PERMITIDAS POR FASE
// ============================================================================

/**
 * Mapeo de cada fase a las acciones que el jugador puede realizar.
 *
 * NOTAS:
 * - Fases vacías [] son automáticas (el sistema las procesa sin input)
 * - 'end_phase' permite al jugador avanzar manualmente
 * - 'use_ability' está disponible en fases interactivas donde tiene sentido
 */
export const PHASE_ACTIONS: Record<PhaseType, GameActionType[]> = {
  // ─────────────────────────────────────────────────────────────────────────
  // BEGINNING PHASE - Mayormente automáticas
  // ─────────────────────────────────────────────────────────────────────────
  untap: [],                    // Automático: desbloquear criaturas
  upkeep: ['use_ability'],      // Triggers de upkeep, habilidades especiales
  draw: [],                     // Automático: robar 1 carta

  // ─────────────────────────────────────────────────────────────────────────
  // FIRST MAIN PHASE - Fase interactiva principal
  // ─────────────────────────────────────────────────────────────────────────
  pre_combat_main: [
    'play_card',      // Jugar carta desde la mano (requiere resolver problema)
    'use_ability',    // Usar habilidad de criatura
    'end_phase',      // Pasar a fase de combate
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // COMBAT PHASE - Sub-fases de combate
  // ─────────────────────────────────────────────────────────────────────────
  begin_combat: [
    'end_phase',      // Saltar combate (ir a post_combat_main)
  ],

  declare_attackers: [
    'declare_attacker',   // Declarar una criatura como atacante
    'confirm_attackers',  // Confirmar atacantes y pasar a bloqueadores
    'end_phase',          // No atacar (ir a post_combat_main)
  ],

  declare_blockers: [
    'declare_blocker',    // Declarar bloqueador (para PvP futuro)
    'skip_blockers',      // No bloquear (para IA o pasar)
  ],

  combat_damage: [
    'submit_combat_answer', // Responder al problema de combate
  ],

  end_combat: [],         // Automático: limpiar efectos de combate

  // ─────────────────────────────────────────────────────────────────────────
  // SECOND MAIN PHASE - Segunda oportunidad de jugar cartas
  // ─────────────────────────────────────────────────────────────────────────
  post_combat_main: [
    'play_card',      // Jugar carta
    'use_ability',    // Usar habilidad
    'end_phase',      // Terminar turno
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // END PHASE - Cleanup y pasar turno
  // ─────────────────────────────────────────────────────────────────────────
  end_step: [
    'use_ability',    // Habilidades de "al final del turno"
    'end_phase',      // Proceder a cleanup
  ],

  cleanup: [],          // Automático: descartar exceso, remover daño, pasar turno
};

// ============================================================================
// FASES AUTOMÁTICAS
// ============================================================================

/**
 * Fases que se procesan automáticamente sin input del jugador.
 * El sistema ejecuta la lógica correspondiente y avanza inmediatamente.
 */
export const AUTOMATIC_PHASES: PhaseType[] = [
  'untap',
  'draw',
  'end_combat',
  'cleanup',
];

/**
 * Fases que pueden saltarse si no hay acciones relevantes.
 * Por ejemplo, si no hay criaturas para atacar, begin_combat puede saltarse.
 */
export const SKIPPABLE_PHASES: PhaseType[] = [
  'begin_combat',
  'end_combat',
  'end_step',
];

// ============================================================================
// FUNCIONES DE NAVEGACIÓN
// ============================================================================

/**
 * Obtiene la siguiente fase en la secuencia.
 * Si estamos en 'cleanup', retorna 'untap' (indica nuevo turno).
 *
 * @param currentPhase - Fase actual
 * @returns Siguiente fase en la secuencia
 */
export function getNextPhase(currentPhase: PhaseType): PhaseType {
  const currentIndex = PHASE_SEQUENCE.indexOf(currentPhase);

  if (currentIndex === -1) {
    console.error(`[PhaseController] Fase inválida: ${currentPhase}`);
    throw new Error(`Fase inválida: ${currentPhase}`);
  }

  // Si estamos en la última fase, volver al inicio (nuevo turno)
  if (currentIndex === PHASE_SEQUENCE.length - 1) {
    return 'untap';
  }

  return PHASE_SEQUENCE[currentIndex + 1];
}

/**
 * Obtiene la fase anterior en la secuencia.
 * Útil para funcionalidad de deshacer.
 *
 * @param currentPhase - Fase actual
 * @returns Fase anterior en la secuencia
 */
export function getPreviousPhase(currentPhase: PhaseType): PhaseType {
  const currentIndex = PHASE_SEQUENCE.indexOf(currentPhase);

  if (currentIndex === -1) {
    throw new Error(`Fase inválida: ${currentPhase}`);
  }

  // Si estamos en la primera fase, ir al final (turno anterior)
  if (currentIndex === 0) {
    return 'cleanup';
  }

  return PHASE_SEQUENCE[currentIndex - 1];
}

/**
 * Obtiene el índice de una fase en la secuencia.
 *
 * @param phase - Fase a buscar
 * @returns Índice (0-11) o -1 si no existe
 */
export function getPhaseIndex(phase: PhaseType): number {
  return PHASE_SEQUENCE.indexOf(phase);
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Verifica si una acción está permitida en una fase específica.
 *
 * @param actionType - Tipo de acción a verificar
 * @param phase - Fase actual
 * @returns true si la acción está permitida
 */
export function isActionAllowedInPhase(
  actionType: GameActionType,
  phase: PhaseType
): boolean {
  const allowedActions = PHASE_ACTIONS[phase] || [];
  return allowedActions.includes(actionType);
}

/**
 * Obtiene las acciones permitidas para una fase.
 *
 * @param phase - Fase a consultar
 * @returns Array de acciones permitidas
 */
export function getAllowedActions(phase: PhaseType): GameActionType[] {
  return PHASE_ACTIONS[phase] || [];
}

/**
 * Verifica si una fase es automática (no requiere input del jugador).
 *
 * @param phase - Fase a verificar
 * @returns true si la fase es automática
 */
export function isAutomaticPhase(phase: PhaseType): boolean {
  return AUTOMATIC_PHASES.includes(phase);
}

/**
 * Verifica si una fase puede saltarse.
 *
 * @param phase - Fase a verificar
 * @returns true si la fase puede saltarse
 */
export function isSkippablePhase(phase: PhaseType): boolean {
  return SKIPPABLE_PHASES.includes(phase);
}

/**
 * Verifica si estamos en alguna de las fases de combate.
 *
 * @param phase - Fase actual
 * @returns true si es una fase de combate
 */
export function isCombatPhase(phase: PhaseType): boolean {
  return PHASE_TO_GROUP[phase] === 'combat';
}

/**
 * Verifica si estamos en una Main Phase (pre o post combate).
 *
 * @param phase - Fase actual
 * @returns true si es una Main Phase
 */
export function isMainPhase(phase: PhaseType): boolean {
  return phase === 'pre_combat_main' || phase === 'post_combat_main';
}

// ============================================================================
// FUNCIONES DE INFORMACIÓN
// ============================================================================

/**
 * Obtiene una descripción legible de las acciones permitidas en una fase.
 *
 * @param phase - Fase a describir
 * @returns Descripción en español
 */
export function getPhaseDescription(phase: PhaseType): string {
  const descriptions: Record<PhaseType, string> = {
    untap: 'Automático: Desbloquear todas tus criaturas',
    upkeep: 'Regenerar maná y procesar efectos de mantenimiento',
    draw: 'Automático: Robar 1 carta del mazo',
    pre_combat_main: 'Puedes jugar cartas y usar habilidades',
    begin_combat: 'Inicio del combate. Puedes saltar al combate o pasar',
    declare_attackers: 'Declara qué criaturas atacarán',
    declare_blockers: 'El defensor declara bloqueadores',
    combat_damage: 'Resuelve los problemas para calcular daño',
    end_combat: 'Automático: Fin del combate',
    post_combat_main: 'Segunda oportunidad para jugar cartas',
    end_step: 'Efectos de "al final del turno"',
    cleanup: 'Automático: Descartar exceso de cartas, pasar turno',
  };

  return descriptions[phase] || 'Fase desconocida';
}

/**
 * Obtiene la etiqueta en español de una fase.
 *
 * @param phase - Fase a consultar
 * @returns Etiqueta en español
 */
export function getPhaseLabel(phase: PhaseType): string {
  return PHASE_LABELS[phase] || phase;
}

/**
 * Obtiene el grupo al que pertenece una fase.
 *
 * @param phase - Fase a consultar
 * @returns Grupo de la fase
 */
export function getPhaseGroup(phase: PhaseType): PhaseGroup {
  return PHASE_TO_GROUP[phase];
}

// ============================================================================
// FUNCIONES DE SALTO DE FASES
// ============================================================================

/**
 * Verifica si el jugador puede saltar directamente al combate.
 * Solo posible desde pre_combat_main.
 *
 * @param currentPhase - Fase actual
 * @returns true si puede saltar al combate
 */
export function canSkipToCombat(currentPhase: PhaseType): boolean {
  return currentPhase === 'pre_combat_main';
}

/**
 * Verifica si el jugador puede terminar su turno inmediatamente.
 * Posible desde post_combat_main o end_step.
 *
 * @param currentPhase - Fase actual
 * @returns true si puede terminar el turno
 */
export function canSkipToEndTurn(currentPhase: PhaseType): boolean {
  return currentPhase === 'post_combat_main' || currentPhase === 'end_step';
}

/**
 * Verifica si el jugador puede saltar el combate completamente.
 * Útil cuando no hay criaturas para atacar.
 *
 * @param currentPhase - Fase actual
 * @returns true si puede saltar el combate
 */
export function canSkipCombat(currentPhase: PhaseType): boolean {
  return currentPhase === 'begin_combat' || currentPhase === 'declare_attackers';
}

/**
 * Obtiene la fase destino si el jugador salta el combate.
 *
 * @returns Fase destino (post_combat_main)
 */
export function getSkipCombatDestination(): PhaseType {
  return 'post_combat_main';
}

// ============================================================================
// HOOKS DE FASE (Extensibilidad)
// ============================================================================

/**
 * Interface para hooks de fase.
 * Permite agregar lógica personalizada al entrar/salir de fases.
 */
export interface PhaseHooks {
  onEnterPhase?: (phase: PhaseType) => void | Promise<void>;
  onExitPhase?: (phase: PhaseType) => void | Promise<void>;
}

/**
 * Obtiene hooks para una fase específica.
 * Placeholder para extensibilidad futura.
 *
 * @param phase - Fase para la que obtener hooks
 * @returns Objeto con funciones de hook
 */
export function getPhaseHooks(_phase: PhaseType): PhaseHooks {
  // TODO: Implementar hooks específicos por fase
  // Ejemplo: onEnterCombat podría activar efectos de "al entrar en combate"
  return {};
}

// ============================================================================
// VALIDACIÓN DE SECUENCIA
// ============================================================================

/**
 * Valida que una secuencia de fases siga el orden correcto.
 * Útil para testing y verificación de integridad.
 *
 * @param phases - Array de fases a validar
 * @returns true si la secuencia es válida
 */
export function validatePhaseSequence(phases: PhaseType[]): boolean {
  if (phases.length === 0) return true;

  for (let i = 0; i < phases.length - 1; i++) {
    const current = phases[i];
    const next = phases[i + 1];
    const expectedNext = getNextPhase(current);

    if (next !== expectedNext) {
      return false;
    }
  }

  return true;
}

/**
 * Obtiene cuántas fases faltan hasta el final del turno.
 *
 * @param currentPhase - Fase actual
 * @returns Número de fases restantes (incluyendo la actual)
 */
export function getPhasesRemainingInTurn(currentPhase: PhaseType): number {
  const currentIndex = getPhaseIndex(currentPhase);
  if (currentIndex === -1) return 0;
  return PHASE_SEQUENCE.length - currentIndex;
}

// ============================================================================
// COMPATIBILIDAD CON SISTEMA LEGACY
// ============================================================================

/**
 * Mapeo de fases legacy (4 fases) a nuevas fases (12 fases).
 * Usado para migración gradual del código existente.
 */
export const LEGACY_PHASE_MAP: Record<string, PhaseType> = {
  start: 'upkeep',
  main: 'pre_combat_main',
  combat: 'declare_attackers',
  end: 'end_step',
};

/**
 * Convierte una fase legacy al nuevo sistema.
 *
 * @param legacyPhase - Fase del sistema antiguo
 * @returns Fase equivalente en el nuevo sistema
 */
export function convertLegacyPhase(legacyPhase: string): PhaseType {
  return LEGACY_PHASE_MAP[legacyPhase] || 'pre_combat_main';
}
