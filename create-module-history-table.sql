
-- Create module_history table for historical tracking
CREATE TABLE IF NOT EXISTS module_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  module_name TEXT NOT NULL,
  run_type TEXT NOT NULL CHECK (run_type IN ('test', 'token_run')),
  final_score INTEGER NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
  questions_total INTEGER DEFAULT 0 NOT NULL,
  questions_correct INTEGER DEFAULT 0 NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0 NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  difficulty_level INTEGER DEFAULT 1,
  grade_level TEXT,
  tokens_earned INTEGER DEFAULT 0 NOT NULL,
  
  -- Add indexes for performance
  CONSTRAINT fk_module_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_module_history_user_id ON module_history(user_id);
CREATE INDEX IF NOT EXISTS idx_module_history_module_name ON module_history(module_name);
CREATE INDEX IF NOT EXISTS idx_module_history_completed_at ON module_history(completed_at);
CREATE INDEX IF NOT EXISTS idx_module_history_user_module ON module_history(user_id, module_name);

-- Add comment for clarity
COMMENT ON TABLE module_history IS 'Tracks historical data for each module completion session';
