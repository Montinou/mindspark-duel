/**
 * ============================================================================
 * ADAPTIVE DIFFICULTY SERVICE
 * ============================================================================
 *
 * PROPÓSITO:
 * Este servicio implementa el sistema de dificultad adaptativa basado en la
 * teoría del "Flow" de Csikszentmihalyi. El objetivo es mantener al usuario
 * en una "zona de flujo" donde los problemas no son ni muy fáciles (aburridos)
 * ni muy difíciles (frustrantes).
 *
 * FUNCIONAMIENTO:
 * 1. Trackea el rendimiento del usuario por categoría (Math/Logic/Science)
 * 2. Calcula SkillScore usando fórmula Elo simplificada
 * 3. Ajusta dinámicamente la dificultad basándose en los últimos N problemas
 * 4. Mantiene estadísticas de tiempo de respuesta y rachas (streaks)
 *
 * ZONA DE FLUJO:
 * - Si el usuario acierta >80% de los últimos 20 problemas → subir dificultad
 * - Si el usuario acierta <50% de los últimos 20 problemas → bajar dificultad
 * - Entre 50%-80% → mantener dificultad actual (zona óptima)
 *
 * ============================================================================
 */

import { db } from '@/db';
import { userStats, problemHistory } from '@/db/schema';
import type { ProblemHintsDB, UserStats, NewUserStats, ProblemHistory, NewProblemHistory } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// ============================================================================
// TIPOS
// ============================================================================

/** Categorías de problemas educativos */
export type ProblemCategory = 'Math' | 'Logic' | 'Science';

/** Resultado de un problema resuelto por el usuario */
export interface ProblemResult {
  // Identificación
  userId: string;

  // Problema
  category: ProblemCategory;
  difficulty: number;
  question: string;
  options?: string[];
  correctAnswer: string;
  hints?: string[];

  // Respuesta del usuario
  userAnswer: string | null;
  isCorrect: boolean;
  responseTimeMs: number;
  timedOut: boolean;

  // Contexto de la carta (opcional)
  cardId?: string;
  cardName?: string;
  cardElement?: 'Fire' | 'Water' | 'Earth' | 'Air';
  cardCost?: number;
  cardPower?: number;

  // Contexto del juego (opcional)
  gameSessionId?: string;
  phase?: 'play_card' | 'attack' | 'defend' | 'ability';
  turnNumber?: number;
  opponentType?: 'ai' | 'human';

  // Metadata de generación (opcional)
  generatedBy?: 'ai_worker' | 'fallback_bank';
  aiModel?: string;
  problemHintsUsed?: ProblemHintsDB;
  generationTimeMs?: number;
}

/** Estadísticas del usuario para mostrar en UI */
export interface UserStatsResponse {
  skillScores: {
    Math: number;
    Logic: number;
    Science: number;
  };
  accuracy: {
    Math: number;
    Logic: number;
    Science: number;
    overall: number;
  };
  avgResponseTime: {
    Math: number;
    Logic: number;
    Science: number;
    overall: number;
  };
  streaks: {
    current: number;
    longest: number;
  };
  adaptiveDifficulty: {
    Math: number;
    Logic: number;
    Science: number;
  };
  totalProblems: number;
}

// ============================================================================
// CONSTANTES - Parámetros del algoritmo de dificultad adaptativa
// ============================================================================

/**
 * FLOW_ZONE_MIN: Porcentaje mínimo de aciertos para considerar que la
 * dificultad es apropiada. Por debajo de esto, bajamos la dificultad.
 */
const FLOW_ZONE_MIN = 0.5; // 50%

/**
 * FLOW_ZONE_MAX: Porcentaje máximo de aciertos antes de subir la dificultad.
 * Por encima de esto, el usuario domina el nivel actual.
 */
const FLOW_ZONE_MAX = 0.8; // 80%

/**
 * DIFFICULTY_CHANGE_RATE: Cuánto cambia la dificultad en cada ajuste.
 * Valores pequeños = cambios graduales, más suaves.
 */
const DIFFICULTY_CHANGE_RATE = 0.5;

/**
 * RECENT_PROBLEMS_WINDOW: Cuántos problemas recientes considerar para
 * calcular la tasa de aciertos. Más problemas = menos volátil.
 */
const RECENT_PROBLEMS_WINDOW = 20;

