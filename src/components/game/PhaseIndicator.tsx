/**
 * ============================================================================
 * PHASE INDICATOR - Componente visual del sistema de 12 fases MTG
 * ============================================================================
 *
 * PROPÓSITO:
 * Muestra visualmente las fases del turno al estilo Magic: The Gathering.
 * Agrupa las 12 fases en 5 grupos para una UI más limpia.
 *
 * ESTRUCTURA VISUAL:
 * ┌────────┬────────┬────────┬────────┬────────┐
 * │ START  │ MAIN 1 │ COMBAT │ MAIN 2 │  END   │
 * └────────┴────────┴────────┴────────┴────────┘
 *
 * Cada grupo puede expandirse para mostrar las sub-fases.
 *
 * ============================================================================
 */

'use client';

import { motion } from 'framer-motion';
import {
  PhaseType,
  PhaseGroup,
  PHASE_TO_GROUP,
  PHASE_GROUP_INFO,
  PHASE_LABELS,
} from '@/types/game';
import {
  Sunrise,    // Beginning phase
  Sparkles,   // Main phase
  Swords,     // Combat phase
  Moon,       // End phase
} from 'lucide-react';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface PhaseIndicatorProps {
  /** Fase actual del turno */
  currentPhase: PhaseType;
  /** Si es turno del jugador (afecta estilos) */
  isPlayerTurn: boolean;
  /** Mostrar versión compacta (solo grupos) */
  compact?: boolean;
  /** Callback cuando se hace clic en un grupo de fase */
  onPhaseGroupClick?: (group: PhaseGroup) => void;
}

// ============================================================================
// MAPEO DE ICONOS POR GRUPO
// ============================================================================

const GROUP_ICONS: Record<PhaseGroup, React.ReactNode> = {
  beginning: <Sunrise size={14} />,
  main1: <Sparkles size={14} />,
  combat: <Swords size={14} />,
  main2: <Sparkles size={14} />,
  end: <Moon size={14} />,
};

// ============================================================================
// ORDEN DE GRUPOS PARA RENDERIZADO
// ============================================================================

const PHASE_GROUP_ORDER: PhaseGroup[] = [
  'beginning',
  'main1',
  'combat',
  'main2',
  'end',
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function PhaseIndicator({
  currentPhase,
  isPlayerTurn,
  compact = false,
  onPhaseGroupClick,
}: PhaseIndicatorProps) {
  // Determinar el grupo actual basado en la fase
  const currentGroup = PHASE_TO_GROUP[currentPhase];

  return (
    <div className="flex items-center gap-1">
      {PHASE_GROUP_ORDER.map((group, index) => {
        const isActive = group === currentGroup;
        const isPast = PHASE_GROUP_ORDER.indexOf(currentGroup) > index;
        const groupInfo = PHASE_GROUP_INFO[group];

        return (
          <motion.div
            key={group}
            initial={false}
            animate={{
              scale: isActive ? 1.05 : 1,
              opacity: isActive ? 1 : isPast ? 0.5 : 0.7,
            }}
            className="relative"
          >
            {/* ─────────────────────────────────────────────────────────────
                Botón del grupo de fase
                - Muestra icono + etiqueta
                - Resaltado si es la fase activa
               ───────────────────────────────────────────────────────────── */}
            <button
              onClick={() => onPhaseGroupClick?.(group)}
              disabled={!onPhaseGroupClick}
              className={`
                relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                transition-all duration-200 text-xs font-semibold
                ${isActive
                  ? `bg-gradient-to-r ${groupInfo.color} text-white shadow-lg`
                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60'
                }
                ${onPhaseGroupClick ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {/* Icono del grupo */}
              <span className={isActive ? 'animate-pulse' : ''}>
                {GROUP_ICONS[group]}
              </span>

              {/* Etiqueta del grupo (versión compacta solo muestra en activo) */}
              {(!compact || isActive) && (
                <span className="whitespace-nowrap">
                  {groupInfo.labelEs}
                </span>
              )}

              {/* Indicador de fase activa */}
              {isActive && (
                <motion.div
                  layoutId="phase-indicator"
                  className="absolute inset-0 rounded-lg border-2 border-white/30"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>

            {/* ─────────────────────────────────────────────────────────────
                Sub-fase actual (tooltip o expandido)
                Solo se muestra cuando el grupo está activo
               ───────────────────────────────────────────────────────────── */}
            {isActive && !compact && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50"
              >
                <div className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 whitespace-nowrap shadow-lg">
                  <span className="text-zinc-500">Fase: </span>
                  <span className="font-semibold text-white">
                    {PHASE_LABELS[currentPhase]}
                  </span>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                Conector visual entre grupos
               ───────────────────────────────────────────────────────────── */}
            {index < PHASE_GROUP_ORDER.length - 1 && (
              <div
                className={`
                  absolute top-1/2 -right-1 w-2 h-0.5 -translate-y-1/2
                  ${isPast ? 'bg-zinc-500' : 'bg-zinc-700'}
                `}
              />
            )}
          </motion.div>
        );
      })}

      {/* ─────────────────────────────────────────────────────────────
          Indicador de turno (jugador vs oponente)
         ───────────────────────────────────────────────────────────── */}
      <div
        className={`
          ml-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
          ${isPlayerTurn
            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
            : 'bg-red-500/20 text-red-300 border border-red-500/50'
          }
        `}
      >
        {isPlayerTurn ? 'Tu turno' : 'Enemigo'}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE DE DETALLE DE FASE (Versión expandida)
// ============================================================================

interface PhaseDetailProps {
  currentPhase: PhaseType;
}

/**
 * Muestra información detallada de la fase actual.
 * Incluye descripción y acciones permitidas.
 */
export function PhaseDetail({ currentPhase }: PhaseDetailProps) {
  // Descripciones de cada fase para guiar al jugador
  const phaseDescriptions: Record<PhaseType, string> = {
    untap: 'Tus criaturas se desbloquean automáticamente.',
    upkeep: 'Se regenera tu maná y se procesan efectos de mantenimiento.',
    draw: 'Robas una carta de tu mazo.',
    pre_combat_main: 'Puedes jugar cartas de tu mano y usar habilidades.',
    begin_combat: 'Inicio del combate. Puedes decidir atacar o pasar.',
    declare_attackers: 'Selecciona qué criaturas van a atacar.',
    declare_blockers: 'El defensor decide cómo bloquear.',
    combat_damage: 'Resuelve los problemas para calcular el daño.',
    end_combat: 'El combate termina, se limpian efectos temporales.',
    post_combat_main: 'Segunda oportunidad para jugar cartas.',
    end_step: 'Efectos de "al final del turno" se activan.',
    cleanup: 'Descarta exceso de cartas y pasa el turno.',
  };

  const currentGroup = PHASE_TO_GROUP[currentPhase];
  const groupInfo = PHASE_GROUP_INFO[currentGroup];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-lg p-3 shadow-xl"
    >
      {/* Header con grupo y fase */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded bg-gradient-to-r ${groupInfo.color}`}>
          {GROUP_ICONS[currentGroup]}
        </div>
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
            {groupInfo.labelEs}
          </div>
          <div className="text-sm font-bold text-white">
            {PHASE_LABELS[currentPhase]}
          </div>
        </div>
      </div>

      {/* Descripción de la fase */}
      <p className="text-xs text-zinc-400 leading-relaxed">
        {phaseDescriptions[currentPhase]}
      </p>
    </motion.div>
  );
}
