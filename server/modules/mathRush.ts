import { db } from "../db";           // existing Drizzle instance
import { sql, eq } from "drizzle-orm";
import { MATH_RUSH_RULES } from "../../shared/mathRushRules";
import { assessments, users } from "../../shared/schema";
import { 
  getProgressionForOperator, 
  getAutoSkipTypes, 
  getCurrentProgressionStep,
  isProgressionComplete,
  getNextFactType
} from "./mathRushProgression";

/**
 * Store tokens locally and mirror to hidden_grade_asset for Math Rush assessments
 * Awards 1 token per 3 correct answers with instant UI updates
 */
export async function storeMicroTokens(userId: number, operator: string, correctAnswers: number): Promise<{ tokensEarned: number, shouldUpdate: boolean }> {
  // Calculate tokens: 1 token per 3 correct answers
  const tokensEarned = Math.floor(correctAnswers / 3);
  const shouldUpdate = tokensEarned > 0;

  if (!shouldUpdate) {
    return { tokensEarned: 0, shouldUpdate: false };
  }

  try {
    // Update both users.tokens and hidden_grade_asset simultaneously
    const moduleKey = `math_rush_${operator}`;
    
    await db.execute(sql`
      UPDATE users 
      SET 
        tokens = COALESCE(tokens, 0) + ${tokensEarned},
        hidden_grade_asset = jsonb_set(
          COALESCE(hidden_grade_asset, '{}'),
          '{modules,${sql.raw(moduleKey)},progress,tokens_earned}',
          to_jsonb(COALESCE((hidden_grade_asset #> '{modules,${sql.raw(moduleKey)},progress,tokens_earned}')::integer, 0) + ${tokensEarned})
        )
      WHERE id = ${userId}
    `);

    console.log(`Micro-token update: User ${userId} earned ${tokensEarned} tokens for ${correctAnswers} correct answers in ${operator}`);
    return { tokensEarned, shouldUpdate: true };
  } catch (error) {
    console.error('Error storing micro tokens:', error);
    return { tokensEarned: 0, shouldUpdate: false };
  }
}

/**
 * Check if user has taken assessment for a specific Math Rush operator
 * @param userId - User ID
 * @param operator - Math operator (addition, subtraction, multiplication, division)
 * @returns Boolean indicating if test has been taken
 */
export async function checkAssessmentStatus(userId: number, operator: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT hidden_grade_asset #>> '{modules,math_rush_${sql.raw(operator)},progress,test_taken}' as test_taken
      FROM users 
      WHERE id = ${userId}
    `);

    const testTaken = result.rows?.[0]?.test_taken;
    return testTaken === 'true' || testTaken === true;
  } catch (error) {
    console.error(`Error checking assessment status for user ${userId}, operator ${operator}:`, error);
    return false;
  }
}

/**
 * Check mastery level for a specific Math Rush operator
 */
export async function checkMasteryLevel(userId: number, operator: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT hidden_grade_asset #>> '{modules,math_rush_${sql.raw(operator)},progress,mastery_level}' as mastery_level
      FROM users 
      WHERE id = ${userId}
    `);

    return result.rows[0]?.mastery_level === 'true';
  } catch (error) {
    console.error('Error checking mastery level:', error);
    return false;
  }
}

/**
 * Get user's progression data for a specific operator
 */
export async function getUserProgressionData(userId: number, operator: string) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('User not found');

    const hiddenGradeAsset = user.hiddenGradeAsset as any;
    const moduleKey = `math_rush_${operator}`;
    const moduleData = hiddenGradeAsset?.modules?.[moduleKey];

    if (!moduleData) {
      return {
        test_taken: false,
        mastery_level: false,
        types_complete: getAutoSkipTypes(operator, user.grade || '3'),
        good_attempt: 0,
        bad_attempt: 0,
        current_step: 0
      };
    }

    return moduleData.progress;
  } catch (error) {
    console.error('Error getting user progression data:', error);
    throw error;
  }
}

