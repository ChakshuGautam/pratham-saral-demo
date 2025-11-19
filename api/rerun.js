/**
 * POST /api/rerun
 * Rerun conversion by deleting existing record and creating new one
 */

import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const STRUCTURA_API_KEY = process.env.STRUCTURA_API_KEY;
  const STRUCTURA_BASE_URL = process.env.STRUCTURA_BASE_URL || 'http://localhost:8001';

  if (!STRUCTURA_API_KEY) {
    console.error('STRUCTURA_API_KEY is not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { taskId, pdfUrl } = req.body;

  if (!taskId || !pdfUrl) {
    return res.status(400).json({ error: 'Task ID and PDF URL are required' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Trigger new conversion with Structura API using FormData
    const formData = new FormData();
    formData.append('pdf_url', pdfUrl);
    formData.append('output_format', 'json');
    formData.append('use_llm', 'true');

    const response = await fetch(`${STRUCTURA_BASE_URL}/api/v2/convert`, {
      method: 'POST',
      headers: {
        'X-Api-Key': STRUCTURA_API_KEY,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const newTaskId = data.task_id;

    // Insert new record while keeping the old one
    await sql`
      INSERT INTO conversion_history (task_id, pdf_url, blob_url, status)
      VALUES (${newTaskId}, ${pdfUrl}, ${pdfUrl}, 'processing')
    `;

    return res.status(200).json({
      message: 'Conversion restarted',
      task_id: newTaskId,
      old_task_id: taskId,
    });
  } catch (error) {
    console.error('Error rerunning conversion:', error);
    return res.status(500).json({
      error: 'Failed to rerun conversion',
      message: error.message
    });
  }
}
