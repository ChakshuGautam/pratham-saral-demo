import { neon } from "@neondatabase/serverless";
import dotenv from 'dotenv';

dotenv.config();

async function clearHistory() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Deleting all conversion history...');

    const result = await sql`DELETE FROM conversion_history`;

    console.log('✅ Successfully deleted all conversion history!');
    console.log(`   Deleted ${result.length} record(s)`);
  } catch (error) {
    console.error('❌ Failed to delete history:', error);
    process.exit(1);
  }
}

clearHistory();
