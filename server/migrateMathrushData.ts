/**
 * Migration script to convert existing math_rush data to new structure
 */
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { getAutoSkipTypes } from './modules/mathRushProgression';

interface OldMathRushData {
  progress?: {
    lesson?: any;
    concepts?: string[];
    test_taken?: boolean;
    mastery_level?: boolean;
    best_time?: number;
    timestamp?: string;
    best_score?: number;
    attempt_bad?: number;
    last_played?: string;
    streak_best?: number;
    attempt_good?: number;
    tokens_earned?: number;
    streak_current?: number;
    correct_answers?: number;
    time_spent_total?: number;
    sessions_completed?: number;
    preferred_difficulty?: number;
    total_questions_answered?: number;
  };
}

interface NewMathRushData {
  progress: {
    lesson: null;
    concepts: string[];
    test_taken: boolean;
    mastery_level: boolean;
    types_complete: string[];
    good_attempt: number;
    bad_attempt: number;
    current_step: number;
    best_time: number | null;
    timestamp: string | null;
    best_score: number;
    attempt_bad: number;
    last_played: string | null;
    streak_best: number;
    attempt_good: number;
    tokens_earned: number;
    streak_current: number;
    correct_answers: number;
    time_spent_total: number;
    sessions_completed: number;
    preferred_difficulty: number;
    total_questions_answered: number;
  };
}

export async function migrateMathRushData() {
  console.log('Starting Math Rush data migration...');
  
  try {
    // Get all users with hidden_grade_asset data
    const allUsers = await db.select().from(users);
    
    let migratedCount = 0;
    
    for (const user of allUsers) {
      let hiddenGradeAsset = user.hiddenGradeAsset as any;
      
      if (!hiddenGradeAsset) {
        hiddenGradeAsset = { modules: {} };
      }
      
      if (!hiddenGradeAsset.modules) {
        hiddenGradeAsset.modules = {};
      }
      
      let needsUpdate = false;
      
      // Check if old math_rush data exists
      if (hiddenGradeAsset.modules.math_rush) {
        const oldData = hiddenGradeAsset.modules.math_rush as OldMathRushData;
        
        // Migrate to math_rush_addition
        const newAdditionData: NewMathRushData = {
          progress: {
            lesson: null,
            concepts: ["addition", "speed", "memorization"],
            test_taken: oldData.progress?.test_taken || false,
            mastery_level: oldData.progress?.mastery_level || false,
            types_complete: getAutoSkipTypes('addition', user.grade || '3'),
            good_attempt: oldData.progress?.attempt_good || 0,
            bad_attempt: oldData.progress?.attempt_bad || 0,
            current_step: 0,
            best_time: oldData.progress?.best_time || null,
            timestamp: oldData.progress?.timestamp || null,
            best_score: oldData.progress?.best_score || 0,
            attempt_bad: oldData.progress?.attempt_bad || 0,
            last_played: oldData.progress?.last_played || null,
            streak_best: oldData.progress?.streak_best || 0,
            attempt_good: oldData.progress?.attempt_good || 0,
            tokens_earned: oldData.progress?.tokens_earned || 0,
            streak_current: oldData.progress?.streak_current || 0,
            correct_answers: oldData.progress?.correct_answers || 0,
            time_spent_total: oldData.progress?.time_spent_total || 0,
            sessions_completed: oldData.progress?.sessions_completed || 0,
            preferred_difficulty: oldData.progress?.preferred_difficulty || 2,
            total_questions_answered: oldData.progress?.total_questions_answered || 0,
          }
        };
        
        hiddenGradeAsset.modules.math_rush_addition = newAdditionData;
        
        // Remove old math_rush data
        delete hiddenGradeAsset.modules.math_rush;
        needsUpdate = true;
      }
      
      // Initialize other operators if they don't exist
      const operators = ['subtraction', 'multiplication', 'division'];
      for (const operator of operators) {
        const moduleKey = `math_rush_${operator}`;
        if (!hiddenGradeAsset.modules[moduleKey]) {
          const autoSkipTypes = getAutoSkipTypes(operator, user.grade || '3');
          
          hiddenGradeAsset.modules[moduleKey] = {
            progress: {
              lesson: null,
              concepts: [operator, "speed", "memorization"],
              test_taken: false,
              mastery_level: false,
              types_complete: autoSkipTypes,
              good_attempt: 0,
              bad_attempt: 0,
              current_step: 0,
              best_time: null,
              timestamp: null,
              best_score: 0,
              attempt_bad: 0,
              last_played: null,
              streak_best: 0,
              attempt_good: 0,
              tokens_earned: 0,
              streak_current: 0,
              correct_answers: 0,
              time_spent_total: 0,
              sessions_completed: 0,
              preferred_difficulty: 2,
              total_questions_answered: 0,
            }
          };
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await db
          .update(users)
          .set({ hiddenGradeAsset })
          .where(eq(users.id, user.id));
        
        migratedCount++;
        console.log(`Migrated user ${user.id} (${user.username})`);
      }
    }
    
    console.log(`Migration complete. Updated ${migratedCount} users.`);
    return { success: true, migratedCount };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
}