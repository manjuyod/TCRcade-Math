import { db } from '../db';
import { users } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { MEASUREMENT_CONFIG, MeasurementQuestion, MeasurementUserData, MeasurementSessionResult, MeasurementRunType } from '../../shared/measurementRules';

export interface MeasurementProgressResult {
  grade_level: number;
  lesson: number;
}

export interface QuestionQueryParams {
  grade_level: number;
  lesson: number;
  section_filter: string;
}

// Helper function to process question answers for free response questions
function processQuestionAnswers(questions: MeasurementQuestion[]): MeasurementQuestion[] {
  return questions.map(question => {
    if (question.Type === 'FR' && typeof question.CorrectAnswer === 'string') {
      // Convert single string answers to arrays for free response questions
      // Handle common separators: commas, semicolons, "or", "and"
      const answer = question.CorrectAnswer;
      if (answer.includes(',') || answer.includes(';') || answer.includes(' or ') || answer.includes(' and ')) {
        const possibleAnswers = answer
          .split(/[,;]|\s+or\s+|\s+and\s+/i)
          .map(a => a.trim())
          .filter(a => a.length > 0);
        
        question.CorrectAnswer = possibleAnswers.length > 1 ? possibleAnswers : answer;
      }
    }
    return question;
  });
}

// Query A - Get user measurement progress & grade
export async function getUserMeasurementProgress(userId: number): Promise<MeasurementProgressResult> {
  const result = await db.select({
    gradeLevel: sql<number>`(hidden_grade_asset #>> '{modules,measurement,grade_level}')::int`,
    lesson: sql<number>`(hidden_grade_asset #>> '{modules,measurement,progress,lesson}')::int`
  })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

  if (!result.length) {
    throw new Error('User not found');
  }

  const row = result[0];
  return {
    grade_level: row.gradeLevel || MEASUREMENT_CONFIG.minGrade,
    lesson: row.lesson || 1
  };
}

// Query B - Practice Run questions (TryIt sections)
export async function getPracticeQuestions(params: QuestionQueryParams): Promise<MeasurementQuestion[]> {
  const result = await db.execute(sql`
    SELECT *
    FROM "questions_measurementAndData"
    WHERE "GradeLevel" = ${params.grade_level}
      AND "Lesson" = ${params.lesson}
      AND "Section" ILIKE '%tryit%'
    ORDER BY id
  `);

  return result.rows as unknown as MeasurementQuestion[];
}

// Query C - Token Run questions (non-TryIt sections)
export async function getTokenQuestions(params: QuestionQueryParams): Promise<MeasurementQuestion[]> {
  const result = await db.execute(sql`
    SELECT *
    FROM "questions_measurementAndData"
    WHERE "GradeLevel" = ${params.grade_level}
      AND "Lesson" = ${params.lesson}
      AND "Section" NOT ILIKE '%tryit%'
    ORDER BY 
      CASE WHEN "Section" ILIKE '%challenge%' THEN 1 ELSE 0 END DESC,
      id
  `);

  return result.rows as unknown as MeasurementQuestion[];
}

// Preload 5 questions with specific rules
export async function preloadMeasurementQuestions(
  userId: number, 
  runType: MeasurementRunType
): Promise<MeasurementQuestion[]> {
  const progress = await getUserMeasurementProgress(userId);
  const params = {
    grade_level: progress.grade_level,
    lesson: progress.lesson,
    section_filter: runType === 'practice' ? 'tryit' : 'non-tryit'
  };

  let questions: MeasurementQuestion[] = [];

  if (runType === 'practice') {
    questions = await getPracticeQuestions(params);
  } else {
    questions = await getTokenQuestions(params);
  }

  // Ensure we have exactly 5 questions
  const questionPool: MeasurementQuestion[] = [];

  if (runType === 'token' && questions.length > 0) {
    // For token run, ensure challenge question is in slot 5 if available
    const challengeQuestions = questions.filter(q => q.Section.toLowerCase().includes('challenge'));
    const regularQuestions = questions.filter(q => !q.Section.toLowerCase().includes('challenge'));

    // Add regular questions first
    questionPool.push(...regularQuestions.slice(0, 4));

    // Add challenge question in slot 5 if available
    if (challengeQuestions.length > 0) {
      questionPool.push(challengeQuestions[0]);
    } else if (regularQuestions.length > 4) {
      questionPool.push(regularQuestions[4]);
    }
  } else {
    questionPool.push(...questions);
  }

  // If we have fewer than 5 questions, pad with TryIt questions
  if (questionPool.length < MEASUREMENT_CONFIG.questionsPerSession) {
    const tryItQuestions = await getPracticeQuestions(params);
    const remainingSlots = MEASUREMENT_CONFIG.questionsPerSession - questionPool.length;
    
    for (let i = 0; i < remainingSlots && i < tryItQuestions.length; i++) {
      // Avoid duplicates
      if (!questionPool.find(q => q.id === tryItQuestions[i].id)) {
        questionPool.push(tryItQuestions[i]);
      }
    }
  }

  return questionPool.slice(0, MEASUREMENT_CONFIG.questionsPerSession);
}