/**
 * ELO_K_FACTOR: Constante K del sistema Elo.
 * Determina qué tan rápido cambia el SkillScore.
 * K más alto = cambios más dramáticos.
 */
const ELO_K_FACTOR = 32;

/**
 * SPEED_BONUS_MAX: Puntos extra máximos por responder rápido.
 */
const SPEED_BONUS_MAX = 5;

/**
 * RESPONSE_TIME_THRESHOLD: Tiempo en ms para considerar respuesta "rápida".
 * Respuestas más rápidas que esto obtienen bonus proporcional.
 */
const RESPONSE_TIME_THRESHOLD = 30000; // 30 segundos

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Calcula la dificultad adaptativa para un usuario y categoría específica.
 *
 * ALGORITMO:
 * 1. Obtiene las stats actuales del usuario
 * 2. Busca los últimos N problemas de esa categoría
 * 3. Calcula la tasa de aciertos
 * 4. Ajusta la dificultad según la zona de flujo
 *
 * @param userId - ID del usuario
 * @param category - Categoría del problema (Math/Logic/Science)
 * @returns Dificultad recomendada (1-10)
 */
export async function calculateAdaptiveDifficulty(
  userId: string,
  category: ProblemCategory
): Promise<number> {
  // Paso 1: Obtener stats actuales del usuario
  const stats = await getOrCreateUserStats(userId);

  // Paso 2: Obtener últimos N problemas de esta categoría
  const recentProblems = await db
    .select()
    .from(problemHistory)
    .where(
      and(
        eq(problemHistory.userId, userId),
        eq(problemHistory.category, category)
      )
    )
    .orderBy(desc(problemHistory.createdAt))
    .limit(RECENT_PROBLEMS_WINDOW);

  // Si no hay suficientes datos, usar dificultad actual sin cambios
  if (recentProblems.length < 5) {
    return getCurrentDifficulty(stats, category);
  }

  // Paso 3: Calcular tasa de aciertos reciente
  const correctCount = recentProblems.filter((p) => p.isCorrect).length;
  const successRate = correctCount / recentProblems.length;

  // Paso 4: Obtener dificultad actual
  const currentDifficulty = getCurrentDifficulty(stats, category);

  // Paso 5: Ajustar dificultad basado en zona de flujo
  let newDifficulty = currentDifficulty;

  if (successRate > FLOW_ZONE_MAX) {
    // Usuario domina este nivel → subir dificultad
    // El usuario está acertando más del 80%, necesita más desafío
    newDifficulty = Math.min(10, currentDifficulty + DIFFICULTY_CHANGE_RATE);
  } else if (successRate < FLOW_ZONE_MIN) {
    // Usuario está frustrado → bajar dificultad
    // El usuario está acertando menos del 50%, necesita problemas más fáciles
    newDifficulty = Math.max(1, currentDifficulty - DIFFICULTY_CHANGE_RATE);
  }
  // Si está entre 50%-80%, mantenemos la dificultad actual (zona de flujo)

  // Paso 6: Guardar nueva dificultad si cambió
  if (newDifficulty !== currentDifficulty) {
    await updateAdaptiveDifficulty(userId, category, Math.round(newDifficulty));
  }

  return Math.round(newDifficulty);
}

/**
 * Registra el resultado de un problema y actualiza todas las estadísticas.
 *
 * Esta es la función principal que se llama después de cada problema resuelto.
 * Actualiza: historial, contadores, SkillScore, tiempos, streaks, y dificultad.
 *
 * @param result - Resultado completo del problema resuelto
 */
export async function recordProblemResult(result: ProblemResult): Promise<void> {
  const { userId, category, isCorrect, responseTimeMs } = result;

  // Paso 1: Insertar en historial de problemas
  // Esto nos da el registro completo para análisis futuro
  await db.insert(problemHistory).values({
    userId,
    category,
    difficulty: result.difficulty,
    question: result.question,
    options: result.options,
    correctAnswer: result.correctAnswer,
    hints: result.hints,
    userAnswer: result.userAnswer,
    isCorrect,
    responseTimeMs,
    timedOut: result.timedOut,
    cardId: result.cardId,
    cardName: result.cardName,
    cardElement: result.cardElement,
    cardCost: result.cardCost,
    cardPower: result.cardPower,
    gameSessionId: result.gameSessionId,
    phase: result.phase,
    turnNumber: result.turnNumber,
    opponentType: result.opponentType,
    generatedBy: result.generatedBy,
    aiModel: result.aiModel,
    problemHintsUsed: result.problemHintsUsed,
    generationTimeMs: result.generationTimeMs,
  });

  // Paso 2: Obtener o crear estadísticas del usuario
  const stats = await getOrCreateUserStats(userId);

  // Paso 3: Actualizar todas las estadísticas
  await updateStatsForProblem(userId, stats, result);
}

