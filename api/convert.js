/**
 * POST /api/convert
 * Send blob URL to Structura API for processing
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

  try {
    const { blob_url, output_format = 'json', use_llm = 'true', pdf_hash, api_version = 'v2' } = req.body;

    if (!blob_url) {
      return res.status(400).json({ error: 'No blob_url provided' });
    }

    console.log('📥 Processing PDF from Blob URL:', blob_url);
    console.log('🔧 Using API version:', api_version);

    // Create FormData for the request
    const formData = new FormData();
    formData.append('pdf_url', blob_url);
    formData.append('output_format', output_format);
    formData.append('use_llm', use_llm === 'true' ? 'true' : 'false');

    console.log('🚀 Sending to Structura API with FormData:');
    console.log('  pdf_url:', blob_url);
    console.log('  output_format:', output_format);
    console.log('  use_llm:', use_llm === 'true');

    // Determine which API endpoint to use
    const apiEndpoint = api_version === 'v3'
      ? `${STRUCTURA_BASE_URL}/api/v3/convert`
      : `${STRUCTURA_BASE_URL}/api/v2/convert`;

    // Generate curl command for debugging
    const curlCommand = `curl -X POST '${apiEndpoint}' \\
  -H 'X-Api-Key: ${STRUCTURA_API_KEY}' \\
  -F 'pdf_url=${blob_url}' \\
  -F 'output_format=${output_format}' \\
  -F 'use_llm=${use_llm === 'true'}'`;

    console.log('📋 Equivalent curl command:');
    console.log(curlCommand);

    // Forward to Structura API with FormData
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'X-Api-Key': STRUCTURA_API_KEY,
      },
      body: formData,
    });

    console.log('📊 Structura API response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Structura API error:', JSON.stringify(data, null, 2));
      console.error('❌ Full error details:', data.detail);
      return res.status(response.status).json(data);
    }

    console.log('✅ Structura API accepted request. Request ID:', data.request_id);

    // Save to database
    try {
      const sql = neon(process.env.DATABASE_URL);
      await sql`
        INSERT INTO conversion_history (task_id, pdf_url, blob_url, status, pdf_hash, api_version)
        VALUES (${data.request_id}, ${blob_url}, ${blob_url}, 'processing', ${pdf_hash || null}, ${api_version})
        ON CONFLICT (task_id) DO NOTHING
      `;
      console.log('💾 Saved to database with API version:', api_version);
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Don't fail the request if database save fails
    }

    // Include blob URL in response
    return res.status(202).json({
      ...data,
      blob_url
    });
  } catch (error) {
    console.error('❌ Error converting PDF:', error);
    return res.status(500).json({
      error: 'Failed to convert PDF',
      message: error.message
    });
  }
}
