import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';

// Initialize database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create drizzle instance with all schema tables
export const db = drizzle(pool, { schema });

// Export pool for direct query access if needed
export { pool };