/**
 * Obtiene las estadísticas de un usuario para mostrar en UI.
 *
 * @param userId - ID del usuario
 * @returns Estadísticas formateadas para la interfaz
 */
export async function getUserStats(userId: string): Promise<UserStatsResponse> {
  const stats = await getOrCreateUserStats(userId);

  // Calcular porcentajes de precisión
  const mathAccuracy =
    stats.mathProblemsAttempted > 0
      ? (stats.mathProblemsCorrect / stats.mathProblemsAttempted) * 100
      : 0;
  const logicAccuracy =
    stats.logicProblemsAttempted > 0
      ? (stats.logicProblemsCorrect / stats.logicProblemsAttempted) * 100
      : 0;
  const scienceAccuracy =
    stats.scienceProblemsAttempted > 0
      ? (stats.scienceProblemsCorrect / stats.scienceProblemsAttempted) * 100
      : 0;
  const overallAccuracy =
    stats.totalProblemsAttempted > 0
      ? (stats.totalProblemsCorrect / stats.totalProblemsAttempted) * 100
      : 0;

  return {
    skillScores: {
      Math: stats.mathSkillScore,
      Logic: stats.logicSkillScore,
      Science: stats.scienceSkillScore,
    },
    accuracy: {
      Math: mathAccuracy,
      Logic: logicAccuracy,
      Science: scienceAccuracy,
      overall: overallAccuracy,
    },
    avgResponseTime: {
      Math: stats.mathAvgResponseTimeMs ?? 15000,
      Logic: stats.logicAvgResponseTimeMs ?? 15000,
      Science: stats.scienceAvgResponseTimeMs ?? 15000,
      overall: stats.avgResponseTimeMs ?? 15000,
    },
    streaks: {
      current: stats.currentStreak,
      longest: stats.longestStreak,
    },
    adaptiveDifficulty: {
      Math: stats.mathAdaptiveDifficulty,
      Logic: stats.logicAdaptiveDifficulty,
      Science: stats.scienceAdaptiveDifficulty,
    },
    totalProblems: stats.totalProblemsAttempted,
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Obtiene las stats de un usuario, o las crea si no existen.
 * Garantiza que siempre tengamos un registro para el usuario.
 */
async function getOrCreateUserStats(userId: string): Promise<UserStats> {
  const [existingStats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  if (existingStats) {
    return existingStats;
  }

  // Crear registro inicial con valores por defecto
  const [newStats] = await db
    .insert(userStats)
    .values({ userId })
    .returning();

  return newStats;
}

/**
 * Obtiene la dificultad actual para una categoría específica.
 */
function getCurrentDifficulty(stats: UserStats, category: ProblemCategory): number {
  switch (category) {
    case 'Math':
      return stats.mathAdaptiveDifficulty;
    case 'Logic':
      return stats.logicAdaptiveDifficulty;
    case 'Science':
      return stats.scienceAdaptiveDifficulty;
  }
}

/**
 * Actualiza la dificultad adaptativa para una categoría.
 */
async function updateAdaptiveDifficulty(
  userId: string,
  category: ProblemCategory,
  newDifficulty: number
): Promise<void> {
  const updateData: Partial<NewUserStats> = {
    updatedAt: new Date(),
  };

  // Actualizar el campo correspondiente según la categoría
  switch (category) {
    case 'Math':
      updateData.mathAdaptiveDifficulty = newDifficulty;
      break;
    case 'Logic':
      updateData.logicAdaptiveDifficulty = newDifficulty;
      break;
    case 'Science':
      updateData.scienceAdaptiveDifficulty = newDifficulty;
      break;
  }

  await db
    .update(userStats)
    .set(updateData)
    .where(eq(userStats.userId, userId));
}

/**
 * Actualiza todas las estadísticas después de resolver un problema.
 *
 * Incluye:
 * - Contadores de intentos y aciertos
 * - SkillScore usando fórmula Elo
 * - Tiempos de respuesta promedio
 * - Streaks (rachas)
 */
async function updateStatsForProblem(
  userId: string,
  currentStats: UserStats,
  result: ProblemResult
): Promise<void> {
  const { category, isCorrect, responseTimeMs, difficulty } = result;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ACTUALIZAR CONTADORES
  // ─────────────────────────────────────────────────────────────────────────
  const updateData: Partial<NewUserStats> = {
    totalProblemsAttempted: currentStats.totalProblemsAttempted + 1,
    totalProblemsCorrect: currentStats.totalProblemsCorrect + (isCorrect ? 1 : 0),
    updatedAt: new Date(),
  };

  // Contadores por categoría
  switch (category) {
    case 'Math':
      updateData.mathProblemsAttempted = currentStats.mathProblemsAttempted + 1;
      updateData.mathProblemsCorrect =
        currentStats.mathProblemsCorrect + (isCorrect ? 1 : 0);
      break;
    case 'Logic':
      updateData.logicProblemsAttempted = currentStats.logicProblemsAttempted + 1;
      updateData.logicProblemsCorrect =
        currentStats.logicProblemsCorrect + (isCorrect ? 1 : 0);
      break;
    case 'Science':
      updateData.scienceProblemsAttempted = currentStats.scienceProblemsAttempted + 1;
      updateData.scienceProblemsCorrect =
        currentStats.scienceProblemsCorrect + (isCorrect ? 1 : 0);
      break;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. ACTUALIZAR SKILL SCORE (Sistema Elo simplificado)
  // ─────────────────────────────────────────────────────────────────────────
  const currentSkillScore = getSkillScore(currentStats, category);
  const skillChange = calculateSkillScoreChange(
    currentSkillScore,
    difficulty,
    isCorrect,
    responseTimeMs
  );
  const newSkillScore = Math.max(0, Math.min(100, currentSkillScore + skillChange));

  switch (category) {
    case 'Math':
      updateData.mathSkillScore = Math.round(newSkillScore);
      break;
    case 'Logic':
      updateData.logicSkillScore = Math.round(newSkillScore);
      break;
    case 'Science':
      updateData.scienceSkillScore = Math.round(newSkillScore);
      break;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ACTUALIZAR TIEMPOS DE RESPUESTA (Media móvil)
  // ─────────────────────────────────────────────────────────────────────────
  // Usamos media móvil exponencial para suavizar cambios:
  // newAvg = (oldAvg * 0.9) + (newTime * 0.1)
  const currentAvgTime = currentStats.avgResponseTimeMs ?? 15000;
  const newAvgTime = Math.round(currentAvgTime * 0.9 + responseTimeMs * 0.1);
  updateData.avgResponseTimeMs = newAvgTime;

  // Tiempo por categoría
  switch (category) {
    case 'Math': {
      const mathAvg = currentStats.mathAvgResponseTimeMs ?? 15000;
      updateData.mathAvgResponseTimeMs = Math.round(mathAvg * 0.9 + responseTimeMs * 0.1);
      break;
    }
    case 'Logic': {
      const logicAvg = currentStats.logicAvgResponseTimeMs ?? 15000;
      updateData.logicAvgResponseTimeMs = Math.round(logicAvg * 0.9 + responseTimeMs * 0.1);
      break;
    }
    case 'Science': {
      const scienceAvg = currentStats.scienceAvgResponseTimeMs ?? 15000;
      updateData.scienceAvgResponseTimeMs = Math.round(scienceAvg * 0.9 + responseTimeMs * 0.1);
      break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. ACTUALIZAR STREAKS (Rachas)
  // ─────────────────────────────────────────────────────────────────────────
  if (isCorrect) {
    // Incrementar racha actual
    const newStreak = currentStats.currentStreak + 1;
    updateData.currentStreak = newStreak;
    updateData.lastStreakDate = new Date();

    // Actualizar récord si es necesario
    if (newStreak > currentStats.longestStreak) {
      updateData.longestStreak = newStreak;
    }
  } else {
    // Romper la racha
    updateData.currentStreak = 0;
  }

  // Aplicar actualización
  await db.update(userStats).set(updateData).where(eq(userStats.userId, userId));
}

/**
 * Obtiene el SkillScore actual para una categoría.
 */
function getSkillScore(stats: UserStats, category: ProblemCategory): number {
  switch (category) {
    case 'Math':
      return stats.mathSkillScore;
    case 'Logic':
      return stats.logicSkillScore;
    case 'Science':
      return stats.scienceSkillScore;
  }
}

/**
 * Calcula el cambio en SkillScore usando fórmula Elo simplificada.
 *
 * FÓRMULA ELO:
 * expectedSuccess = 1 / (1 + 10^((difficulty*10 - skillScore) / 400))
 * change = K * (resultado - expectedSuccess) + speedBonus
 *
 * EXPLICACIÓN:
 * - Si el usuario acierta un problema difícil para su nivel → gran aumento
 * - Si el usuario falla un problema fácil para su nivel → gran disminución
 * - Si el resultado es esperado → cambio pequeño
 * - Respuestas rápidas dan bonus adicional
 */
function calculateSkillScoreChange(
  currentScore: number,
  difficulty: number,
  isCorrect: boolean,
  responseTimeMs: number
): number {
  // Convertir dificultad (1-10) a escala comparable con skillScore (0-100)
  const difficultyScore = difficulty * 10;

  // Probabilidad esperada de responder correctamente
  // Basada en la diferencia entre dificultad y habilidad del usuario
  const expectedSuccess = 1 / (1 + Math.pow(10, (difficultyScore - currentScore) / 400));

  // Resultado real (1 = correcto, 0 = incorrecto)
  const actualResult = isCorrect ? 1 : 0;

  // Bonus por velocidad (solo si acertó)
  // Respuestas más rápidas que el threshold dan bonus proporcional
  let speedBonus = 0;
  if (isCorrect && responseTimeMs < RESPONSE_TIME_THRESHOLD) {
    // Cuanto más rápido, más bonus (máximo SPEED_BONUS_MAX puntos)
    speedBonus =
      ((RESPONSE_TIME_THRESHOLD - responseTimeMs) / RESPONSE_TIME_THRESHOLD) *
      SPEED_BONUS_MAX;
  }

  // Cambio en score según fórmula Elo
  const change = ELO_K_FACTOR * (actualResult - expectedSuccess) + speedBonus;

  // Limitar cambio máximo para evitar fluctuaciones extremas
  return Math.max(-20, Math.min(20, change));
}

// ============================================================================
// FUNCIONES DE UTILIDAD PARA INTEGRACIÓN
// ============================================================================

/**
 * Obtiene la dificultad recomendada para generar un problema.
 * Útil para llamar antes de generar un problema con el Worker de IA.
 *
 * @param userId - ID del usuario
 * @param category - Categoría del problema
 * @param cardDifficulty - Dificultad sugerida por la carta (opcional)
 * @returns Dificultad final a usar (1-10)
 */
export async function getRecommendedDifficulty(
  userId: string,
  category: ProblemCategory,
  cardDifficulty?: number
): Promise<number> {
  // La dificultad de la carta tiene prioridad si existe
  if (cardDifficulty && cardDifficulty >= 1 && cardDifficulty <= 10) {
    // Pero la ajustamos ligeramente según el nivel del usuario
    const adaptiveDifficulty = await calculateAdaptiveDifficulty(userId, category);

    // Promediar entre dificultad de carta y adaptativa
    // Esto permite que cartas difíciles sigan siendo difíciles,
    // pero se ajustan un poco al nivel del usuario
    return Math.round((cardDifficulty + adaptiveDifficulty) / 2);
  }

  // Si no hay dificultad de carta, usar solo la adaptativa
  return calculateAdaptiveDifficulty(userId, category);
}

/**
 * Verifica si el usuario está en racha y debería recibir bonus.
 * Útil para aplicar bonificaciones en el juego (ej: +1 maná).
 *
 * @param userId - ID del usuario
 * @returns true si el usuario tiene racha >= 3
 */
export async function isOnStreak(userId: string): Promise<boolean> {
  const stats = await getOrCreateUserStats(userId);
  return stats.currentStreak >= 3;
}

/**
 * Obtiene la racha actual del usuario.
 *
 * @param userId - ID del usuario
 * @returns Número de respuestas correctas consecutivas
 */
export async function getCurrentStreak(userId: string): Promise<number> {
  const stats = await getOrCreateUserStats(userId);
  return stats.currentStreak;
}
