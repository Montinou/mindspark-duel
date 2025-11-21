import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

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

// Use HTTP adapter for serverless environments (Next.js)
// This is recommended for Edge Functions and serverless deployments
const sql = neon(process.env.DATABASE_URL);

import * as schema from './schema';

// Create drizzle instance with HTTP adapter
export const db = drizzle(sql, { schema });