/**
 * Update user's progression data for a specific operator
 */
export async function updateUserProgressionData(userId: number, operator: string, updates: any) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('User not found');

    let hiddenGradeAsset = user.hiddenGradeAsset as any;
    if (!hiddenGradeAsset) hiddenGradeAsset = { modules: {} };
    if (!hiddenGradeAsset.modules) hiddenGradeAsset.modules = {};

    const moduleKey = `math_rush_${operator}`;
    if (!hiddenGradeAsset.modules[moduleKey]) {
      hiddenGradeAsset.modules[moduleKey] = {
        progress: {
          lesson: null,
          concepts: [operator, "speed", "memorization"],
          test_taken: false,
          mastery_level: false,
          types_complete: getAutoSkipTypes(operator, user.grade || '3'),
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
    }

    // Apply updates
    Object.assign(hiddenGradeAsset.modules[moduleKey].progress, updates);

    await db
      .update(users)
      .set({ hiddenGradeAsset })
      .where(eq(users.id, userId));

    return hiddenGradeAsset.modules[moduleKey].progress;
  } catch (error) {
    console.error('Error updating user progression data:', error);
    throw error;
  }
}

/**
 * Get assessment questions for a specific operator
 * @param operator - Math operator (addition, subtraction, multiplication, division)
 * @param userGrade - User's grade level (for multiplication/division)
 * @returns Array of assessment questions
 */
export async function getAssessmentQuestions(operator: string, userGrade?: string): Promise<any[]> {
  try {
    let query;

    if (operator === 'addition') {
      query = sql`
        SELECT id, int1, int2, int3 
        FROM assessments 
        WHERE module = 'math_rush' AND properties->>'facts_type' = 'addition'
        ORDER BY random()
        LIMIT 24
      `;
    } else if (operator === 'subtraction') {
      query = sql`
        SELECT id, int1, int2, int3 
        FROM assessments 
        WHERE module = 'math_rush' AND properties->>'facts_type' = 'subtraction'
        ORDER BY random()
        LIMIT 24
      `;
    } else if (operator === 'multiplication') {
      // Convert grade to numeric for grade-based filtering
      const gradeMap: Record<string, number> = {"K": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12};
      const gradeLevel = gradeMap[userGrade || "3"] || 3;

      query = sql`
        SELECT id, int1, int2, int3 
        FROM assessments 
        WHERE properties->'grade_level' @> to_jsonb(${gradeLevel}) 
        AND properties->>'facts_type' = 'multiplication'
        ORDER BY random()
        LIMIT 24
      `;
    } else if (operator === 'division') {
      // Convert grade to numeric for grade-based filtering
      const gradeMap: Record<string, number> = {"K": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12};
      const gradeLevel = gradeMap[userGrade || "3"] || 3;

      query = sql`
        SELECT id, int1, int2, int3 
        FROM assessments 
        WHERE properties->'grade_level' @> to_jsonb(${gradeLevel}) 
        AND properties->>'facts_type' = 'division'
        ORDER BY random()
        LIMIT 24
      `;
    } else {
      return [];
    }

    const result = await db.execute(query);
    return result.rows || [];
  } catch (error) {
    console.error(`Error fetching assessment questions for ${operator}:`, error);
    return [];
  }
}

/**
 * Get available question types for a given operation
 * @param operation - The math operation (addition, subtraction, etc.)
 * @returns Array of available question types
 */
export async function getQuestionTypes(operation: string): Promise<string[]> {
  // Determine which table to query based on the operation
  const table = operation === "addition" || operation === "subtraction"
    ? "questions_addition"
    : "questions_multiplication";

  console.log(`Getting question types for operation '${operation}' from table '${table}'`);

  try {
    // Query the database for distinct types
    const query = sql`
      SELECT DISTINCT type FROM ${sql.raw(table)}
      WHERE type IS NOT NULL
      ORDER BY type;
    `;

    const result = await db.execute(query);
    console.log("Database query result for types:", result.rows);

    // Extract types from the result and ensure they're strings
    const types = (result.rows?.map(row => String(row.type)) || []) as string[];
    console.log(`Found ${types.length} types:`, types);

    return types;
  } catch (error) {
    console.error(`Error fetching question types for ${operation}:`, error);
    return [];
  }
}

