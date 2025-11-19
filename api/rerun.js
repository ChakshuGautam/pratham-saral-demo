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

    // Get the api_version from the original task
    const originalTask = await sql`
      SELECT api_version FROM conversion_history WHERE task_id = ${taskId}
    `;

    const apiVersion = originalTask[0]?.api_version || 'v2';
    console.log('🔧 Rerunning with API version:', apiVersion);

    // Determine which API endpoint to use
    const apiEndpoint = apiVersion === 'v3'
      ? `${STRUCTURA_BASE_URL}/api/v3/convert`
      : `${STRUCTURA_BASE_URL}/api/v2/convert`;

    // Trigger new conversion with Structura API using FormData
    const formData = new FormData();
    formData.append('pdf_url', pdfUrl);
    formData.append('output_format', 'json');
    formData.append('use_llm', 'true');

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'X-Api-Key': STRUCTURA_API_KEY,
      },
      body: formData,
    });

    const data = await response.json();

    console.log('📊 Structura API response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // V3 API returns result directly, V2 API returns request_id for polling
    if (apiVersion === 'v3') {
      console.log('✅ V3 API returned direct result');

      // Generate a task ID for v3 results
      const newTaskId = `v3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Insert new record with completed status
      await sql`
        INSERT INTO conversion_history (task_id, pdf_url, blob_url, status, result, api_version)
        VALUES (${newTaskId}, ${pdfUrl}, ${pdfUrl}, 'completed', ${JSON.stringify(data)}, ${apiVersion})
      `;

      return res.status(200).json({
        message: 'Conversion completed',
        task_id: newTaskId,
        old_task_id: taskId,
        status: 'completed',
      });
    } else {
      // V2 API - async processing
      const newTaskId = data.task_id || data.request_id;

      if (!newTaskId) {
        console.error('No task_id in Structura response:', data);
        return res.status(500).json({
          error: 'Failed to get task ID from Structura API',
          response: data
        });
      }

      // Insert new record while keeping the old one
      await sql`
        INSERT INTO conversion_history (task_id, pdf_url, blob_url, status, api_version)
        VALUES (${newTaskId}, ${pdfUrl}, ${pdfUrl}, 'processing', ${apiVersion})
      `;

      return res.status(200).json({
        message: 'Conversion restarted',
        task_id: newTaskId,
        old_task_id: taskId,
      });
    }
  } catch (error) {
    console.error('Error rerunning conversion:', error);
    return res.status(500).json({
      error: 'Failed to rerun conversion',
      message: error.message
    });
  }
}
