import { neon } from "@neondatabase/serverless";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Running migration...');

    // Create conversion_history table
    await sql`
      CREATE TABLE IF NOT EXISTS conversion_history (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(255) UNIQUE NOT NULL,
        pdf_url TEXT NOT NULL,
        blob_url TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'processing',
        result JSONB,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_task_id ON conversion_history(task_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_created_at ON conversion_history(created_at DESC)`;

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
