/**
 * GET /api/transformers - List all transformers
 * POST /api/transformers - Create a new transformer
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
      const transformers = await sql`
        SELECT id, name, description, code, input_schema, output_schema, created_at, updated_at
        FROM transformers
        ORDER BY created_at DESC
      `;

      return res.status(200).json({ transformers });
    } catch (error) {
      console.error('Error fetching transformers:', error);
      return res.status(500).json({ error: 'Failed to fetch transformers' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, code, input_schema, output_schema } = req.body;

      if (!name || !code) {
        return res.status(400).json({ error: 'Name and code are required' });
      }

      const result = await sql`
        INSERT INTO transformers (name, description, code, input_schema, output_schema)
        VALUES (${name}, ${description || null}, ${code}, ${JSON.stringify(input_schema) || null}, ${JSON.stringify(output_schema) || null})
        RETURNING id, name, description, code, input_schema, output_schema, created_at
      `;

      return res.status(201).json({ transformer: result[0] });
    } catch (error) {
      console.error('Error creating transformer:', error);
      return res.status(500).json({ error: 'Failed to create transformer' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
