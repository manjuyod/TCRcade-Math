
-- Rollback script to restore dropped tables from backup
-- Use this if issues are discovered after cleanup

BEGIN;

-- Restore tables from backup
CREATE TABLE concept_mastery AS SELECT * FROM concept_mastery_backup;
CREATE TABLE subject_mastery AS SELECT * FROM subject_mastery_backup;
CREATE TABLE user_progress AS SELECT * FROM user_progress_backup;
CREATE TABLE subject_difficulty_history AS SELECT * FROM subject_difficulty_history_backup;

-- Verify restoration
DO $$
DECLARE
    restored_tables INTEGER;
BEGIN
    SELECT COUNT(*) INTO restored_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('concept_mastery', 'subject_mastery', 'user_progress', 'subject_difficulty_history');
    
    IF restored_tables != 4 THEN
        RAISE EXCEPTION 'Table restoration failed! Only % tables restored', restored_tables;
    END IF;
    
    RAISE NOTICE 'All tables successfully restored from backup';
END $$;

-- Log the rollback
INSERT INTO public.schema_migrations (version, description, executed_at) 
VALUES ('001_rollback_table_cleanup', 'Rolled back redundant table cleanup', NOW())
ON CONFLICT (version) DO UPDATE SET executed_at = NOW();

COMMIT;

RAISE NOTICE 'Rollback completed successfully';
RAISE NOTICE 'Remember to restore schema files from .bak if needed';
