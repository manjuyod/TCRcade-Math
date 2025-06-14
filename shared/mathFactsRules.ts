/**
 * Math Facts Module Configuration
 * Handles pure algorithmic generation of math fact questions
 */

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
    0: { min1: 1,   max1: 5,    min2: 1,   max2: 5  },     // sums within 5 (Kindergarten)
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
    0: { min2: 1,   max2: 3,    minDiff: 0,   maxDiff: 4  },
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
    0: { min1: 1, max1: 5,  min2: 1,  max2: 5  },
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
    0: { minDivisor: 2, maxDivisor: 5,  minQuotient: 1,  maxQuotient: 4 },
    1: { minDivisor: 2, maxDivisor: 5,  minQuotient: 1,  maxQuotient: 4 },
    2: { minDivisor: 2, maxDivisor: 5,  minQuotient: 1,  maxQuotient: 4 },
    3: { minDivisor: 2, maxDivisor: 10, minQuotient: 1,  maxQuotient: 9 },      // facts within 100
    4: { minDivisor: 2, maxDivisor: 9,  minQuotient: 10, maxQuotient: 9999 },   // 4-digit ÷ 1-digit
    5: { minDivisor: 2, maxDivisor: 99, minQuotient: 10, maxQuotient: 999 },    // multi-digit ÷ 2-digit
    6: { minDivisor: 2, maxDivisor: 99, minQuotient: 10, maxQuotient: 999 },
    default: { minDivisor: 2, maxDivisor: 99, minQuotient: 10, maxQuotient: 999 }
  }
};

export interface MathFactQuestion {
  id: string;
  question: string;
  answer: string;
  options: string[];
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division';
  gradeLevel: number;
}

export interface AssessmentResult {
  operation: string;
  startingGrade: string;
  finalGrade: string;
  questionsAnswered: number;
  correct: number;
  passed: boolean;
}

export interface MathFactsProgress {
  test_taken: boolean;
  grade_level: number;  // Changed to number for consistency (K=0)
  attempt_good: number;
  attempt_bad: number;
  tokens_earned: number;
  total_questions_answered: number;
  correct_answers: number;
  sessions_completed: number;
  last_session_date?: string;
}

/**
 * Math Facts Rules - Shared configuration and logic
 */

/**
 * Convert grade to numeric value with K = 0
 */
export function normalizeGrade(grade: string | number): number {
  if (typeof grade === 'number') return grade;
  if (grade === 'K' || grade === 'k') return 0;
  const parsed = parseInt(grade);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert numeric grade back to string with 0 = K
 */
export function gradeToString(grade: number): string {
  if (grade === 0) return 'K';
  return grade.toString();
}

/**
 * Get next grade level for progression
 */
export function getNextGradeLevel(currentGrade: string | number, direction: 'up' | 'down'): string {
  const normalized = normalizeGrade(currentGrade);
  let newGrade = normalized;

  if (direction === 'up') {
    newGrade = Math.min(6, normalized + 1); // Cap at grade 6
  } else {
    newGrade = Math.max(0, normalized - 1); // Floor at K (0)
  }

  return gradeToString(newGrade);
}

export const MATH_FACTS_CONFIG = {
  ASSESSMENT_QUESTIONS_PER_GRADE: 2,
  PRACTICE_QUESTIONS_PER_SESSION: 6,
  TOKENS_PER_CORRECT: 1,
  BONUS_TOKENS_100_PERCENT: 4,
  ASSESSMENT_COMPLETION_TOKENS: 15,
  PASS_THRESHOLD: 0.8,
  ATTEMPTS_TO_LEVEL_CHANGE: 4,
  MAX_GRADE_LEVEL: 6,
  MIN_GRADE_LEVEL: '0'
};

export function getGradeForAssessment(userGrade: string | number): number {
  const gradeNum = normalizeGrade(userGrade);
  if (gradeNum >= 6) return 6;
  if (gradeNum <= 0) return 0;
  return gradeNum;
}

export function generateMathFactQuestion(
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division',
  gradeLevel: string | number
): MathFactQuestion {
  const ranges = NUMBER_RANGES[operation];
  const normalizedGrade = normalizeGrade(gradeLevel);
  const range = ranges[normalizedGrade as keyof typeof ranges] || ranges.default;

  let question: string;
  let answer: string;
  let num1: number, num2: number, result: number;

  switch (operation) {
    case 'addition':
      num1 = Math.floor(Math.random() * (range.max1 - range.min1 + 1)) + range.min1;
      num2 = Math.floor(Math.random() * (range.max2 - range.min2 + 1)) + range.min2;
      result = num1 + num2;
      question = `${num1} + ${num2} = ?`;
      answer = result.toString();
      break;

    case 'subtraction':
      const subRange = range as any; // Type assertion for subtraction specific properties
      const minuend = Math.floor(Math.random() * (subRange.maxDiff - subRange.minDiff + 1)) + subRange.minDiff + subRange.min2;
      num2 = Math.floor(Math.random() * (Math.min(subRange.max2, minuend) - subRange.min2 + 1)) + subRange.min2;
      result = minuend - num2;
      question = `${minuend} - ${num2} = ?`;
      answer = result.toString();
      break;

    case 'multiplication':
      num1 = Math.floor(Math.random() * (range.max1 - range.min1 + 1)) + range.min1;
      num2 = Math.floor(Math.random() * (range.max2 - range.min2 + 1)) + range.min2;
      result = num1 * num2;
      question = `${num1} × ${num2} = ?`;
      answer = result.toString();
      break;

    case 'division':
      const divRange = range as any; // Type assertion for division specific properties
      const quotient = Math.floor(Math.random() * (divRange.maxQuotient - divRange.minQuotient + 1)) + divRange.minQuotient;
      const divisor = Math.floor(Math.random() * (divRange.maxDivisor - divRange.minDivisor + 1)) + divRange.minDivisor;
      const dividend = quotient * divisor;
      question = `${dividend} ÷ ${divisor} = ?`;
      answer = quotient.toString();
      result = quotient;
      break;

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  // Generate wrong answer options
  const correctAnswer = parseInt(answer);
  const wrongOptions = new Set<number>();

  while (wrongOptions.size < 3) {
    let wrongAnswer: number;
    const variance = Math.max(1, Math.floor(correctAnswer * 0.2));

    if (Math.random() < 0.5) {
      wrongAnswer = correctAnswer + Math.floor(Math.random() * variance) + 1;
    } else {
      wrongAnswer = Math.max(0, correctAnswer - Math.floor(Math.random() * variance) - 1);
    }

    if (wrongAnswer !== correctAnswer && wrongAnswer >= 0) {
      wrongOptions.add(wrongAnswer);
    }
  }

  const options = [answer, ...Array.from(wrongOptions).map(n => n.toString())]
    .sort(() => Math.random() - 0.5);

  return {
    id: `mathfact_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    question,
    answer,
    options,
    operation,
    gradeLevel
  };
}

export default NUMBER_RANGES;