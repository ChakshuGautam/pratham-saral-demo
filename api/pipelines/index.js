/**
 * GET /api/pipelines - List all pipelines
 * POST /api/pipelines - Create a new pipeline
 */

import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'GET') {
    try {
      const pipelines = await sql`
        SELECT id, name, description, transformer_ids, created_at, updated_at
        FROM pipelines
        ORDER BY created_at DESC
      `;

      return res.status(200).json({ pipelines });
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      return res.status(500).json({ error: 'Failed to fetch pipelines' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, transformer_ids } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const result = await sql`
        INSERT INTO pipelines (name, description, transformer_ids)
        VALUES (${name}, ${description || null}, ${transformer_ids || []})
        RETURNING id, name, description, transformer_ids, created_at
      `;

      return res.status(201).json({ pipeline: result[0] });
    } catch (error) {
      console.error('Error creating pipeline:', error);
      return res.status(500).json({ error: 'Failed to create pipeline' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
