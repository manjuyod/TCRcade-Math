import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Create session store with Postgres
const PostgresSessionStore = connectPg(session);

// Create session store instance
export const sessionStore = new PostgresSessionStore({
  pool,
  createTableIfMissing: true, // Automatically create session table if it doesn't exist
  tableName: 'session', // Custom table name (default is 'session')
});