export async function getRushQuestions(
  mode: typeof MATH_RUSH_RULES.modes[number],
  type?: string,
  operator?: string
) {
  try {
    console.log(`Getting questions for mode: ${mode}, type: ${type || 'any'}`);

    if (mode === "mixed") {
      // For mixed mode, we need to get a mix of questions from both tables

      // Get questions from questions_addition (for addition and subtraction)
      const additionResult = await db.execute(sql`
        SELECT id, 'addition' as mode, int1, int2, int3, type
        FROM questions_addition
        ORDER BY random()
        LIMIT ${Math.ceil(MATH_RUSH_RULES.questionCount / 4)};
      `);

      const subtractionResult = await db.execute(sql`
        SELECT id, 'subtraction' as mode, int1, int2, int3, type
        FROM questions_addition
        ORDER BY random()
        LIMIT ${Math.ceil(MATH_RUSH_RULES.questionCount / 4)};
      `);

      // Get questions from questions_multiplication (for multiplication and division)
      const multiplicationResult = await db.execute(sql`
        SELECT id, 'multiplication' as mode, int1, int2, int3, type
        FROM questions_multiplication
        ORDER BY random()
        LIMIT ${Math.ceil(MATH_RUSH_RULES.questionCount / 4)};
      `);

      const divisionResult = await db.execute(sql`
        SELECT id, 'division' as mode, int1, int2, int3, type
        FROM questions_multiplication
        ORDER BY random()
        LIMIT ${Math.ceil(MATH_RUSH_RULES.questionCount / 4)};
      `);

      // Convert results to arrays
      const additionQuestions = additionResult.rows || [];
      const subtractionQuestions = subtractionResult.rows || [];
      const multiplicationQuestions = multiplicationResult.rows || [];
      const divisionQuestions = divisionResult.rows || [];

      // Combine all questions
      const combinedQuestions = [
        ...additionQuestions,
        ...subtractionQuestions,
        ...multiplicationQuestions,
        ...divisionQuestions
      ];

      // Shuffle the array to mix the question types
      for (let i = combinedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combinedQuestions[i], combinedQuestions[j]] = [combinedQuestions[j], combinedQuestions[i]];
      }

      // Format questions for client use
      const formattedQuestions = combinedQuestions.slice(0, MATH_RUSH_RULES.questionCount).map(q => {
        // Format based on operation
        const question = formatMathRushQuestion(q);
        return question;
      });

      console.log(`Returning ${formattedQuestions.length} mixed questions`);
      return formattedQuestions;
    } else {
      const table = mode === "addition" || mode === "subtraction"
        ? "questions_addition"
        : "questions_multiplication";

      // Build the query based on whether a type filter is provided
      let query;

      if (type) {
        query = sql`
          SELECT id, int1, int2, int3, type
          FROM ${sql.raw(table)}
          WHERE type = ${type}
          ORDER BY random()
          LIMIT ${MATH_RUSH_RULES.questionCount};
        `;
      } else {
        query = sql`
          SELECT id, int1, int2, int3, type
          FROM ${sql.raw(table)}
          ORDER BY random()
          LIMIT ${MATH_RUSH_RULES.questionCount};
        `;
      }

      const result = await db.execute(query);
      console.log(`Database query returned ${result.rows?.length || 0} rows`);

      // Format questions for client use
      const formattedQuestions = (result.rows || []).map(q => {
        return formatMathRushQuestion({...q, mode});
      });

      console.log(`Returning ${formattedQuestions.length} ${mode} questions`);
      return formattedQuestions;
    }
  } catch (error) {
    console.error('Error in getRushQuestions:', error);
    // Return some default questions if database fails
    return [];
  }

  /**
   * Format a database row into a proper question object for the client
   */
  function formatMathRushQuestion(q: any) {
    const { id, mode: operation = mode, int1, int2, int3, type } = q;
    let questionText = '';
    let answer = '';
    let options = [];

    if (operation === 'addition') {
      questionText = `${int1} + ${int2} = ?`;
      answer = String(int1 + int2);
    } else if (operation === 'subtraction') {
      questionText = `${int1 + int2} - ${int1} = ?`;
      answer = String(int2);
    } else if (operation === 'multiplication') {
      questionText = `${int1} × ${int2} = ?`;
      answer = String(int1 * int2);
    } else if (operation === 'division') {
      const dividend = int1 * int2;
      questionText = `${dividend} ÷ ${int1} = ?`;
      answer = String(int2);
    }

    // Generate options (including the correct answer)
    const answerNum = parseInt(answer);
    options = [
      String(answerNum - 2),
      String(answerNum - 1),
      answer,
      String(answerNum + 1)
    ].sort(() => Math.random() - 0.5);

    return {
      id,
      question: questionText,
      answer,
      options,
      type: type || operation,
      operation,
    };
  }
}

