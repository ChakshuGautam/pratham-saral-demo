/**
 * POST /api/pipelines/execute
 * Execute a pipeline on given input data
 *
 * Body:
 * - pipeline_id: ID of the pipeline to execute
 * - input: The input data (HTML or previous output)
 * - task_id: (optional) Task ID to save transformed result
 */

import { neon } from "@neondatabase/serverless";

// Simple sandboxed execution using Function constructor
// Note: For production, consider using isolated-vm or similar for better security
function executeTransformer(code, input) {
  try {
    // Create a function that takes 'input' and returns the transformed output
    // The code should be a function body that uses 'input' variable
    const fn = new Function('input', `
      "use strict";
      ${code}
    `);

    return { success: true, output: fn(input) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const { pipeline_id, input, task_id } = req.body;

  if (!pipeline_id || input === undefined) {
    return res.status(400).json({ error: 'pipeline_id and input are required' });
  }

  try {
    // Get pipeline with transformers
    const pipelineResult = await sql`
      SELECT id, name, transformer_ids
      FROM pipelines
      WHERE id = ${pipeline_id}
    `;

    if (pipelineResult.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    const pipeline = pipelineResult[0];

    if (!pipeline.transformer_ids || pipeline.transformer_ids.length === 0) {
      return res.status(200).json({
        success: true,
        output: input,
        steps: [],
        message: 'Pipeline has no transformers, returning input as-is'
      });
    }

    // Get transformers in order
    const transformerResult = await sql`
      SELECT id, name, code
      FROM transformers
      WHERE id = ANY(${pipeline.transformer_ids})
    `;

    const transformerMap = {};
    transformerResult.forEach(t => transformerMap[t.id] = t);

    const transformers = pipeline.transformer_ids
      .map(tid => transformerMap[tid])
      .filter(Boolean);

    // Execute transformers in sequence
    let currentOutput = input;
    const steps = [];

    for (const transformer of transformers) {
      console.log(`Executing transformer: ${transformer.name} (${transformer.id})`);

      const startTime = Date.now();
      const result = executeTransformer(transformer.code, currentOutput);
      const duration = Date.now() - startTime;

      steps.push({
        transformer_id: transformer.id,
        transformer_name: transformer.name,
        success: result.success,
        duration_ms: duration,
        error: result.error || null,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: `Transformer "${transformer.name}" failed: ${result.error}`,
          steps,
          partial_output: currentOutput,
        });
      }

      currentOutput = result.output;
    }

    // If task_id provided, save transformed result to database
    if (task_id) {
      try {
        await sql`
          UPDATE conversion_history
          SET
            transformed_result = ${JSON.stringify(currentOutput)},
            pipeline_id = ${pipeline_id},
            updated_at = NOW()
          WHERE task_id = ${task_id}
        `;
        console.log(`Saved transformed result for task ${task_id}`);
      } catch (dbError) {
        console.error('Failed to save transformed result:', dbError);
      }
    }

    return res.status(200).json({
      success: true,
      output: currentOutput,
      steps,
      pipeline_name: pipeline.name,
    });

  } catch (error) {
    console.error('Error executing pipeline:', error);
    return res.status(500).json({
      error: 'Failed to execute pipeline',
      message: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
