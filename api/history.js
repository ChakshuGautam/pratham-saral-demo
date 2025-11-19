/**
 * GET /api/history
 * Get all conversion history from database and update processing tasks
 */

import { neon } from "@neondatabase/serverless";

const STRUCTURA_BASE_URL = process.env.STRUCTURA_BASE_URL || 'http://localhost:8001';
const STRUCTURA_API_KEY = process.env.STRUCTURA_API_KEY;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const history = await sql`
      SELECT
        id,
        task_id,
        pdf_url,
        blob_url,
        status,
        result,
        error,
        created_at,
        updated_at,
        pdf_hash
      FROM conversion_history
      ORDER BY created_at DESC
      LIMIT 100
    `;

    // For any processing tasks, check their status with Structura API
    const processingTasks = history.filter(item => item.status === 'processing');

    if (processingTasks.length > 0) {
      console.log(`📊 Found ${processingTasks.length} processing task(s), checking status...`);

      // Check status of each processing task
      const updatePromises = processingTasks.map(async (task) => {
        try {
          const response = await fetch(`${STRUCTURA_BASE_URL}/api/v2/convert/${task.task_id}`, {
            method: 'GET',
            headers: {
              'X-Api-Key': STRUCTURA_API_KEY,
            },
          });

          if (!response.ok) {
            console.log(`⚠️ Failed to check status for task ${task.task_id}`);
            return task;
          }

          const data = await response.json();

          // If status changed, update the database
          if (data.status !== 'processing') {
            console.log(`✅ Task ${task.task_id} status changed to: ${data.status}`);

            await sql`
              UPDATE conversion_history
              SET status = ${data.status},
                  result = ${JSON.stringify(data.result || null)},
                  error = ${data.error || null},
                  updated_at = NOW()
              WHERE task_id = ${task.task_id}
            `;

            // Return updated task
            return {
              ...task,
              status: data.status,
              result: data.result,
              error: data.error,
            };
          }

          return task;
        } catch (err) {
          console.error(`Error checking task ${task.task_id}:`, err.message);
          return task;
        }
      });

      await Promise.all(updatePromises);

      // Re-fetch history to get updated data
      const updatedHistory = await sql`
        SELECT
          id,
          task_id,
          pdf_url,
          blob_url,
          status,
          result,
          error,
          created_at,
          updated_at,
          pdf_hash
        FROM conversion_history
        ORDER BY created_at DESC
        LIMIT 100
      `;

      return res.status(200).json({ history: updatedHistory });
    }

    return res.status(200).json({ history });
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return res.status(500).json({
      error: 'Failed to fetch history',
      message: error.message
    });
  }
}
