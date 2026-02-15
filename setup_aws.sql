-- Run this script in your database tool (e.g., pgAdmin or via terminal)
-- to create the uploads table without resetting your database.

CREATE TABLE IF NOT EXISTS uploads (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url   TEXT NOT NULL,
  file_type  VARCHAR(50) NOT NULL, -- IMAGE, PDF, VIDEO
  file_name  VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
