import { generateMathFactQuestion, MathFactQuestion, MATH_FACTS_CONFIG, getGradeForAssessment, getNextGradeLevel, NUMBER_RANGES } from '../../shared/mathFactsRules';

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
 * Math Facts Module - Pure Algorithmic Generation
 * Generates math fact questions without AI/OpenAI dependency
 */

function generateQuestionsForSession(
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

function generateAssessmentQuestions(
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division',
  grade: string | number,
  count: number = MATH_FACTS_CONFIG.ASSESSMENT_QUESTIONS_PER_GRADE
): MathFactQuestion[] {
  const normalizedGrade = normalizeGrade(grade);
  return generateQuestionsForSession(operation, normalizedGrade, count);
}

function calculateSessionScore(correctAnswers: number, totalQuestions: number): {
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

function determineGradeLevelChange(
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

function runAssessmentForOperation(
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

function validateMathFactAnswer(userAnswer: string, correctAnswer: string): boolean {
  return userAnswer.trim() === correctAnswer.trim();
}

// Performance benchmarking for algorithmic generation
function runPerformanceBenchmark(iterations: number = 1000): {
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