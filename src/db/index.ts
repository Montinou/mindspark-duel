import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';

// For scripts running outside Next.js, load .env.local
if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
  try {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch (e) {
    // Silently fail if dotenv not available (Next.js will handle env vars)
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

import * as schema from './schema';

// Create drizzle instance
export const db = drizzle(pool, { schema });
