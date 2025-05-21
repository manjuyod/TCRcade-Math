import { db } from "./db";           // existing Drizzle instance
import { sql } from "drizzle-orm";
import { MATH_RUSH_RULES } from "../shared/mathRushRules";

export async function getRushQuestions(
  mode: typeof MATH_RUSH_RULES.modes[number],
  type?: string
) {
  if (mode === "mixed") {
    // For mixed mode, we need to get a mix of questions from both tables
    
    // Get questions from questions_addition (for addition and subtraction)
    const additionResult = await db.execute(sql`
      SELECT id, 'addition' as type, int1, int2, int3
      FROM questions_addition
      ORDER BY random()
      LIMIT ${Math.ceil(MATH_RUSH_RULES.questionCount / 4)};
    `);
    
    const subtractionResult = await db.execute(sql`
      SELECT id, 'subtraction' as type, int1, int2, int3
      FROM questions_addition
      ORDER BY random()
      LIMIT ${Math.ceil(MATH_RUSH_RULES.questionCount / 4)};
    `);
    
    // Get questions from questions_multiplication (for multiplication and division)
    const multiplicationResult = await db.execute(sql`
      SELECT id, 'multiplication' as type, int1, int2, int3
      FROM questions_multiplication
      ORDER BY random()
      LIMIT ${Math.ceil(MATH_RUSH_RULES.questionCount / 4)};
    `);
    
    const divisionResult = await db.execute(sql`
      SELECT id, 'division' as type, int1, int2, int3
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
    
    // Trim to exact question count
    return combinedQuestions.slice(0, MATH_RUSH_RULES.questionCount);
  } else {
    const table = mode === "addition" || mode === "subtraction"
      ? "questions_addition"
      : "questions_multiplication";
    
    const result = await db.execute(sql`
      SELECT id, ${sql.raw(mode)} as type, int1, int2, int3
      FROM ${sql.raw(table)}
      ORDER BY random()
      LIMIT ${MATH_RUSH_RULES.questionCount};
    `);
    
    return result.rows || [];
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
  
  // Add perfect bonus if all answers are correct
  const perfectBonus = (correct === total) ? setting.bonusPerfect : 0;
  
  return baseTokens + perfectBonus;
}