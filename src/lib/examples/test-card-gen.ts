
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { generateCard } from '../ai/card-generator';

async function testCardGeneration() {
  console.log('🚀 Testing Card Generation...');
  
  try {
    const card = await generateCard('Space Exploration', 5);
    console.log('✅ Card Generated:', card);
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

testCardGeneration();
