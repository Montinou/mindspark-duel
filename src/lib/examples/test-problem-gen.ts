
import * as dotenv from 'dotenv';
import { resolve } from 'path';
// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { Card } from '@/types/game';
import { generateProblemForCard } from '../ai/problem-generator';

async function testProblemGeneration() {
  console.log('🚀 Testing Thematic Problem Generation...');

  // Mock card
  const mockCard: Card = {
    id: 'test-card-id',
    name: 'Inferno Dragon',
    description: 'A mighty dragon from the volcanic lands.',
    flavorText: 'Its breath melts stone and steel alike.',
    effectDescription: 'Deal 5 damage.',
    cost: 6,
    power: 8,
    defense: 5,
    element: 'Fire',
    problemCategory: 'Math',
    imageUrl: 'https://example.com/dragon.png',
    theme: 'Dragons',
    tags: ['dragon', 'fire', 'volcano'],
    createdAt: new Date(),
  };

  try {
    const problem = await generateProblemForCard(mockCard);
    console.log('✅ Problem Generated:');
    console.log('   Question:', problem.question);
    console.log('   Options:', problem.options);
    console.log('   Correct:', problem.correctAnswer);
    console.log('   Difficulty:', problem.difficulty);
    console.log('   Context:', problem.themeContext);
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

testProblemGeneration();
