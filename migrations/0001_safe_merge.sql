
-- Back up existing data
CREATE TABLE IF NOT EXISTS "session_backup" AS 
SELECT * FROM "session";

-- Back up users table focusing on preferred_difficulty
CREATE TABLE IF NOT EXISTS "users_backup" AS 
SELECT id, preferred_difficulty 
FROM "users" 
WHERE preferred_difficulty IS NOT NULL;

-- Ensure preferred_difficulty exists in users table
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "preferred_difficulty" integer;

-- Restore preferred_difficulty values from backup
UPDATE "users" u
SET preferred_difficulty = ub.preferred_difficulty
FROM users_backup ub
WHERE u.id = ub.id;

-- Keep backup tables for safety
-- You can drop them later with:
-- DROP TABLE IF EXISTS "session_backup";
-- DROP TABLE IF EXISTS "users_backup";
