import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { userProfileSchema } from '@/types/profile';
import { z } from 'zod';

// GET /api/user/profile - Get current user's profile
export async function GET(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Return null if user not found, otherwise return profile
    return NextResponse.json(userData || null);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - Update current user's profile
export async function PUT(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate input with Zod
    const validatedData = userProfileSchema.parse(body);

    // Update user profile in database
    const [updatedUser] = await db
      .update(users)
      .set({
        age: validatedData.age,
        educationLevel: validatedData.educationLevel,
        interests: validatedData.interests,
        preferredDifficulty: validatedData.preferredDifficulty,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning({
        age: users.age,
        educationLevel: users.educationLevel,
        interests: users.interests,
        preferredDifficulty: users.preferredDifficulty,
      });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
