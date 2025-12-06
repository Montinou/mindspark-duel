/**
 * ============================================================================
 * API: /api/user/stats
 * ============================================================================
 *
 * PROPÓSITO:
 * Endpoint para obtener y gestionar las estadísticas educativas del usuario.
 * Incluye SkillScores, precisión, tiempos, streaks y dificultad adaptativa.
 *
 * ENDPOINTS:
 * - GET: Obtener estadísticas del usuario autenticado
 * - POST: Registrar resultado de un problema (usado internamente)
 *
 * AUTENTICACIÓN:
 * Requiere usuario autenticado via Stack Auth (cookie-based)
 *
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import {
  getUserStats,
  recordProblemResult,
  type ProblemResult,
  type ProblemCategory,
} from '@/lib/gamification/adaptive-difficulty';

// ============================================================================
// GET /api/user/stats
// ============================================================================
// Obtiene las estadísticas educativas del usuario autenticado.
// Incluye: skillScores, accuracy, avgResponseTime, streaks, adaptiveDifficulty
// ============================================================================
export async function GET() {
  try {
    // Verificar autenticación
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener estadísticas del servicio
    const stats = await getUserStats(user.id);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[API /user/stats GET] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/user/stats
// ============================================================================
// Registra el resultado de un problema resuelto.
// Actualiza: historial, contadores, SkillScore, tiempos, streaks.
//
// BODY ESPERADO (ProblemResult):
// {
//   category: 'Math' | 'Logic' | 'Science',
//   difficulty: number (1-10),
//   question: string,
//   correctAnswer: string,
//   userAnswer: string | null,
//   isCorrect: boolean,
//   responseTimeMs: number,
//   timedOut: boolean,
//   // Campos opcionales de contexto...
// }
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Parsear body
    const body = await request.json();

    // Validar campos requeridos
    const requiredFields = [
      'category',
      'difficulty',
      'question',
      'correctAnswer',
      'isCorrect',
      'responseTimeMs',
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Campo requerido faltante: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validar categoría
    const validCategories: ProblemCategory[] = ['Math', 'Logic', 'Science'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Categoría inválida: ${body.category}. Debe ser Math, Logic o Science` },
        { status: 400 }
      );
    }

    // Validar dificultad
    if (body.difficulty < 1 || body.difficulty > 10) {
      return NextResponse.json(
        { error: 'Dificultad debe estar entre 1 y 10' },
        { status: 400 }
      );
    }

    // Construir objeto ProblemResult
    const problemResult: ProblemResult = {
      userId: user.id,
      category: body.category,
      difficulty: body.difficulty,
      question: body.question,
      options: body.options,
      correctAnswer: body.correctAnswer,
      hints: body.hints,
      userAnswer: body.userAnswer ?? null,
      isCorrect: Boolean(body.isCorrect),
      responseTimeMs: body.responseTimeMs,
      timedOut: Boolean(body.timedOut),
      // Contexto de carta (opcional)
      cardId: body.cardId,
      cardName: body.cardName,
      cardElement: body.cardElement,
      cardCost: body.cardCost,
      cardPower: body.cardPower,
      // Contexto de juego (opcional)
      gameSessionId: body.gameSessionId,
      phase: body.phase,
      turnNumber: body.turnNumber,
      opponentType: body.opponentType,
      // Metadata de generación (opcional)
      generatedBy: body.generatedBy,
      aiModel: body.aiModel,
      problemHintsUsed: body.problemHintsUsed,
      generationTimeMs: body.generationTimeMs,
    };

    // Registrar resultado
    await recordProblemResult(problemResult);

    // Obtener estadísticas actualizadas para devolver
    const updatedStats = await getUserStats(user.id);

    return NextResponse.json({
      success: true,
      message: 'Resultado registrado correctamente',
      data: {
        stats: updatedStats,
        // Información útil para el cliente
        streakInfo: {
          current: updatedStats.streaks.current,
          isOnStreak: updatedStats.streaks.current >= 3,
          // Bonus disponible si tiene racha >= 3
          bonusAvailable: updatedStats.streaks.current >= 3,
        },
      },
    });
  } catch (error) {
    console.error('[API /user/stats POST] Error:', error);
    return NextResponse.json(
      { error: 'Error al registrar resultado' },
      { status: 500 }
    );
  }
}
