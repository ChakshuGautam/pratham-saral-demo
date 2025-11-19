import { neon } from "@neondatabase/serverless";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function addApiVersionColumn() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Adding api_version column to conversion_history table...');

    // Add api_version column (defaults to 'v2' for backward compatibility)
    await sql`
      ALTER TABLE conversion_history
      ADD COLUMN IF NOT EXISTS api_version VARCHAR(10) DEFAULT 'v2'
    `;

    console.log('✅ Successfully added api_version column!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addApiVersionColumn();
