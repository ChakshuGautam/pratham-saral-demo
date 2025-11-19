import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const upload = multer();

const STRUCTURA_API_KEY = process.env.STRUCTURA_API_KEY;
const STRUCTURA_BASE_URL = 'https://structura.theflywheel.in';

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// POST /api/convert - Upload PDF
app.post('/api/convert', upload.single('file'), async (req, res) => {
  if (!STRUCTURA_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  try {
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: 'application/pdf'
    });

    // Add optional fields from body
    if (req.body.user_id) formData.append('user_id', req.body.user_id);
    if (req.body.file_id) formData.append('file_id', req.body.file_id);
    if (req.body.output_format) formData.append('output_format', req.body.output_format);
    if (req.body.use_llm) formData.append('use_llm', req.body.use_llm);

    const response = await fetch(`${STRUCTURA_BASE_URL}/api/v2/convert`, {
      method: 'POST',
      headers: {
        'X-Api-Key': STRUCTURA_API_KEY,
        ...formData.getHeaders()
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(202).json(data);
  } catch (error) {
    console.error('Error converting PDF:', error);
    return res.status(500).json({
      error: 'Failed to convert PDF',
      message: error.message
    });
  }
});

// GET /api/convert/:taskId - Get conversion result
app.get('/api/convert/:taskId', async (req, res) => {
  if (!STRUCTURA_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { taskId } = req.params;

  if (!taskId) {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  try {
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

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching conversion result:', error);
    return res.status(500).json({
      error: 'Failed to fetch conversion result',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
