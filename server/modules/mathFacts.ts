import { generateMathFactQuestion, MathFactQuestion, MATH_FACTS_CONFIG, getGradeForAssessment, getNextGradeLevel } from '../../shared/mathFactsRules';

/**
 * Convert grade to numeric value with K = 0
 */
function normalizeGrade(grade: string | number): number {
  if (typeof grade === 'number') return grade;
  if (grade === 'K' || grade === 'k') return 0;
  const parsed = parseInt(grade);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert numeric grade back to string with 0 = K
 */
function gradeToString(grade: number): string {
  if (grade === 0) return 'K';
  return grade.toString();
}

/**
 * Math-fact AND on-grade computation ranges
 * ----------------------------------------
 *  – K-2:   single-digit facts (required by CCSS)
 *  – Gr 3:  add/sub to 1 000; ×/÷ facts through 10
 *  – Gr 4:  add/sub to 10 000; 2-digit × 2-digit; 4-digit ÷ 1-digit
 *  – Gr 5+: multi-digit operations (expand as needed)
 *
 *  NOTE: K-2 ×/÷ blocks are enrichment, not part of CCSS.
 */
const NUMBER_RANGES = {
  /* ---------- ADDITION ---------- */
  addition: {
    0: { min1: 1,   max1: 5,    min2: 1,   max2: 5  },     // K: sums within 5
    1: { min1: 1,   max1: 10,   min2: 1,   max2: 10 },     // sums within 10
    2: { min1: 1,   max1: 20,   min2: 1,   max2: 20 },     // sums within 20
    3: { min1: 100, max1: 999,  min2: 100, max2: 999 },    // to 1 000
    4: { min1: 1000,max1: 9999, min2: 1000,max2: 9999 },   // to 10 000
    5: { min1: 10000, max1: 99999, min2: 10000, max2: 99999 },
    6: { min1: 10000, max1: 99999, min2: 10000, max2: 99999 },
    default: { min1: 10000, max1: 99999, min2: 10000, max2: 99999 }
  },

  /* ---------- SUBTRACTION ---------- */
  subtraction: {
    0: { min2: 1,   max2: 3,    minDiff: 0,   maxDiff: 4  },  // K
    1: { min2: 1,   max2: 5,    minDiff: 0,   maxDiff: 9  },
    2: { min2: 1,   max2: 10,   minDiff: 0,   maxDiff: 19 },
    3: { min2: 1,   max2: 999,  minDiff: 0,   maxDiff: 999 },
    4: { min2: 1,   max2: 9999, minDiff: 0,   maxDiff: 9999 },
    5: { min2: 1,   max2: 99999,minDiff: 0,   maxDiff: 99999 },
    6: { min2: 1,   max2: 99999,minDiff: 0,   maxDiff: 99999 },
    default: { min2: 1, max2: 99999, minDiff: 0, maxDiff: 99999 }
  },

  /* ---------- MULTIPLICATION ---------- */
  multiplication: {
    // K-2 multiplication = enrichment (comment out to disable)
    0: { min1: 1, max1: 5,  min2: 1,  max2: 5  },            // K
    1: { min1: 1, max1: 5,  min2: 1,  max2: 5  },
    2: { min1: 1, max1: 5,  min2: 1,  max2: 5  },
    3: { min1: 1, max1: 10, min2: 1,  max2: 10 },           // facts through 10×10
    4: { min1: 10, max1: 99, min2: 10, max2: 99 },           // 2-digit × 2-digit
    5: { min1: 100, max1: 999, min2: 10,  max2: 99 },        // 3-digit × 2-digit
    6: { min1: 100, max1: 999, min2: 10,  max2: 99 },
    default: { min1: 100, max1: 999, min2: 10, max2: 99 }
  },

  /* ---------- DIVISION ---------- */
  division: {
    // K-2 division = enrichment (comment out to disable)
    0: { minDivisor: 2, maxDivisor: 5,  minQuotient: 1,  maxQuotient: 4 }, // K
    1: { minDivisor: 2, maxDivisor: 5,  minQuotient: 1,  maxQuotient: 4 },
    2: { minDivisor: 2, maxDivisor: 5,  minQuotient: 1,  maxQuotient: 4 },
    // 3: { minDivisor: 2, maxDivisor: 10, minQuotient: 1,  maxQuotient: 10 },  // facts through 10
    // 4: { minDivisor: 3, maxDivisor: 15, minQuotient: 5,  maxQuotient: 20 },
    // 5: { minDivisor:10, maxDivisor: 25, minQuotient:10, maxQuotient: 50 },
    // 6: { minDivisor:11, maxDivisor: 30, minQuotient:11, maxQuotient: 60 },
    default: { minDivisor: 2, maxDivisor: 12, minQuotient: 1, maxQuotient: 12 }
  }
};

/**
 * Math Facts Module - Pure Algorithmic Generation
 * Generates math fact questions without AI/OpenAI dependency
 */

export function generateQuestionsForSession(
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division',
  grade: string | number,
  count: number = MATH_FACTS_CONFIG.PRACTICE_QUESTIONS_PER_SESSION
): MathFactQuestion[] {
  const normalizedGrade = normalizeGrade(grade);
  const questions: MathFactQuestion[] = [];
  const usedQuestions = new Set<string>();

  const ranges = NUMBER_RANGES[operation];
  const gradeRange = ranges[normalizedGrade as keyof typeof ranges] || ranges.default;

  while (questions.length < count) {
    const question = generateMathFactQuestion(operation, normalizedGrade);

    // Ensure no duplicate questions in the same session
    if (!usedQuestions.has(question.question)) {
      usedQuestions.add(question.question);
      questions.push(question);
    }
  }

  return questions;
}

export function generateAssessmentQuestions(
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division',
  grade: string | number,
  count: number = MATH_FACTS_CONFIG.ASSESSMENT_QUESTIONS_PER_GRADE
): MathFactQuestion[] {
  const normalizedGrade = normalizeGrade(grade);
  return generateQuestionsForSession(operation, normalizedGrade, count);
}

export function calculateSessionScore(correctAnswers: number, totalQuestions: number): {
  score: number;
  percentage: number;
  passed: boolean;
  tokensEarned: number;
} {
  const percentage = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  const passed = percentage >= MATH_FACTS_CONFIG.PASS_THRESHOLD;

  let tokensEarned = correctAnswers * MATH_FACTS_CONFIG.TOKENS_PER_CORRECT;
  if (percentage === 1.0) {
    tokensEarned += MATH_FACTS_CONFIG.BONUS_TOKENS_100_PERCENT;
  }

  return {
    score: correctAnswers,
    percentage,
    passed,
    tokensEarned
  };
}

export function determineGradeLevelChange(
  currentAttemptGood: number,
  currentAttemptBad: number,
  sessionPassed: boolean
): {
  shouldChangeLevel: boolean;
  direction: 'up' | 'down' | null;
  newAttemptGood: number;
  newAttemptBad: number;
} {
  let newAttemptGood = currentAttemptGood;
  let newAttemptBad = currentAttemptBad;

  if (sessionPassed) {
    newAttemptGood++;
    newAttemptBad = 0;

    if (newAttemptGood >= MATH_FACTS_CONFIG.ATTEMPTS_TO_LEVEL_CHANGE) {
      return {
        shouldChangeLevel: true,
        direction: 'up',
        newAttemptGood: 0,
        newAttemptBad: 0
      };
    }
  } else {
    newAttemptBad++;
    newAttemptGood = 0;

    if (newAttemptBad >= MATH_FACTS_CONFIG.ATTEMPTS_TO_LEVEL_CHANGE) {
      return {
        shouldChangeLevel: true,
        direction: 'down',
        newAttemptGood: 0,
        newAttemptBad: 0
      };
    }
  }

  return {
    shouldChangeLevel: false,
    direction: null,
    newAttemptGood,
    newAttemptBad
  };
}

export function runAssessmentForOperation(
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division',
  userGrade: string,
  answerCallback: (questions: MathFactQuestion[]) => Promise<string[]>
): Promise<{
  finalGradeLevel: string;
  questionsAnswered: number;
  totalCorrect: number;
  passed: boolean;
}> {
  return new Promise(async (resolve) => {
    let currentGrade = getGradeForAssessment(userGrade);
    let totalQuestionsAnswered = 0;
    let totalCorrect = 0;
    let passed = false;

    while (currentGrade !== null) {
      const questions = generateAssessmentQuestions(operation, currentGrade);
      const answers = await answerCallback(questions);

      let correct = 0;
      for (let i = 0; i < questions.length; i++) {
        if (answers[i] === questions[i].answer) {
          correct++;
        }
      }

      totalQuestionsAnswered += questions.length;
      totalCorrect += correct;

      // If all questions correct at this level, they pass
      if (correct === questions.length) {
        passed = true;
        break;
      }

      // If not perfect, drop down a grade level and try again
      const nextGrade = getNextGradeLevel(currentGrade, 'down');
      if (nextGrade === currentGrade) {
        // Already at lowest level (K), stop here
        break;
      }
      currentGrade = nextGrade;
    }

    resolve({
      finalGradeLevel: currentGrade,
      questionsAnswered: totalQuestionsAnswered,
      totalCorrect,
      passed
    });
  });
}

export function validateMathFactAnswer(userAnswer: string, correctAnswer: string): boolean {
  return userAnswer.trim() === correctAnswer.trim();
}

// Performance benchmarking for algorithmic generation
export function runPerformanceBenchmark(iterations: number = 1000): {
  averageTimeMs: number;
  questionsPerSecond: number;
  totalQuestions: number;
} {
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    generateMathFactQuestion('addition', '3');
    generateMathFactQuestion('subtraction', '4');
    generateMathFactQuestion('multiplication', '5');
    generateMathFactQuestion('division', '6');
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const totalQuestions = iterations * 4;

  return {
    averageTimeMs: totalTime / totalQuestions,
    questionsPerSecond: (totalQuestions / totalTime) * 1000,
    totalQuestions
  };
}

export {
  generateQuestionsForSession,
  generateAssessmentQuestions,
  calculateSessionScore,
  determineGradeLevelChange,
  runAssessmentForOperation,
  validateMathFactAnswer,
  normalizeGrade,
  gradeToString
};