-- Alter the questions table ID to bigint type (already done manually)
-- ALTER TABLE questions ALTER COLUMN id TYPE BIGINT;

-- Verify the ID column type of questions table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'questions' AND column_name = 'id';

-- Verify the user table preferred difficulty
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'preferred_difficulty';

-- Query table to make sure it works with timestamp IDs
SELECT id, category, grade 
FROM questions 
WHERE id > 1000000000 
LIMIT 5;