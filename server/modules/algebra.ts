import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { ALGEBRA_CONFIG, AlgebraQuestion, QuestionQueryParams } from "@shared/algebraRules";

// Query A - Get user's current algebra progress
export async function getUserAlgebraProgress(userId: number): Promise<{ grade_level: number; lesson: number }> {
  const result = await db.select({
    gradeLevel: sql<number>`(hidden_grade_asset #>> '{modules,algebra,grade_level}')::int`,
    lesson: sql<number>`(hidden_grade_asset #>> '{modules,algebra,progress,lesson}')::int`
  })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

  if (!result.length) {
    throw new Error('User not found');
  }

  const row = result[0];
  return {
    grade_level: row.gradeLevel || ALGEBRA_CONFIG.minGrade,
    lesson: row.lesson || 1
  };
}

// Query B - Practice Run questions (TryIt sections)
export async function getPracticeQuestions(params: QuestionQueryParams): Promise<AlgebraQuestion[]> {
  const result = await db.execute(sql`
    SELECT *
    FROM "questions_algebra"
    WHERE "GradeLevel" = ${params.grade_level}
      AND "Lesson" = ${params.lesson}
      AND "Section" ILIKE '%tryit%'
    ORDER BY id
  `);

  return result.rows as unknown as AlgebraQuestion[];
}

// Query C - Token Run questions (non-TryIt sections)
export async function getTokenQuestions(params: QuestionQueryParams): Promise<AlgebraQuestion[]> {
  const result = await db.execute(sql`
    SELECT *
    FROM "questions_algebra"
    WHERE "GradeLevel" = ${params.grade_level}
      AND "Lesson" = ${params.lesson}
      AND "Section" NOT ILIKE '%tryit%'
      AND "Section" NOT ILIKE '%challenge%'
    ORDER BY id
  `);

  return result.rows as unknown as AlgebraQuestion[];
}

// Query D - Challenge questions for Token Run
export async function getChallengeQuestions(params: QuestionQueryParams): Promise<AlgebraQuestion[]> {
  const result = await db.execute(sql`
    SELECT *
    FROM "questions_algebra"
    WHERE "GradeLevel" = ${params.grade_level}
      AND "Lesson" = ${params.lesson}
      AND "Section" ILIKE '%challenge%'
    ORDER BY id
  `);

  return result.rows as unknown as AlgebraQuestion[];
}

// Update user progress for successful attempts
export async function updateAlgebraProgressSuccess(userId: number): Promise<void> {
  await db.execute(sql`
    UPDATE users
    SET hidden_grade_asset = jsonb_set(
          jsonb_set(hidden_grade_asset,
            '{modules,algebra,progress,attempt_bad}', '0', false),
          '{modules,algebra,progress,attempt_good}',
          (COALESCE((hidden_grade_asset #>> '{modules,algebra,progress,attempt_good}')::int, 0) + 1)::text::jsonb,
          false
        )
    WHERE id = ${userId}
  `);
}

// Update user progress for failed attempts
export async function updateAlgebraProgressFailure(userId: number): Promise<void> {
  await db.execute(sql`
    UPDATE users
    SET hidden_grade_asset = jsonb_set(
          jsonb_set(hidden_grade_asset,
            '{modules,algebra,progress,attempt_good}', '0', false),
          '{modules,algebra,progress,attempt_bad}',
          (COALESCE((hidden_grade_asset #>> '{modules,algebra,progress,attempt_bad}')::int, 0) + 1)::text::jsonb,
          false
        )
    WHERE id = ${userId}
  `);
}

// Check if user should level up/down and update accordingly
export async function checkAndUpdateAlgebraLevel(userId: number): Promise<{ levelChanged: boolean; newLevel?: number; direction?: 'up' | 'down' }> {
  const progress = await getUserAlgebraProgress(userId);
  
  // Get current attempt counts
  const result = await db.select({
    attemptGood: sql<number>`(hidden_grade_asset #>> '{modules,algebra,progress,attempt_good}')::int`,
    attemptBad: sql<number>`(hidden_grade_asset #>> '{modules,algebra,progress,attempt_bad}')::int`
  })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

  if (!result.length) return { levelChanged: false };

  const { attemptGood, attemptBad } = result[0];

  // Check for level up (3 good attempts)
  if (attemptGood >= ALGEBRA_CONFIG.attemptsToLevelChange) {
    const newGrade = progress.grade_level + 1;
    
    // Check if higher grade exists in questions_algebra
    const higherGradeExists = await db.execute(sql`
      SELECT 1 FROM "questions_algebra" 
      WHERE "GradeLevel" = ${newGrade} 
      LIMIT 1
    `);

    if (higherGradeExists.rows.length > 0) {
      await db.execute(sql`
        UPDATE users
        SET hidden_grade_asset = jsonb_set(
              jsonb_set(
                jsonb_set(hidden_grade_asset,
                  '{modules,algebra,grade_level}', ${newGrade}::text::jsonb, false),
                '{modules,algebra,progress,attempt_good}', '0', false),
              '{modules,algebra,progress,attempt_bad}', '0', false
            )
        WHERE id = ${userId}
      `);
      return { levelChanged: true, newLevel: newGrade, direction: 'up' };
    }
  }

  // Check for level down (3 bad attempts)
  if (attemptBad >= ALGEBRA_CONFIG.attemptsToLevelChange) {
    const newGrade = progress.grade_level - 1;
    
    // Check if lower grade exists in questions_algebra
    const lowerGradeExists = await db.execute(sql`
      SELECT 1 FROM "questions_algebra" 
      WHERE "GradeLevel" = ${newGrade} 
      LIMIT 1
    `);

    if (lowerGradeExists.rows.length > 0) {
      await db.execute(sql`
        UPDATE users
        SET hidden_grade_asset = jsonb_set(
              jsonb_set(
                jsonb_set(hidden_grade_asset,
                  '{modules,algebra,grade_level}', ${newGrade}::text::jsonb, false),
                '{modules,algebra,progress,attempt_good}', '0', false),
              '{modules,algebra,progress,attempt_bad}', '0', false
            )
        WHERE id = ${userId}
      `);
      return { levelChanged: true, newLevel: newGrade, direction: 'down' };
    }
  }

  return { levelChanged: false };
}

// Utility function to sample random questions
export function sampleQuestions<T>(questions: T[], count: number): T[] {
  if (questions.length <= count) {
    return [...questions];
  }
  
  const sampled: T[] = [];
  const available = [...questions];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    sampled.push(available.splice(randomIndex, 1)[0]);
  }
  
  return sampled;
}