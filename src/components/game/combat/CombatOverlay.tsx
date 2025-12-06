'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Zap, Check, SkipForward, AlertCircle } from 'lucide-react';
import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { slideDownFade, slideUpFade } from './CombatAnimations';
import type { PhaseType } from '@/types/game';

interface CombatOverlayProps {
  /** Current combat phase */
  phase: PhaseType;
  /** Whether it's the player's turn */
  isPlayerTurn: boolean;
  /** Number of attackers selected */
  attackerCount?: number;
  /** Number of blockers assigned */
  blockerCount?: number;
  /** Callback to confirm attackers */
  onConfirmAttackers?: () => void;
  /** Callback to skip attacking */
  onSkipAttack?: () => void;
  /** Whether confirm button is disabled */
  confirmDisabled?: boolean;
  /** Whether this is the AI's turn (show "thinking" state) */
  isAIThinking?: boolean;
}

type CombatPhaseInfo = {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
};

const phaseInfo: Record<string, CombatPhaseInfo> = {
  begin_combat: {
    title: 'Inicio de Combate',
    description: 'Preparándose para la batalla...',
    icon: Swords,
    color: 'text-orange-400',
    bgGradient: 'from-orange-900/50 to-red-900/50',
  },
  declare_attackers: {
    title: 'Declarar Atacantes',
    description: 'Selecciona las criaturas que atacarán',
    icon: Swords,
    color: 'text-red-400',
    bgGradient: 'from-red-900/50 to-orange-900/50',
  },
  declare_blockers: {
    title: 'Declarar Bloqueadores',
    description: 'Asigna defensores a los atacantes',
    icon: Shield,
    color: 'text-blue-400',
    bgGradient: 'from-blue-900/50 to-purple-900/50',
  },
  combat_damage: {
    title: 'Daño de Combate',
    description: 'Resuelve los problemas para determinar el daño',
    icon: Zap,
    color: 'text-yellow-400',
    bgGradient: 'from-yellow-900/50 to-orange-900/50',
  },
  end_combat: {
    title: 'Fin de Combate',
    description: 'El combate ha terminado',
    icon: Check,
    color: 'text-green-400',
    bgGradient: 'from-green-900/50 to-blue-900/50',
  },
};

/**
 * CombatOverlay - Phase banner and floating controls for combat
 *
 * Shows:
 * - Current combat phase with icon and description
 * - Attacker/blocker count
 * - Action buttons (confirm, skip)
 * - AI thinking indicator
 */
export const CombatOverlay = memo(function CombatOverlay({
  phase,
  isPlayerTurn,
  attackerCount = 0,
  blockerCount = 0,
  onConfirmAttackers,
  onSkipAttack,
  confirmDisabled = false,
  isAIThinking = false,
}: CombatOverlayProps) {
  const info = phaseInfo[phase] || phaseInfo.begin_combat;
  const Icon = info.icon;

  // Don't show for non-combat phases
  const combatPhases = ['begin_combat', 'declare_attackers', 'declare_blockers', 'combat_damage', 'end_combat'];
  if (!combatPhases.includes(phase)) {
    return null;
  }

  return (
    <>
      {/* Top Banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          variants={slideDownFade}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed top-24 left-1/2 -translate-x-1/2 z-40"
        >
          <div
            className={`
              bg-gradient-to-r ${info.bgGradient}
              backdrop-blur-md rounded-xl px-6 py-3
              border border-white/10 shadow-xl
              flex items-center gap-4
            `}
          >
            {/* Phase icon */}
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`p-2 rounded-lg bg-black/30 ${info.color}`}
            >
              <Icon size={24} />
            </motion.div>

            {/* Phase info */}
            <div>
              <h3 className="text-white font-bold text-lg">{info.title}</h3>
              <p className="text-zinc-300 text-sm">
                {isAIThinking ? 'La IA está pensando...' : info.description}
              </p>
            </div>

            {/* Counter badges */}
            {phase === 'declare_attackers' && attackerCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold"
              >
                {attackerCount} atacante{attackerCount !== 1 ? 's' : ''}
              </motion.div>
            )}

            {phase === 'declare_blockers' && blockerCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold"
              >
                {blockerCount} bloqueador{blockerCount !== 1 ? 'es' : ''}
              </motion.div>
            )}

            {/* AI thinking indicator */}
            {isAIThinking && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-2 text-purple-300"
              >
                <AlertCircle size={16} />
                <span className="text-sm">Pensando...</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Action Buttons - Only for declare_attackers when it's player's turn */}
      {phase === 'declare_attackers' && isPlayerTurn && (
        <motion.div
          variants={slideUpFade}
          initial="initial"
          animate="animate"
          className="fixed bottom-32 right-6 z-40 flex flex-col gap-2"
        >
          {/* Skip attack button */}
          <Button
            variant="outline"
            onClick={onSkipAttack}
            className="bg-zinc-800/90 border-zinc-600 hover:bg-zinc-700"
          >
            <SkipForward size={16} className="mr-2" />
            No Atacar
          </Button>

          {/* Confirm attackers button */}
          <Button
            onClick={onConfirmAttackers}
            disabled={confirmDisabled || attackerCount === 0}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50"
          >
            <Check size={16} className="mr-2" />
            Confirmar Ataque ({attackerCount})
          </Button>
        </motion.div>
      )}

      {/* No attackers available message */}
      {phase === 'declare_attackers' && isPlayerTurn && attackerCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-48 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="bg-zinc-900/90 backdrop-blur-md rounded-lg px-4 py-2 border border-zinc-700">
            <p className="text-zinc-400 text-sm">
              Haz clic en una criatura para declararla como atacante
            </p>
          </div>
        </motion.div>
      )}
    </>
  );
});

export default CombatOverlay;
