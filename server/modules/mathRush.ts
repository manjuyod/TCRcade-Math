import { db } from "../db";           // existing Drizzle instance
import { sql } from "drizzle-orm";
import { MATH_RUSH_RULES } from "../../shared/mathRushRules";
import { assessments } from "../../shared/schema";

/**
 * Check if user has taken assessment for a specific Math Rush operator
 * @param userId - User ID
 * @param operator - Math operator (addition, subtraction, multiplication, division)
 * @returns Boolean indicating if test has been taken
 */
export async function checkAssessmentStatus(userId: number, operator: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT hidden_grade_asset #>> '{modules,math_rush,${sql.raw(operator)},progress,test_taken}' as test_taken
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
 */
export async function completeAssessment(userId: number, operator: string, score: number): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE users 
      SET hidden_grade_asset = jsonb_set(
        COALESCE(hidden_grade_asset, '{}'),
        '{modules,math_rush,${sql.raw(operator)},progress,test_taken}',
        'true'
      )
      WHERE id = ${userId}
    `);
    
    console.log(`Assessment completed for user ${userId}, operator ${operator}, score: ${score}`);
  } catch (error) {
    console.error(`Error completing assessment for user ${userId}, operator ${operator}:`, error);
    throw error;
  }
}