/**
 * Calculate token rewards for completed Math Rush session
 */
export function calculateRushTokens(correct: number, total: number, durationSec: number) {
  // Determine which time setting to use
  const setting =
    durationSec <= MATH_RUSH_RULES.timeSettings.SHORT.sec
      ? MATH_RUSH_RULES.timeSettings.SHORT
      : MATH_RUSH_RULES.timeSettings.LONG;

  // Calculate tokens based on correct answers (3 tokens per 5 correct for SHORT, 2 per 5 for LONG)
  const baseTokens = Math.floor(correct / 5) * setting.tokensPer5;

  // Give perfect bonus if the player had perfect accuracy
  // This means they didn't miss any questions they attempted
  const isPerfect = (correct === total && correct > 0);

  const perfectBonus = isPerfect ? setting.bonusPerfect : 0;

  console.log(`Token calculation: ${correct}/${total} correct, ${baseTokens} base tokens, isPerfect: ${isPerfect}, bonus: ${perfectBonus}`);

  return baseTokens + perfectBonus;
}

/**
 * Mark assessment as complete for a specific Math Rush operator
 * @param userId - User ID
 * @param operator - Math operator (addition, subtraction, multiplication, division)
 * @param score - Assessment score (0-100)
 * @param assessmentAnswers - Array of user answers with question types for analysis
 */
