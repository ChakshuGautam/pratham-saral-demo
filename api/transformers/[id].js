/**
 * GET /api/transformers/:id - Get a specific transformer
 * PUT /api/transformers/:id - Update a transformer
 * DELETE /api/transformers/:id - Delete a transformer
 */

import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, name, description, code, input_schema, output_schema, created_at, updated_at
        FROM transformers
        WHERE id = ${id}
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Transformer not found' });
      }

      return res.status(200).json({ transformer: result[0] });
    } catch (error) {
      console.error('Error fetching transformer:', error);
      return res.status(500).json({ error: 'Failed to fetch transformer' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, description, code, input_schema, output_schema } = req.body;

      const result = await sql`
        UPDATE transformers
        SET
          name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          code = COALESCE(${code}, code),
          input_schema = COALESCE(${JSON.stringify(input_schema)}, input_schema),
          output_schema = COALESCE(${JSON.stringify(output_schema)}, output_schema),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, description, code, input_schema, output_schema, created_at, updated_at
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Transformer not found' });
      }

      return res.status(200).json({ transformer: result[0] });
    } catch (error) {
      console.error('Error updating transformer:', error);
      return res.status(500).json({ error: 'Failed to update transformer' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await sql`
        DELETE FROM transformers
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Transformer not found' });
      }

      return res.status(200).json({ message: 'Transformer deleted' });
    } catch (error) {
      console.error('Error deleting transformer:', error);
      return res.status(500).json({ error: 'Failed to delete transformer' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
