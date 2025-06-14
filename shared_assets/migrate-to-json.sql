
-- Migration Script: Consolidate User Progress to JSON
-- This script migrates data to hiddenGradeAsset while keeping performance-critical fields as separate columns

-- Step 1: Initialize hiddenGradeAsset with default structure for all users
UPDATE users 
SET hidden_grade_asset = '{
  "global_stats": {
    "fastest_category": null,
    "highest_score_category": null,
    "total_time_spent": 0,
    "last_active": null
  },
  "ai_analytics": {
    "analysis_date": null,
    "learning_patterns": {},
    "strengths": [],
    "areas_for_improvement": [],
    "engagement_analysis": {},
    "suggested_activities": [],
    "weaknesses": [],
    "datetime_generated": null
  },
  "cross_module_analytics": {
    "learning_patterns_between_modules": {},
    "preferred_learning_sequence": [],
    "module_transition_success_rate": {},
    "cross_concept_mastery": {}
  },
  "modules": {
    "fractions_puzzle": {
      "grade_level": 3,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "fractions, ratios",
        "preferred_difficulty": 3,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": null,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    },
    "math_rush": {
      "grade_level": 3,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "speed, memorization, pattern recognition",
        "preferred_difficulty": 3,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": null,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    },
    "word_race": {
      "grade_level": 3,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "",
        "preferred_difficulty": 3,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": null,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    },
    "decimal_defender": {
      "grade_level": 4,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "decimals",
        "preferred_difficulty": 3,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": null,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    },
    "ratios_proportions": {
      "grade_level": 6,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "ratios, proportions",
        "preferred_difficulty": 3,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": null,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    },
    "measurement": {
      "grade_level": 2,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "measurement, data analysis",
        "preferred_difficulty": 3,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": 1,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    },
    "algebra": {
      "grade_level": 6,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "exponents, algebra",
        "preferred_difficulty": 3,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": 1,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    },
    "addition_facts": {
      "grade_level": 1,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "addition",
        "preferred_difficulty": 1,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": null,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    },
    "subtraction_facts": {
      "grade_level": 1,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "subtraction",
        "preferred_difficulty": 1,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": null,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    },
    "multiplication_facts": {
      "grade_level": 2,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "multiplication",
        "preferred_difficulty": 2,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": null,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    },
    "division_facts": {
      "grade_level": 3,
      "progress": {
        "sessions_completed": 0,
        "total_questions_answered": 0,
        "correct_answers": 0,
        "best_score": 0,
        "best_time": null,
        "mastery_level": false,
        "last_played": null,
        "tokens_earned": 0,
        "test_taken": false,
        "timestamp": null,
        "concepts": "division",
        "preferred_difficulty": 3,
        "attempt_good": 0,
        "attempt_bad": 0,
        "lesson": null,
        "time_spent_total": 0,
        "streak_current": 0,
        "streak_best": 0
      }
    }
  }
}'::jsonb
WHERE hidden_grade_asset IS NULL;

-- Step 2: Migrate latest AI analytics data per user
WITH latest_ai_analytics AS (
  SELECT DISTINCT ON (user_id) 
    user_id,
    analysis_date,
    learning_patterns,
    strengths,
    areas_for_improvement,
    engagement_analysis,
    suggested_activities,
    weakness_concepts,
    generated_at
  FROM ai_analytics 
  ORDER BY user_id, analysis_date DESC NULLS LAST, id DESC
)
UPDATE users 
SET hidden_grade_asset = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                hidden_grade_asset,
                '{ai_analytics,analysis_date}', 
                to_jsonb(latest_ai_analytics.analysis_date), 
                false
              ),
              '{ai_analytics,learning_patterns}', 
              COALESCE(latest_ai_analytics.learning_patterns, '{}'::jsonb), 
              false
            ),
            '{ai_analytics,strengths}', 
            to_jsonb(COALESCE(latest_ai_analytics.strengths, ARRAY[]::text[])), 
            false
          ),
          '{ai_analytics,areas_for_improvement}', 
          to_jsonb(COALESCE(latest_ai_analytics.areas_for_improvement, ARRAY[]::text[])), 
          false
        ),
        '{ai_analytics,engagement_analysis}', 
        COALESCE(latest_ai_analytics.engagement_analysis, '{}'::jsonb), 
        false
      ),
      '{ai_analytics,suggested_activities}', 
      to_jsonb(COALESCE(latest_ai_analytics.suggested_activities, ARRAY[]::text[])), 
      false
    ),
    '{ai_analytics,weaknesses}', 
    to_jsonb(COALESCE(latest_ai_analytics.weakness_concepts, ARRAY[]::text[])), 
    false
  ),
  '{ai_analytics,datetime_generated}', 
  to_jsonb(latest_ai_analytics.generated_at), 
  false
)
FROM latest_ai_analytics 
WHERE users.id = latest_ai_analytics.user_id;

-- Step 3: Update global_stats with existing user data (non-redundant fields only)
UPDATE users 
SET hidden_grade_asset = jsonb_set(
  jsonb_set(
    jsonb_set(
      hidden_grade_asset,
      '{global_stats,fastest_category}', 
      to_jsonb(fastest_category), 
      false
    ),
    '{global_stats,highest_score_category}', 
    to_jsonb(highest_score_category), 
    false
  ),
  '{global_stats,last_active}', 
  to_jsonb(last_active), 
  false
)
WHERE fastest_category IS NOT NULL 
   OR highest_score_category IS NOT NULL 
   OR last_active IS NOT NULL;

-- Step 4: Verify migration results
SELECT 
  id,
  username,
  tokens,
  questions_answered,
  correct_answers,
  daily_tokens_earned,
  streak_days,
  hidden_grade_asset #>> '{ai_analytics,analysis_date}' as ai_analysis_date,
  jsonb_pretty(hidden_grade_asset #> '{modules,algebra}') as algebra_module
FROM users 
WHERE hidden_grade_asset IS NOT NULL
LIMIT 5;

-- Performance-Critical Fields Remaining as Separate Columns:
-- - tokens (frequently updated via Socket.IO)
-- - questions_answered (used for leaderboard queries)  
-- - correct_answers (used for leaderboard queries)
-- - daily_tokens_earned (daily reset operations)
-- - streak_days (streak calculations)
-- - daily_engagement_minutes (daily tracking)

COMMIT;