export async function completeAssessment(userId: number, operator: string, score: number, assessmentAnswers?: any[]): Promise<void> {
  try {
    // Get user's current grade for progression logic
    const userResult = await db.execute(sql`
      SELECT grade, hidden_grade_asset FROM users WHERE id = ${userId}
    `);

    const user = userResult.rows?.[0] as any;
    const userGrade = String(user?.grade || "3");
    const gradeLevel = parseInt(userGrade.replace(/[^\d]/g, '')) || 3;

    // Mastery level will be determined after assessment analysis based on progression completion
    let masteryLevel = false;

    // Calculate auto-skip progression for multiplication and division
    let autoSkipSteps = 0;
    if (operator === 'multiplication' && gradeLevel > 5) {
      autoSkipSteps = 3; // Skip steps 0, 1, 2
    } else if (operator === 'division' && gradeLevel > 5) {
      autoSkipSteps = 1; // Skip step 0
    }

    // Get the appropriate auto-skip types for this operator and grade
    const autoSkipTypes = getAutoSkipTypes(operator, userGrade);

    // Start with auto-skip types
    const typesComplete = [...autoSkipTypes];

    // Analyze question-by-question performance if assessment answers provided
    if (assessmentAnswers && assessmentAnswers.length > 0) {
      console.log(`Analyzing ${assessmentAnswers.length} assessment answers for ${operator}`);
        
        // Debug: Log all question types found in assessment
        const allQuestionTypes = new Set();
        assessmentAnswers.forEach(answer => {
          if (answer.questionType) allQuestionTypes.add(answer.questionType);
        });
        console.log(`All question types found in assessment:`, Array.from(allQuestionTypes));

      try {
        // Extract question IDs from answers
        const correctQuestionIds = assessmentAnswers
          .filter(answer => answer.isCorrect)
          .map(answer => answer.questionId)
          .filter(id => id != null);

        const incorrectQuestionIds = assessmentAnswers
          .filter(answer => !answer.isCorrect)
          .map(answer => answer.questionId)
          .filter(id => id != null);

        console.log(`Correct question IDs (${correctQuestionIds.length}):`, correctQuestionIds);
        console.log(`Incorrect question IDs (${incorrectQuestionIds.length}):`, incorrectQuestionIds);

        // Get question types for correct answers (types to potentially mark complete)
        let typesToIgnore: string[] = [];
        if (correctQuestionIds.length > 0) {
          const correctIdsCommaSeparated = correctQuestionIds.join(',');
          const correctTypesResult = await db.execute(sql`
            SELECT array_agg(DISTINCT elem) AS types 
            FROM assessments 
            CROSS JOIN LATERAL jsonb_array_elements_text(properties->'type') AS t(elem) 
            WHERE id IN (${sql.raw(correctIdsCommaSeparated)})
          `);
          const resultTypes = correctTypesResult.rows?.[0]?.types;
          typesToIgnore = Array.isArray(resultTypes) ? resultTypes : [];
        }

        // Get question types for incorrect answers (types to target for remediation)
        let typesToTarget: string[] = [];
        if (incorrectQuestionIds.length > 0) {
          const incorrectIdsCommaSeparated = incorrectQuestionIds.join(',');
          const incorrectTypesResult = await db.execute(sql`
            SELECT array_agg(DISTINCT elem) AS types 
            FROM assessments 
            CROSS JOIN LATERAL jsonb_array_elements_text(properties->'type') AS t(elem) 
            WHERE id IN (${sql.raw(incorrectIdsCommaSeparated)})
          `);
          const resultTypes = incorrectTypesResult.rows?.[0]?.types;
          typesToTarget = Array.isArray(resultTypes) ? resultTypes : [];
        }

        console.log(`Types from correct answers (to ignore):`, typesToIgnore);
        console.log(`Types from incorrect answers (to target):`, typesToTarget);

        // Apply precedence rule: Types to target (incorrect) trumps types to ignore (correct)
        // Only mark types as complete if they appear in correct answers AND NOT in incorrect answers
        const typesToMarkComplete = typesToIgnore.filter(type => !typesToTarget.includes(type));

        console.log(`Types to mark complete (mastered):`, typesToMarkComplete);

        // Add mastered types to typesComplete array (ONLY types that were actually mastered)
        typesToMarkComplete.forEach(type => {
          if (!typesComplete.includes(type)) {
            typesComplete.push(type);
            console.log(`Marking type "${type}" as complete due to mastery (no incorrect answers)`);
          }
        });

        console.log(`Final mastered types from assessment analysis:`, typesToMarkComplete);
        console.log(`Types complete before any auto-progression:`, typesComplete);

      } catch (error) {
        console.error(`Error analyzing assessment answers for ${operator}:`, error);
        // Fall back to simple analysis if database queries fail
        console.log('Falling back to simple assessment analysis - no auto-completion of types');
      }
    }
    // Removed fallback logic that auto-completed progression steps
    // Assessment should only mark types as complete based on actual question performance

    console.log(`Auto-skip types for ${operator}, grade ${userGrade}:`, autoSkipTypes);
    console.log(`Final types complete after assessment for ${operator}:`, typesComplete);

    // Calculate mastery based on progression completion (not just score)
    masteryLevel = isProgressionComplete(operator, typesComplete, userGrade);
    console.log(`Assessment completed for user ${userId}, operator ${operator}, score: ${score}`);
    console.log(`Mastery level: ${masteryLevel}, Auto-skip steps: ${autoSkipSteps}`);

    // Get current module progress to increment counters
    const currentProgress = await db.execute(sql`
      SELECT hidden_grade_asset #> '{modules,math_rush_${sql.raw(operator)},progress}' as progress
      FROM users 
      WHERE id = ${userId}
    `);

    const existingProgress = currentProgress.rows?.[0]?.progress || {};
    const currentTokens = existingProgress.tokens_earned || 0;
    const currentQuestions = existingProgress.total_questions_answered || 0;
    const currentCorrect = existingProgress.correct_answers || 0;

    // Calculate new totals (24 questions total in assessment, score is percentage)
    const questionsAnswered = 24;
    const correctAnswers = Math.round(24 * (score / 100));
    const tokensEarned = masteryLevel ? 50 : 0; // Award tokens for completing assessment

    // Update the module progression in hidden_grade_asset with all progress data
    await db.execute(sql`
      UPDATE users 
      SET hidden_grade_asset = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    COALESCE(hidden_grade_asset, '{}'),
                    '{modules,math_rush_${sql.raw(operator)},progress,test_taken}',
                    'true'::jsonb
                  ),
                  '{modules,math_rush_${sql.raw(operator)},progress,mastery_level}',
                  to_jsonb(${masteryLevel}::boolean)
                ),
                '{modules,math_rush_${sql.raw(operator)},progress,current_step}',
                to_jsonb(${autoSkipSteps}::integer)
              ),
              '{modules,math_rush_${sql.raw(operator)},progress,types_complete}',
              ${JSON.stringify(typesComplete)}::jsonb
            ),
            '{modules,math_rush_${sql.raw(operator)},progress,tokens_earned}',
            to_jsonb(${currentTokens + tokensEarned}::integer)
          ),
          '{modules,math_rush_${sql.raw(operator)},progress,total_questions_answered}',
          to_jsonb(${currentQuestions + questionsAnswered}::integer)
        ),
        '{modules,math_rush_${sql.raw(operator)},progress,correct_answers}',
        to_jsonb(${currentCorrect + correctAnswers}::integer)
      )
      WHERE id = ${userId}
    `);

    // Also update the user's global tokens
    if (tokensEarned > 0) {
      await db.execute(sql`
        UPDATE users 
        SET tokens = COALESCE(tokens, 0) + ${tokensEarned},
            questions_answered = COALESCE(questions_answered, 0) + ${questionsAnswered},
            correct_answers = COALESCE(correct_answers, 0) + ${correctAnswers}
        WHERE id = ${userId}
      `);
    }

    // Record module history for this assessment completion
    await db.execute(sql`
      INSERT INTO module_history (
        user_id, 
        module_name, 
        run_type,
        grade_level,
        questions_total, 
        questions_correct, 
        time_spent_seconds,
        final_score,
        tokens_earned,
        difficulty_level,
        properties,
        completed_at
      ) VALUES (
        ${userId},
        ${'math_rush_' + operator},
        'test',
        ${userGrade},
        24,
        ${Math.round(24 * (score / 100))},
        60,
        ${score},
        ${tokensEarned},
        3,
        ${JSON.stringify({
          type: 'assessment',
          operator: operator,
          score: score,
          mastery_level: masteryLevel,
          auto_skip_steps: autoSkipSteps,
          tokens_awarded: tokensEarned
        })},
        NOW()
      )
    `);

    console.log(`Assessment completed for user ${userId}, operator ${operator}, score: ${score}`);
    console.log(`Mastery level: ${masteryLevel}, Auto-skip steps: ${autoSkipSteps}`);
  } catch (error) {
    console.error(`Error completing assessment for user ${userId}, operator ${operator}:`, error);
    throw error;
  }
}