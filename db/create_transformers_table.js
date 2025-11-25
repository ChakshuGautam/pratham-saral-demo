import { neon } from "@neondatabase/serverless";
import dotenv from 'dotenv';

dotenv.config();

async function createTransformersTable() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Creating transformers table...');

    // Create transformers table - stores individual transformer functions
    await sql`
      CREATE TABLE IF NOT EXISTS transformers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        code TEXT NOT NULL,
        input_schema JSONB,
        output_schema JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('Creating pipelines table...');

    // Create pipelines table - stores ordered chains of transformers
    await sql`
      CREATE TABLE IF NOT EXISTS pipelines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        transformer_ids INTEGER[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('Adding pipeline_id column to conversion_history...');

    // Add pipeline_id to conversion_history
    await sql`
      ALTER TABLE conversion_history
      ADD COLUMN IF NOT EXISTS pipeline_id INTEGER REFERENCES pipelines(id),
      ADD COLUMN IF NOT EXISTS transformed_result JSONB
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_transformers_name ON transformers(name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pipelines_name ON pipelines(name)`;

    console.log('✅ Successfully created transformers and pipelines tables!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

createTransformersTable();
