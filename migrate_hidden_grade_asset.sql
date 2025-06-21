-- Migration script to standardize all users' hidden_grade_asset structure to match user 14
-- This will preserve existing data while adding missing keys with default values

-- Create a function to merge structures preserving existing data
CREATE OR REPLACE FUNCTION merge_hidden_grade_asset(existing_data JSONB, template_data JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    module_key TEXT;
    concept_key TEXT;
BEGIN
    -- Start with the template structure
    result := template_data;
    
    -- If existing data exists, merge it intelligently
    IF existing_data IS NOT NULL THEN
        -- Merge modules section
        IF existing_data ? 'modules' THEN
            FOR module_key IN SELECT jsonb_object_keys(existing_data->'modules')
            LOOP
                IF result->'modules' ? module_key THEN
                    -- Merge existing module data with template structure
                    result := jsonb_set(
                        result,
                        ARRAY['modules', module_key],
                        jsonb_deep_merge(
                            result->'modules'->module_key,
                            existing_data->'modules'->module_key
                        )
                    );
                END IF;
            END LOOP;
        END IF;
        
        -- Merge global_stats with existing values
        IF existing_data ? 'global_stats' THEN
            result := jsonb_set(
                result,
                '{global_stats}',
                jsonb_deep_merge(
                    result->'global_stats',
                    existing_data->'global_stats'
                )
            );
        END IF;
        
        -- Merge concept_mastery with existing values
        IF existing_data ? 'concept_mastery' THEN
            FOR concept_key IN SELECT jsonb_object_keys(existing_data->'concept_mastery')
            LOOP
                IF result->'concept_mastery' ? concept_key THEN
                    result := jsonb_set(
                        result,
                        ARRAY['concept_mastery', concept_key],
                        jsonb_deep_merge(
                            result->'concept_mastery'->concept_key,
                            existing_data->'concept_mastery'->concept_key
                        )
                    );
                END IF;
            END LOOP;
        END IF;
        
        -- Merge ai_analytics with existing values
        IF existing_data ? 'ai_analytics' THEN
            result := jsonb_set(
                result,
                '{ai_analytics}',
                jsonb_deep_merge(
                    result->'ai_analytics',
                    existing_data->'ai_analytics'
                )
            );
        END IF;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create jsonb_deep_merge function if it doesn't exist
CREATE OR REPLACE FUNCTION jsonb_deep_merge(a JSONB, b JSONB)
RETURNS JSONB AS $$
BEGIN
    IF jsonb_typeof(a) = 'object' AND jsonb_typeof(b) = 'object' THEN
        RETURN (
            SELECT jsonb_object_agg(
                key,
                CASE
                    WHEN a ? key AND b ? key THEN jsonb_deep_merge(a->key, b->key)
                    WHEN a ? key THEN a->key
                    ELSE b->key
                END
            )
            FROM (
                SELECT key FROM jsonb_object_keys(a) AS key
                UNION
                SELECT key FROM jsonb_object_keys(b) AS key
            ) AS keys(key)
        );
    ELSE
        -- For non-objects, prefer the value from b (existing data)
        RETURN COALESCE(b, a);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Get the template structure from user 14
DO $$
DECLARE
    template_data JSONB;
    user_record RECORD;
BEGIN
    -- Get user 14's structure as template
    SELECT hidden_grade_asset INTO template_data 
    FROM users 
    WHERE id = 14;
    
    -- Update all other users (except user 14)
    FOR user_record IN 
        SELECT id, hidden_grade_asset 
        FROM users 
        WHERE id != 14
    LOOP
        UPDATE users 
        SET hidden_grade_asset = merge_hidden_grade_asset(user_record.hidden_grade_asset, template_data)
        WHERE id = user_record.id;
        
        RAISE NOTICE 'Updated user %', user_record.id;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully';
END $$;

-- Clean up the helper functions
DROP FUNCTION IF EXISTS merge_hidden_grade_asset(JSONB, JSONB);
DROP FUNCTION IF EXISTS jsonb_deep_merge(JSONB, JSONB);