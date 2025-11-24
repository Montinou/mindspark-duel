import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const WORKERS_PROBLEM_URL = process.env.WORKERS_AI_PROBLEM_URL || 'https://mindspark-ai-problem-generator.agusmontoya.workers.dev';

const generateProblemSchema = z.object({
  cardId: z.string().uuid(),
  cardName: z.string(),
  cardElement: z.enum(['Fire', 'Water', 'Earth', 'Air']),
  cardTags: z.array(z.string()).optional(),
  problemCategory: z.enum(['Math', 'Logic', 'Science']),
  difficulty: z.number().min(1).max(10).default(5),
});

type GenerateProblemInput = z.infer<typeof generateProblemSchema>;

// POST /api/problems/generate - Generate contextual problem for battle
export async function POST(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = generateProblemSchema.parse(body);

    const { cardName, cardElement, cardTags, problemCategory, difficulty } = validatedData;

    // Fetch user profile for personalization
    const [userData] = await db
      .select({
        age: users.age,
        educationLevel: users.educationLevel,
        interests: users.interests,
        preferredDifficulty: users.preferredDifficulty,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    // Call ai-problem-generator Worker with full context
    console.log('🧮 Generating battle problem with card context:', cardName);

    const workerResponse = await fetch(WORKERS_PROBLEM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: problemCategory,
        difficulty,
        // Card context for thematic problems
        cardName,
        cardElement,
        cardTags,
        // User profile for personalization
        userAge: userData?.age,
        userEducationLevel: userData?.educationLevel,
        userInterests: userData?.interests,
      }),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error('❌ Worker error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate problem', details: errorText },
        { status: 500 }
      );
    }

    const workerData = await workerResponse.json();

    if (!workerData.success || !workerData.data) {
      console.error('❌ Invalid worker response:', workerData);
      return NextResponse.json(
        { error: 'Invalid problem data from AI' },
        { status: 500 }
      );
    }

    console.log('✅ Problem generated:', workerData.data.question.substring(0, 50) + '...');

    return NextResponse.json({
      success: true,
      problem: workerData.data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error generating problem:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
