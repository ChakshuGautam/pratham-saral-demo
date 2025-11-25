/**
 * GET /api/pipelines/:id - Get a specific pipeline with its transformers
 * PUT /api/pipelines/:id - Update a pipeline
 * DELETE /api/pipelines/:id - Delete a pipeline
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
      // Get pipeline
      const pipelineResult = await sql`
        SELECT id, name, description, transformer_ids, created_at, updated_at
        FROM pipelines
        WHERE id = ${id}
      `;

      if (pipelineResult.length === 0) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      const pipeline = pipelineResult[0];

      // Get transformers in order
      let transformers = [];
      if (pipeline.transformer_ids && pipeline.transformer_ids.length > 0) {
        const transformerResult = await sql`
          SELECT id, name, description, code, input_schema, output_schema
          FROM transformers
          WHERE id = ANY(${pipeline.transformer_ids})
        `;

        // Order transformers according to pipeline order
        const transformerMap = {};
        transformerResult.forEach(t => transformerMap[t.id] = t);
        transformers = pipeline.transformer_ids
          .map(tid => transformerMap[tid])
          .filter(Boolean);
      }

      return res.status(200).json({
        pipeline: {
          ...pipeline,
          transformers,
        }
      });
    } catch (error) {
      console.error('Error fetching pipeline:', error);
      return res.status(500).json({ error: 'Failed to fetch pipeline' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, description, transformer_ids } = req.body;

      const result = await sql`
        UPDATE pipelines
        SET
          name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          transformer_ids = COALESCE(${transformer_ids}, transformer_ids),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, description, transformer_ids, created_at, updated_at
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      return res.status(200).json({ pipeline: result[0] });
    } catch (error) {
      console.error('Error updating pipeline:', error);
      return res.status(500).json({ error: 'Failed to update pipeline' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await sql`
        DELETE FROM pipelines
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      return res.status(200).json({ message: 'Pipeline deleted' });
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      return res.status(500).json({ error: 'Failed to delete pipeline' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
