'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Check, SkipForward } from 'lucide-react';
import { useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { slideUpFade, blockerPulse, SPRING_BOUNCY } from './CombatAnimations';
import type { Card, AttackerDeclaration } from '@/types/game';

interface BlockerAssignment {
  blockerId: string;
  attackerId: string;
}

interface BlockerAssignmentUIProps {
  /** List of attackers that need to be blocked */
  attackers: AttackerDeclaration[];
  /** Player's board (potential blockers) */
  playerBoard: Card[];
  /** Current blocker assignments */
  assignments: BlockerAssignment[];
  /** Called when a blocker is assigned to an attacker */
  onAssign: (blockerId: string, attackerId: string) => void;
  /** Called when a blocker assignment is removed */
  onRemove: (blockerId: string) => void;
  /** Called when player confirms all blocker assignments */
  onConfirm: () => void;
  /** Called when player skips blocking */
  onSkip: () => void;
  /** Whether the UI is disabled (e.g., AI is blocking) */
  disabled?: boolean;
}

type BlockingStep = 'select_blocker' | 'select_attacker';

/**
 * BlockerAssignmentUI - Sequential click interface for assigning blockers
 *
 * Flow:
 * 1. Player clicks on their creature → marked as "pending blocker"
 * 2. Player clicks on enemy attacker → creates assignment + draws arrow
 * 3. Player can click on assignment to remove it
 * 4. Confirm or Skip buttons to proceed
 */
export const BlockerAssignmentUI = memo(function BlockerAssignmentUI({
  attackers,
  playerBoard,
  assignments,
  onAssign,
  onRemove,
  onConfirm,
  onSkip,
  disabled = false,
}: BlockerAssignmentUIProps) {
  // Track which blocker is pending assignment
  const [pendingBlocker, setPendingBlocker] = useState<string | null>(null);
  const [step, setStep] = useState<BlockingStep>('select_blocker');

  // Get available blockers (not tapped, not already assigned)
  const assignedBlockerIds = new Set(assignments.map((a) => a.blockerId));
  const availableBlockers = playerBoard.filter(
    (card) => !card.isTapped && !assignedBlockerIds.has(card.id)
  );

  // Handle clicking on a potential blocker
  const handleBlockerClick = useCallback(
    (blockerId: string) => {
      if (disabled) return;

      // If clicking on already pending blocker, deselect
      if (pendingBlocker === blockerId) {
        setPendingBlocker(null);
        setStep('select_blocker');
        return;
      }

      // If blocker is already assigned, remove assignment
      if (assignedBlockerIds.has(blockerId)) {
        onRemove(blockerId);
        return;
      }

      // Select this blocker
      setPendingBlocker(blockerId);
      setStep('select_attacker');
    },
    [disabled, pendingBlocker, assignedBlockerIds, onRemove]
  );

  // Handle clicking on an attacker to complete assignment
  const handleAttackerClick = useCallback(
    (attackerId: string) => {
      if (disabled || !pendingBlocker) return;

      // Create the assignment
      onAssign(pendingBlocker, attackerId);

      // Reset state
      setPendingBlocker(null);
      setStep('select_blocker');
    },
    [disabled, pendingBlocker, onAssign]
  );

  // Cancel pending selection
  const handleCancel = useCallback(() => {
    setPendingBlocker(null);
    setStep('select_blocker');
  }, []);

  // Get blocker card info
  const getBlockerCard = (blockerId: string) =>
    playerBoard.find((c) => c.id === blockerId);

  return (
    <>
      {/* Instruction Banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideUpFade}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="bg-blue-900/90 backdrop-blur-md rounded-xl px-6 py-3 border border-blue-500/50 shadow-xl">
            <div className="flex items-center gap-3">
              <Shield className="text-blue-400" size={24} />
              <div>
                <p className="text-white font-semibold">
                  {step === 'select_blocker'
                    ? 'Fase de Bloqueo'
                    : 'Selecciona al Atacante'}
                </p>
                <p className="text-blue-200 text-sm">
                  {step === 'select_blocker'
                    ? `Haz clic en una criatura para bloquear (${availableBlockers.length} disponibles)`
                    : 'Haz clic en el atacante que quieres bloquear'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Action Buttons */}
      <motion.div
        variants={slideUpFade}
        initial="initial"
        animate="animate"
        className="fixed bottom-20 right-6 z-40 flex flex-col gap-2"
      >
        {/* Cancel button (when selecting attacker) */}
        {step === 'select_attacker' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="bg-zinc-800/90 border-zinc-600 hover:bg-zinc-700"
            >
              <X size={16} className="mr-1" />
              Cancelar
            </Button>
          </motion.div>
        )}

        {/* Skip blocking */}
        <Button
          variant="outline"
          onClick={onSkip}
          disabled={disabled}
          className="bg-zinc-800/90 border-zinc-600 hover:bg-zinc-700"
        >
          <SkipForward size={16} className="mr-2" />
          Saltar Bloqueo
        </Button>

        {/* Confirm blockers */}
        <Button
          onClick={onConfirm}
          disabled={disabled || assignments.length === 0}
          className="bg-blue-600 hover:bg-blue-500"
        >
          <Check size={16} className="mr-2" />
          Confirmar ({assignments.length})
        </Button>
      </motion.div>

      {/* Blocker Selection Overlays on Cards */}
      {/* These are rendered as children of the cards in Battlefield */}
      {/* This component provides the state and handlers */}

      {/* Assignment Summary (floating cards) */}
      {assignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-6 bottom-20 z-40 space-y-2"
        >
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
            Bloqueadores Asignados
          </p>
          {assignments.map((assignment) => {
            const blocker = getBlockerCard(assignment.blockerId);
            return (
              <motion.div
                key={assignment.blockerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2 bg-zinc-900/90 rounded-lg px-3 py-2 border border-purple-500/50"
              >
                <Shield size={14} className="text-purple-400" />
                <span className="text-sm text-white">{blocker?.name || 'Bloqueador'}</span>
                <button
                  onClick={() => onRemove(assignment.blockerId)}
                  className="ml-2 p-1 hover:bg-zinc-700 rounded transition-colors"
                >
                  <X size={12} className="text-zinc-400 hover:text-white" />
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </>
  );
});

// ============================================================================
// HELPER COMPONENT: Blocker Card Overlay
// ============================================================================

interface BlockerCardOverlayProps {
  cardId: string;
  isPending: boolean;
  isAssigned: boolean;
  isAvailable: boolean;
  onClick: () => void;
}

/**
 * Overlay component to render on top of blocker cards
 * Use this in Battlefield.tsx when rendering player board during declare_blockers
 */
export const BlockerCardOverlay = memo(function BlockerCardOverlay({
  cardId,
  isPending,
  isAssigned,
  isAvailable,
  onClick,
}: BlockerCardOverlayProps) {
  if (!isAvailable && !isPending && !isAssigned) {
    // Card is tapped or ineligible
    return (
      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
        <span className="text-zinc-500 text-xs">No disponible</span>
      </div>
    );
  }

  return (
    <motion.div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        absolute inset-0 rounded-xl cursor-pointer transition-all
        ${isPending ? 'ring-4 ring-blue-500 shadow-lg shadow-blue-500/50' : ''}
        ${isAssigned ? 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/50' : ''}
        ${!isPending && !isAssigned && isAvailable ? 'hover:ring-2 hover:ring-blue-400/50' : ''}
      `}
      variants={isPending ? blockerPulse : undefined}
      initial={isPending ? 'initial' : undefined}
      animate={isPending ? 'animate' : undefined}
    >
      {/* Pending blocker badge */}
      {isPending && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={SPRING_BOUNCY}
          className="absolute -top-3 -right-3 bg-blue-500 rounded-full p-2 shadow-lg z-10"
        >
          <Shield size={16} className="text-white" />
        </motion.div>
      )}

      {/* Assigned blocker badge */}
      {isAssigned && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={SPRING_BOUNCY}
          className="absolute -top-3 -right-3 bg-purple-500 rounded-full p-2 shadow-lg z-10"
        >
          <Shield size={16} className="text-white" />
        </motion.div>
      )}
    </motion.div>
  );
});

// ============================================================================
// HELPER COMPONENT: Attacker Target Overlay
// ============================================================================

interface AttackerTargetOverlayProps {
  cardId: string;
  isTargetable: boolean;
  onClick: () => void;
}

/**
 * Overlay component to render on enemy attackers when selecting target
 * Shows that this attacker can be blocked
 */
export const AttackerTargetOverlay = memo(function AttackerTargetOverlay({
  cardId,
  isTargetable,
  onClick,
}: AttackerTargetOverlayProps) {
  if (!isTargetable) return null;

  return (
    <motion.div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 rounded-xl cursor-pointer"
    >
      {/* Targetable indicator */}
      <motion.div
        animate={{
          boxShadow: [
            'inset 0 0 0 2px rgba(234, 179, 8, 0.5)',
            'inset 0 0 0 4px rgba(234, 179, 8, 0.8)',
            'inset 0 0 0 2px rgba(234, 179, 8, 0.5)',
          ],
        }}
        transition={{ duration: 1, repeat: Infinity }}
        className="absolute inset-0 rounded-xl bg-yellow-500/10"
      />

      {/* Target badge */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 rounded-full p-3 shadow-lg"
      >
        <Shield size={20} className="text-black" />
      </motion.div>
    </motion.div>
  );
});

export default BlockerAssignmentUI;
