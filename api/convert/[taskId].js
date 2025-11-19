/**
 * GET /api/convert/:taskId
 * Get conversion result from Structura API
 */

import { neon } from "@neondatabase/serverless";

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

  const STRUCTURA_API_KEY = process.env.STRUCTURA_API_KEY;
  const STRUCTURA_BASE_URL = process.env.STRUCTURA_BASE_URL || 'http://localhost:8001';

  if (!STRUCTURA_API_KEY) {
    console.error('STRUCTURA_API_KEY is not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { taskId } = req.query;

  if (!taskId || typeof taskId !== 'string') {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  try {
    // First get record from database
    const sql = neon(process.env.DATABASE_URL);
    const dbRecords = await sql`
      SELECT pdf_url, blob_url, status, result, error
      FROM conversion_history
      WHERE task_id = ${taskId}
    `;

    const dbRecord = dbRecords[0];

    if (!dbRecord) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // If result is already in database and completed/failed, return it directly
    if (dbRecord.result && (dbRecord.status === 'completed' || dbRecord.status === 'failed')) {
      return res.status(200).json({
        status: dbRecord.status,
        result: dbRecord.result,
        error: dbRecord.error,
        pdf_url: dbRecord.pdf_url,
        blob_url: dbRecord.blob_url,
      });
    }

    // Otherwise, call Structura API to get/update result
    const response = await fetch(
      `${STRUCTURA_BASE_URL}/api/v2/convert/${taskId}`,
      {
        method: 'GET',
        headers: {
          'X-Api-Key': STRUCTURA_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Update database with result
    if (data.status === 'completed' || data.status === 'failed') {
      try {
        await sql`
          UPDATE conversion_history
          SET status = ${data.status},
              result = ${JSON.stringify(data.result || null)},
              error = ${data.error || null},
              updated_at = NOW()
          WHERE task_id = ${taskId}
        `;
      } catch (dbError) {
        console.error('Database update error:', dbError);
      }
    }

    // Include PDF URL from database in response
    return res.status(200).json({
      ...data,
      pdf_url: dbRecord.pdf_url,
      blob_url: dbRecord.blob_url,
    });
  } catch (error) {
    console.error('Error fetching conversion result:', error);
    return res.status(500).json({
      error: 'Failed to fetch conversion result',
      message: error.message
    });
  }
}
