
-- Script to safely drop redundant tables after JSON migration
-- This script includes safety checks and rollback capabilities

-- First, verify migration was successful
DO $$
DECLARE
    total_users INTEGER;
    users_with_json INTEGER;
    missing_json INTEGER;
BEGIN
    SELECT 
        COUNT(*) INTO total_users
    FROM users;
    
    SELECT 
        COUNT(*) INTO users_with_json
    FROM users 
    WHERE hidden_grade_asset IS NOT NULL;
    
    missing_json := total_users - users_with_json;
    
    RAISE NOTICE 'Migration verification:';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Users with JSON data: %', users_with_json;
    RAISE NOTICE 'Users missing JSON: %', missing_json;
    
    IF missing_json > 0 THEN
        RAISE EXCEPTION 'Migration incomplete! % users missing hiddenGradeAsset data', missing_json;
    END IF;
    
    RAISE NOTICE 'Migration verification passed - all users have JSON data';
END $$;

-- Check for foreign key dependencies
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND (tc.table_name IN ('concept_mastery', 'subject_mastery', 'user_progress', 'subject_difficulty_history')
           OR ccu.table_name IN ('concept_mastery', 'subject_mastery', 'user_progress', 'subject_difficulty_history'));
    
    IF fk_count > 0 THEN
        RAISE EXCEPTION 'Foreign key dependencies found! Cannot safely drop tables.';
    END IF;
    
    RAISE NOTICE 'No foreign key dependencies found - safe to proceed';
END $$;

-- Create backup tables for rollback capability
CREATE TABLE IF NOT EXISTS concept_mastery_backup AS SELECT * FROM concept_mastery;
CREATE TABLE IF NOT EXISTS subject_mastery_backup AS SELECT * FROM subject_mastery;
CREATE TABLE IF NOT EXISTS user_progress_backup AS SELECT * FROM user_progress;
CREATE TABLE IF NOT EXISTS subject_difficulty_history_backup AS SELECT * FROM subject_difficulty_history;

RAISE NOTICE 'Backup tables created successfully';

-- Begin transaction for atomic operations
BEGIN;

-- Log the operation
INSERT INTO public.schema_migrations (version, description, executed_at) 
VALUES ('001_drop_redundant_tables', 'Dropped redundant tables after JSON migration', NOW())
ON CONFLICT (version) DO UPDATE SET executed_at = NOW();

-- Drop redundant tables in correct order
DROP TABLE IF EXISTS subject_difficulty_history CASCADE;
DROP TABLE IF EXISTS concept_mastery CASCADE;
DROP TABLE IF EXISTS subject_mastery CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;

-- Verify tables are dropped
DO $$
DECLARE
    remaining_tables INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('concept_mastery', 'subject_mastery', 'user_progress', 'subject_difficulty_history');
    
    IF remaining_tables > 0 THEN
        RAISE EXCEPTION 'Tables not fully dropped! Rolling back...';
    END IF;
    
    RAISE NOTICE 'All redundant tables successfully dropped';
END $$;

COMMIT;

RAISE NOTICE 'Redundant table cleanup completed successfully';
RAISE NOTICE 'Backup tables available for rollback: *_backup';
