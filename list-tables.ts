
import { db } from './server/db';

async function listTables() {
  try {
    const tables = await db.execute(sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);
    console.log('Database Schema:');
    console.log(tables.rows);
  } catch (error) {
    console.error('Error fetching schema:', error);
  } finally {
    process.exit();
  }
}

listTables();
