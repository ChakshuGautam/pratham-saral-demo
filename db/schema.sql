-- Conversion history table
CREATE TABLE IF NOT EXISTS conversion_history (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(255) UNIQUE NOT NULL,
  pdf_url TEXT NOT NULL,
  blob_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  result JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_id ON conversion_history(task_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON conversion_history(created_at DESC);
