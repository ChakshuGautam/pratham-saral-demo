import { neon } from "@neondatabase/serverless";
import dotenv from 'dotenv';

dotenv.config();

async function addHashColumn() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Adding pdf_hash column...');

    await sql`ALTER TABLE conversion_history ADD COLUMN IF NOT EXISTS pdf_hash VARCHAR(64)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pdf_hash ON conversion_history(pdf_hash)`;

    console.log('✅ Hash column added successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addHashColumn();