// Validate answer for measurement question
export function validateMeasurementAnswer(question: MeasurementQuestion, userAnswer: string): boolean {
  const correctAnswer = question.CorrectAnswer.trim().toLowerCase();
  const cleanUserAnswer = userAnswer.trim().toLowerCase();
  
  return cleanUserAnswer === correctAnswer;
}

// Calculate session results and determine level changes
export async function calculateSessionResults(
  userId: number,
  answers: { questionId: number; userAnswer: string; isCorrect: boolean }[],
  questions: MeasurementQuestion[]
): Promise<MeasurementSessionResult> {
  const correct = answers.filter(a => a.isCorrect).length;
  const total = answers.length;
  const score = Math.round((correct / total) * 100);
  
  let tokensEarned = 0;
  if (score >= MEASUREMENT_CONFIG.passingScore) {
    tokensEarned = score === 100 ? MEASUREMENT_CONFIG.tokens.perfect : MEASUREMENT_CONFIG.tokens.passing;
  }

  // Get current user data
  const userResult = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userResult.length) {
    throw new Error('User not found');
  }

  const user = userResult[0];
  const hiddenAsset = user.hiddenGradeAsset as any;
  const measurementData: MeasurementUserData = hiddenAsset?.modules?.measurement || {
    grade_level: MEASUREMENT_CONFIG.minGrade,
    progress: {
      lesson: 1,
      attempt_good: 0,
      attempt_bad: 0,
      best_score: 0,
      best_time: null,
      test_taken: false,
      last_played: null,
      mastery_level: false,
      tokens_earned: 0,
      correct_answers: 0,
      sessions_completed: 0,
      total_questions_answered: 0
    }
  };

  // Update attempt counters based on score
  let levelChanged = false;
  let newLevel = measurementData.grade_level;
  let levelDirection: 'up' | 'down' | undefined;

  if (score >= MEASUREMENT_CONFIG.passingScore) {
    measurementData.progress.attempt_bad = 0;
    measurementData.progress.attempt_good += 1;

    // Check for level up
    if (measurementData.progress.attempt_good >= MEASUREMENT_CONFIG.attempts.levelUpThreshold) {
      if (measurementData.grade_level < MEASUREMENT_CONFIG.maxGrade) {
        // Check if questions exist for next grade
        const nextGradeQuestions = await db.execute(
          sql`SELECT COUNT(*) as count
              FROM "questions_measurementAndData"
              WHERE "GradeLevel" = ${measurementData.grade_level + 1}`
        );

        if ((nextGradeQuestions.rows[0] as any).count > 0) {
          measurementData.grade_level += 1;
          measurementData.progress.attempt_good = 0;
          measurementData.progress.attempt_bad = 0;
          levelChanged = true;
          newLevel = measurementData.grade_level;
          levelDirection = 'up';
        }
      }
    }
  } else {
    measurementData.progress.attempt_good = 0;
    measurementData.progress.attempt_bad += 1;

    // Check for level down
    if (measurementData.progress.attempt_bad >= MEASUREMENT_CONFIG.attempts.levelDownThreshold) {
      if (measurementData.grade_level > MEASUREMENT_CONFIG.minGrade) {
        measurementData.grade_level -= 1;
        measurementData.progress.attempt_good = 0;
        measurementData.progress.attempt_bad = 0;
        levelChanged = true;
        newLevel = measurementData.grade_level;
        levelDirection = 'down';
      }
    }
  }

  // Update other progress stats
  measurementData.progress.best_score = Math.max(measurementData.progress.best_score, score);
  measurementData.progress.last_played = new Date().toISOString();
  measurementData.progress.tokens_earned += tokensEarned;
  measurementData.progress.correct_answers += correct;
  measurementData.progress.sessions_completed += 1;
  measurementData.progress.total_questions_answered += total;

  // Update user in database
  const updatedHiddenAsset = {
    ...hiddenAsset,
    modules: {
      ...hiddenAsset?.modules,
      measurement: measurementData
    }
  };

  await db.update(users)
    .set({
      hiddenGradeAsset: updatedHiddenAsset,
      tokens: (user.tokens || 0) + tokensEarned
    })
    .where(eq(users.id, userId));

  return {
    correct,
    total,
    score,
    tokensEarned,
    levelChanged,
    newLevel: levelChanged ? newLevel : undefined,
    levelDirection
  };
}

// Check if higher grades have questions available
export async function checkGradeAvailability(gradeLevel: number): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT COUNT(*) as count
        FROM "questions_measurementAndData"
        WHERE "GradeLevel" = ${gradeLevel}`
  );

  return (result.rows[0] as any).count > 0;
}

// Get user's current measurement data
export async function getUserMeasurementData(userId: number): Promise<MeasurementUserData> {
  const userResult = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userResult.length) {
    throw new Error('User not found');
  }

  const user = userResult[0];
  const hiddenAsset = user.hiddenGradeAsset as any;
  
  return hiddenAsset?.modules?.measurement || {
    grade_level: MEASUREMENT_CONFIG.minGrade,
    progress: {
      lesson: 1,
      attempt_good: 0,
      attempt_bad: 0,
      best_score: 0,
      best_time: null,
      test_taken: false,
      last_played: null,
      mastery_level: false,
      tokens_earned: 0,
      correct_answers: 0,
      sessions_completed: 0,
      total_questions_answered: 0
    }
  };
}