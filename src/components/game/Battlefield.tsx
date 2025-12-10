'use client';

import { useGameLoop } from '@/hooks/useGameLoop';
import { useGamePhaseController } from '@/hooks/useGamePhaseController';
import { Card } from './Card';
import { Hand } from './Hand';
import { EnemyArea } from './EnemyArea';
import { ProblemModal } from './ProblemModal';
import { PhaseIndicator } from './PhaseIndicator';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Hourglass, Shield, Target } from 'lucide-react';
import type { Card as CardType, Phase, PhaseType, BattleProblem } from '@/types/game';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  CombatOverlay,
  CombatArrow,
  AttackerIndicator,
  BlockerAssignmentUI,
  BlockerCardOverlay,
  AttackerTargetOverlay,
  CombatProblemModal,
  attackerGlow,
} from './combat';

interface BattlefieldProps {
  userDeck: CardType[];
  /** Use the new MTG 12-phase system (experimental) */
  useNewPhaseSystem?: boolean;
  /** Game ID for the new system */
  gameId?: string;
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * MAPEO DE FASES LEGACY → NUEVO SISTEMA MTG DE 12 FASES
 * ─────────────────────────────────────────────────────────────────────────
 *
 * El hook useGameLoop aún usa el sistema legacy de 4 fases.
 * Esta función mapea esas fases al nuevo sistema para mostrar
 * el PhaseIndicator correctamente.
 *
 * MAPEO:
 * - 'start' → 'upkeep' (grupo Beginning)
 * - 'draw'  → 'draw' (grupo Beginning)
 * - 'main'  → 'pre_combat_main' (grupo Main 1)
 * - 'combat'→ 'declare_attackers' (grupo Combat)
 * - 'end'   → 'end_step' (grupo End)
 *
 * TODO: Eventualmente migrar useGameLoop al nuevo sistema completo
 * ─────────────────────────────────────────────────────────────────────────
 */
function mapLegacyPhaseToMTG(legacyPhase: Phase): PhaseType {
  const phaseMap: Record<Phase, PhaseType> = {
    start: 'upkeep',
    draw: 'draw',
    main: 'pre_combat_main',
    combat: 'declare_attackers',
    end: 'end_step',
  };
  return phaseMap[legacyPhase] || 'pre_combat_main';
}

export function Battlefield({ userDeck, useNewPhaseSystem = false, gameId }: BattlefieldProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // DUAL HOOK SYSTEM: Legacy vs New 12-Phase System
  // ─────────────────────────────────────────────────────────────────────────

  // Legacy hook (4-phase system)
  const legacyHook = useGameLoop(userDeck);

  // New hook (12-phase MTG system)
  const [phaseState, phaseActions] = useGamePhaseController();

  // State for combat UI (new system)
  const [selectedAttackers, setSelectedAttackers] = useState<string[]>([]);
  const [isDeclaringAttackers, setIsDeclaringAttackers] = useState(false);
  const [abilityMessage, setAbilityMessage] = useState<string | null>(null);

  // Blocker assignment state
  const [blockerAssignments, setBlockerAssignments] = useState<Array<{ blockerId: string; attackerId: string }>>([]);
  const [pendingBlocker, setPendingBlocker] = useState<string | null>(null);

  // Combat problem state
  const [activeCombatProblem, setActiveCombatProblem] = useState<{
    problem: BattleProblem;
    card: CardType;
    isAttacker: boolean;
  } | null>(null);
  const [problemStartTime, setProblemStartTime] = useState<number>(0);

  // Card position refs for arrow rendering
  const cardPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Initialize new system if enabled
  useEffect(() => {
    if (useNewPhaseSystem && gameId && userDeck.length > 0 && !phaseState.gameState) {
      // Create opponent deck (mirror of player deck for now)
      const opponentDeck = [...userDeck].sort(() => Math.random() - 0.5);
      phaseActions.initializeGame(gameId, userDeck, opponentDeck);
    }
  }, [useNewPhaseSystem, gameId, userDeck, phaseState.gameState, phaseActions]);

  // ─────────────────────────────────────────────────────────────────────────
  // UNIFIED STATE ADAPTER
  // ─────────────────────────────────────────────────────────────────────────

  // Create unified game state from either hook
  const gameState = useNewPhaseSystem && phaseState.gameState
    ? {
        turn: phaseState.turnNumber,
        player: {
          id: 'player',
          name: 'Student Wizard',
          health: phaseState.gameState.playerHealth,
          maxHealth: 100,
          mana: phaseState.gameState.playerMana,
          maxMana: phaseState.gameState.playerMaxMana,
          hand: phaseState.gameState.playerHand,
          board: phaseState.gameState.playerBoard,
          deck: phaseState.gameState.playerDeckState.cards.length,
        },
        enemy: {
          id: 'opponent',
          name: 'Dark Quizmaster',
          health: phaseState.gameState.opponentHealth,
          maxHealth: 100,
          mana: phaseState.gameState.opponentMana,
          maxMana: phaseState.gameState.opponentMaxMana,
          hand: phaseState.gameState.opponentHand,
          board: phaseState.gameState.opponentBoard,
          deck: phaseState.gameState.opponentDeckState.cards.length,
        },
        currentPhase: phaseState.currentPhase as Phase,
        activeProblem: null as any, // TODO: Handle problems in new system
        pendingCard: null,
        winner: phaseState.gameState.playerHealth <= 0
          ? 'enemy' as const
          : phaseState.gameState.opponentHealth <= 0
            ? 'player' as const
            : null,
      }
    : legacyHook.gameState;

  // Mapear fase legacy al nuevo sistema MTG para el indicador visual
  const currentPhaseForIndicator = useNewPhaseSystem
    ? phaseState.currentPhase
    : mapLegacyPhaseToMTG(legacyHook.gameState.currentPhase);

  const isMyTurn = useNewPhaseSystem
    ? phaseState.isPlayerTurn
    : legacyHook.gameState.currentPhase === 'main' || legacyHook.gameState.currentPhase === 'draw';

  // Check if we're in combat phase (new system)
  const inCombatPhase = useNewPhaseSystem && phaseState.inCombat;
  const inDeclareAttackersPhase = useNewPhaseSystem && phaseState.currentPhase === 'declare_attackers';
  const inDeclareBlockersPhase = useNewPhaseSystem && phaseState.currentPhase === 'declare_blockers';
  const inCombatDamagePhase = useNewPhaseSystem && phaseState.currentPhase === 'combat_damage';

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handlePlayCard = useCallback(async (card: CardType) => {
    if (useNewPhaseSystem) {
      await phaseActions.playCard(card.id);
    } else {
      await legacyHook.playCard(card);
    }
  }, [useNewPhaseSystem, phaseActions, legacyHook]);

  const handleUseAbility = useCallback((card: CardType) => {
    if (useNewPhaseSystem) {
      phaseActions.useAbility(card.id);
      setAbilityMessage(`${card.name} activated ability!`);
      setTimeout(() => setAbilityMessage(null), 2000);
    } else {
      legacyHook.useAbility(card.id);
    }
  }, [useNewPhaseSystem, phaseActions, legacyHook]);

  const handleAttack = useCallback(async (attackerId: string) => {
    if (useNewPhaseSystem) {
      // In new system, we declare attackers first
      if (inDeclareAttackersPhase) {
        const success = await phaseActions.declareAttacker(attackerId);
        if (success) {
          setSelectedAttackers((prev) => [...prev, attackerId]);
        }
      }
    } else {
      legacyHook.attack(attackerId, 'enemy_hero');
    }
  }, [useNewPhaseSystem, inDeclareAttackersPhase, phaseActions, legacyHook]);

  const handleConfirmAttackers = useCallback(async () => {
    if (useNewPhaseSystem) {
      await phaseActions.confirmAttackers();
      setSelectedAttackers([]);
      setIsDeclaringAttackers(false);
    }
  }, [useNewPhaseSystem, phaseActions]);

  const handleEndTurn = useCallback(async () => {
    if (useNewPhaseSystem) {
      await phaseActions.endTurn();
    } else {
      await legacyHook.endTurn();
    }
  }, [useNewPhaseSystem, phaseActions, legacyHook]);

  const handleResolveProblem = useCallback(async (answer: string, timeTakenMs: number) => {
    if (useNewPhaseSystem) {
      // In new system, problem resolution goes through phaseActions
      // For now, delegate to legacy as problems aren't fully integrated yet
      await legacyHook.resolveProblem(answer, timeTakenMs);
    } else {
      await legacyHook.resolveProblem(answer, timeTakenMs);
    }
  }, [useNewPhaseSystem, legacyHook]);

  // ─────────────────────────────────────────────────────────────────────────
  // BLOCKER ASSIGNMENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleAssignBlocker = useCallback(async (blockerId: string, attackerId: string) => {
    if (!useNewPhaseSystem) return;

    const success = await phaseActions.declareBlocker(attackerId, blockerId);
    if (success) {
      setBlockerAssignments(prev => [...prev, { blockerId, attackerId }]);
      setPendingBlocker(null);
    }
  }, [useNewPhaseSystem, phaseActions]);

  const handleRemoveBlocker = useCallback((blockerId: string) => {
    setBlockerAssignments(prev => prev.filter(a => a.blockerId !== blockerId));
  }, []);

  const handleConfirmBlockers = useCallback(async () => {
    if (!useNewPhaseSystem) return;
    // Note: In the current implementation, blockers are already declared via declareBlocker
    // Just advance the phase
    await phaseActions.advancePhase();
    setBlockerAssignments([]);
    setPendingBlocker(null);
  }, [useNewPhaseSystem, phaseActions]);

  const handleSkipBlockers = useCallback(async () => {
    if (!useNewPhaseSystem) return;
    await phaseActions.skipBlockers();
    setBlockerAssignments([]);
    setPendingBlocker(null);
  }, [useNewPhaseSystem, phaseActions]);

  // ─────────────────────────────────────────────────────────────────────────
  // COMBAT PROBLEM HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleCombatProblemSubmit = useCallback(async (
    answer: string,
    timeMs: number,
    isCorrect: boolean
  ) => {
    if (!activeCombatProblem || !useNewPhaseSystem) return;

    await phaseActions.submitCombatAnswer({
      problemId: activeCombatProblem.problem.id,
      answer,
      isCorrect,
      isAttacker: activeCombatProblem.isAttacker,
      cardId: activeCombatProblem.card.id,
    });

    setActiveCombatProblem(null);
  }, [activeCombatProblem, useNewPhaseSystem, phaseActions]);

  // Track card positions for arrow rendering
  const updateCardPosition = useCallback((cardId: string, element: HTMLElement | null) => {
    if (element) {
      const rect = element.getBoundingClientRect();
      cardPositions.current.set(cardId, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  }, []);

  // Get the ability message from either system
  const currentAbilityMessage = useNewPhaseSystem ? abilityMessage : legacyHook.abilityMessage;

  return (
    <div className="h-screen w-full bg-zinc-950 text-white overflow-hidden flex flex-col relative selection:bg-blue-500/30">
      {/* Background Ambient Effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-zinc-950/80 to-blue-900/10 pointer-events-none" />
      
      {/* ═══════════════════════════════════════════════════════════════════════
          COMBAT UI OVERLAY - Phase banner and controls
          Rendered during combat phases when using new 12-phase system
         ═══════════════════════════════════════════════════════════════════════ */}
      {useNewPhaseSystem && inCombatPhase && (
        <CombatOverlay
          phase={phaseState.currentPhase}
          isPlayerTurn={phaseState.isPlayerTurn}
          attackerCount={selectedAttackers.length}
          blockerCount={blockerAssignments.length}
          onConfirmAttackers={handleConfirmAttackers}
          onSkipAttack={() => phaseActions.advancePhase()}
          confirmDisabled={selectedAttackers.length === 0}
        />
      )}

      {/* --- TOP BAR: Enemy Info --- */}
      <div className="h-20 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between px-8 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer transition-transform hover:scale-110">
             <div className="w-14 h-14 rounded-full bg-red-900 flex items-center justify-center text-xl font-bold border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all group-hover:shadow-[0_0_25px_rgba(239,68,68,0.7)]">
                E
             </div>
             <div className="absolute -bottom-2 -right-2 bg-zinc-900 rounded-full p-1 border border-zinc-700 transition-transform group-hover:scale-110">
                <Shield size={16} className="text-zinc-400" />
             </div>
          </div>
          <div>
            <h2 className="font-bold text-red-200 text-lg tracking-tight">{gameState.enemy.name}</h2>
            <div className="flex items-center gap-3 text-sm">
                <span className="text-red-400 font-mono font-bold">HP: {gameState.enemy.health}/{gameState.enemy.maxHealth}</span>
                <span className="text-blue-400 font-mono">MP: {gameState.enemy.mana}/{gameState.enemy.maxMana}</span>
            </div>
          </div>
        </div>
        
        {/* ─────────────────────────────────────────────────────────────────────────
            PHASE INDICATOR - Sistema MTG de 12 fases
            Muestra las 5 grupos de fases y resalta la fase actual
           ───────────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-end gap-2">
            <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
              Turn {gameState.turn}
            </div>
            <PhaseIndicator
              currentPhase={currentPhaseForIndicator}
              isPlayerTurn={isMyTurn}
              compact={false}
            />
        </div>
      </div>

      {/* --- MIDDLE: Battlefield --- */}
      <div className="flex-1 relative flex flex-col items-center justify-center perspective-1000 py-8">
        
        {/* Enemy Area */}
        <div className="w-full mb-8">
            <EnemyArea enemy={gameState.enemy} />
        </div>

        {/* Divider / Combat Zone */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-4 opacity-50" />

        {/* Player Board - adjusted for larger MTG-style cards */}
        <div
          className="flex justify-center gap-1 md:gap-2 lg:gap-4 min-h-[180px] md:min-h-[240px] lg:min-h-[300px] w-full px-2 md:px-4 lg:px-8 items-center overflow-x-auto md:overflow-visible"
          role="region"
          aria-label="Tu campo de batalla"
        >
          <AnimatePresence>
            {gameState.player.board.map((card, index) => {
              const isSelectedAttacker = selectedAttackers.includes(card.id);
              const isAssignedBlocker = blockerAssignments.some(a => a.blockerId === card.id);
              const isPendingBlocker = pendingBlocker === card.id;

              return (
                <motion.div
                  key={card.id}
                  ref={(el) => updateCardPosition(card.id, el)}
                  initial={{ scale: 0.5, opacity: 0, y: 50 }}
                  animate={{
                    scale: 0.65,
                    opacity: 1,
                    y: 0,
                    // Attacker glow animation
                    ...(isSelectedAttacker && inDeclareAttackersPhase ? attackerGlow.animate : {}),
                  }}
                  whileHover={{ scale: 0.75 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className={`relative ${isSelectedAttacker ? 'ring-4 ring-red-500 shadow-lg shadow-red-500/50 rounded-xl' : ''}`}
                >
                  <Card
                    card={card}
                    disabled={!isMyTurn}
                    isOnBoard={true}
                    currentMana={gameState.player.mana}
                    onUseAbility={handleUseAbility}
                  />

                  {/* Attack Button - for declare_attackers phase */}
                  {card.canAttack && isMyTurn && inDeclareAttackersPhase && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`absolute -top-4 -right-4 text-white p-2 rounded-full shadow-lg cursor-pointer z-20 transition-all ${
                        isSelectedAttacker
                          ? 'bg-yellow-500 hover:bg-yellow-600 ring-2 ring-yellow-300'
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                      title="Declarar como atacante"
                      onClick={() => handleAttack(card.id)}
                    >
                      {isSelectedAttacker ? <Target size={20} /> : <Swords size={20} />}
                    </motion.div>
                  )}

                  {/* Attacker Indicator Badge */}
                  {isSelectedAttacker && (
                    <AttackerIndicator
                      isSelected={true}
                      attackerNumber={selectedAttackers.indexOf(card.id) + 1}
                      onDeselect={() => {
                        setSelectedAttackers(prev => prev.filter(id => id !== card.id));
                      }}
                      position="top-left"
                      size="md"
                    />
                  )}

                  {/* Blocker overlay during declare_blockers phase */}
                  {inDeclareBlockersPhase && !phaseState.isPlayerTurn && (
                    <BlockerCardOverlay
                      cardId={card.id}
                      isPending={isPendingBlocker}
                      isAssigned={isAssignedBlocker}
                      isAvailable={!card.isTapped && !isAssignedBlocker}
                      onClick={() => {
                        if (isAssignedBlocker) {
                          handleRemoveBlocker(card.id);
                        } else {
                          setPendingBlocker(card.id);
                        }
                      }}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {gameState.player.board.length === 0 && (
            <div className="text-zinc-600 font-mono text-sm border-2 border-dashed border-zinc-800 rounded-xl px-8 py-12 opacity-50">
                Summon creatures to defend yourself
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            COMBAT ARROWS - SVG lines connecting blockers to attackers
           ═══════════════════════════════════════════════════════════════════════ */}
        {blockerAssignments.length > 0 && (
          <>
            {blockerAssignments.map((assignment, index) => {
              const blockerPos = cardPositions.current.get(assignment.blockerId);
              const attackerPos = cardPositions.current.get(assignment.attackerId);

              if (!blockerPos || !attackerPos) return null;

              return (
                <CombatArrow
                  key={`${assignment.blockerId}-${assignment.attackerId}`}
                  id={`arrow-${index}`}
                  from={blockerPos}
                  to={attackerPos}
                  variant="block"
                  delay={index * 0.1}
                  showPulse={true}
                  onClick={() => handleRemoveBlocker(assignment.blockerId)}
                />
              );
            })}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            BLOCKER ASSIGNMENT UI - During declare_blockers phase
           ═══════════════════════════════════════════════════════════════════════ */}
        {inDeclareBlockersPhase && !phaseState.isPlayerTurn && (
          <BlockerAssignmentUI
            attackers={phaseState.combatState?.attackers || []}
            playerBoard={gameState.player.board}
            assignments={blockerAssignments}
            onAssign={handleAssignBlocker}
            onRemove={handleRemoveBlocker}
            onConfirm={handleConfirmBlockers}
            onSkip={handleSkipBlockers}
          />
        )}

      </div>

      {/* --- BOTTOM BAR: Player Hand & Controls --- */}
      <div className="h-[220px] md:h-[270px] lg:h-[320px] bg-gradient-to-t from-zinc-950 via-zinc-900/95 to-transparent relative z-30 flex flex-col justify-end pb-1 md:pb-2">

        {/* ─────────────────────────────────────────────────────────────────────────
            CONTROLES DE FASE Y FIN DE TURNO
            El indicador de fase detallado se muestra en el top bar
           ───────────────────────────────────────────────────────────────────────── */}
        <div className="absolute top-4 right-6 flex flex-col gap-3 items-end z-40">
            {/* Confirm Attackers Button (new system only) */}
            {inDeclareAttackersPhase && selectedAttackers.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleConfirmAttackers}
                className="group relative px-6 py-2 rounded-lg font-bold text-sm shadow-xl transition-all bg-red-600 hover:bg-red-500 text-white hover:scale-105"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Confirm Attack ({selectedAttackers.length})
                  <Swords size={14} />
                </span>
                <div className="absolute inset-0 rounded-lg bg-red-400/20 blur-md group-hover:blur-lg transition-all" />
              </motion.button>
            )}

            {/* End Turn Button */}
            <button
                onClick={handleEndTurn}
                disabled={!isMyTurn}
                className={`
                    group relative px-6 py-2 rounded-lg font-bold text-sm shadow-xl transition-all
                    ${isMyTurn
                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white hover:scale-105 hover:shadow-yellow-500/20'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'}
                `}
            >
                <span className="relative z-10 flex items-center gap-2">
                    End Turn
                    <Hourglass size={14} />
                </span>
                {isMyTurn && <div className="absolute inset-0 rounded-lg bg-yellow-400/20 blur-md group-hover:blur-lg transition-all" />}
            </button>
        </div>

        {/* Player Stats (Left) */}
        <div className="absolute bottom-4 left-6 z-40">
            <div className="flex items-end gap-3">
                <div className="relative group cursor-pointer">
                    <div className="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center text-2xl font-bold border-4 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all group-hover:scale-110">
                        {gameState.player.health}
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-zinc-900 text-blue-200 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-900">
                        HP
                    </div>
                </div>

                <div className="flex flex-col gap-1 mb-1">
                    <h2 className="font-bold text-blue-100 text-base">{gameState.player.name}</h2>
                    <div className="flex items-center gap-2 bg-zinc-900/80 px-2 py-1 rounded-full border border-blue-900/50">
                        <div className="flex gap-0.5">
                            {Array.from({ length: gameState.player.maxMana }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2.5 h-3 rounded-sm transition-all ${i < gameState.player.mana ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]' : 'bg-zinc-700'}`}
                                />
                            ))}
                        </div>
                        <span className="text-blue-300 font-mono font-bold text-xs ml-1">
                            {gameState.player.mana}/{gameState.player.maxMana}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Hand Component */}
        <div className="w-full flex justify-center items-end z-30 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-5xl">
                <Hand
                    cards={gameState.player.hand}
                    onPlayCard={handlePlayCard}
                    currentMana={gameState.player.mana}
                    isMyTurn={isMyTurn}
                />
            </div>
        </div>
      </div>

      {/* Ability Message Toast */}
      <AnimatePresence>
        {currentAbilityMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-purple-900/90 backdrop-blur-md text-white px-8 py-4 rounded-xl border border-purple-500/50 shadow-2xl shadow-purple-500/30"
          >
            <p className="text-lg font-bold text-center">{currentAbilityMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Problem Modal (Legacy) */}
      <AnimatePresence>
        {gameState.activeProblem && (
            <ProblemModal
                problem={gameState.activeProblem}
                onSolve={handleResolveProblem}
            />
        )}
      </AnimatePresence>

      {/* Combat Problem Modal (New System) */}
      <AnimatePresence>
        {activeCombatProblem && (
          <CombatProblemModal
            problem={activeCombatProblem.problem}
            card={activeCombatProblem.card}
            isAttacker={activeCombatProblem.isAttacker}
            timeLimit={30}
            onSubmit={handleCombatProblemSubmit}
          />
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameState.winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className={`
                p-12 rounded-2xl border-4 text-center
                ${gameState.winner === 'player'
                  ? 'bg-gradient-to-br from-blue-900 to-blue-950 border-blue-500 shadow-2xl shadow-blue-500/50'
                  : 'bg-gradient-to-br from-red-900 to-red-950 border-red-500 shadow-2xl shadow-red-500/50'
                }
              `}
            >
              <h1 className="text-5xl font-bold mb-4">
                {gameState.winner === 'player' ? '🎉 VICTORY!' : '💀 DEFEAT'}
              </h1>
              <p className="text-xl text-zinc-300 mb-6">
                {gameState.winner === 'player'
                  ? 'You defeated the Dark Quizmaster!'
                  : 'The Dark Quizmaster has won...'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
              >
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
