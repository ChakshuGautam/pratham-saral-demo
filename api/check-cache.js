/**
 * GET /api/check-cache?hash=<pdf_hash>
 * Check if a PDF with this hash has already been converted
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

  const { hash } = req.query;

  if (!hash) {
    return res.status(400).json({ error: 'Hash parameter required' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      SELECT task_id, status, result, blob_url, created_at
      FROM conversion_history
      WHERE pdf_hash = ${hash}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return res.status(200).json({ exists: false });
    }

    const record = result[0];

    return res.status(200).json({
      exists: true,
      task_id: record.task_id,
      status: record.status,
      result: record.result,
      blob_url: record.blob_url,
      created_at: record.created_at,
    });
  } catch (error) {
    console.error('Cache check error:', error);
    return res.status(500).json({
      error: 'Failed to check cache',
      message: error.message
    });
  }
}
