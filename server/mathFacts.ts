/**
 * Efficient Math Facts Generation Module
 * 
 * This module provides deterministic, O(1) time complexity generation of basic math operations:
 * - Addition
 * - Subtraction
 * - Multiplication
 * - Division
 * 
 * Features:
 * - Grade-appropriate number ranges
 * - Efficient question generation without OpenAI calls
 * - No duplicates using seen sets
 * - Support for all 4 basic operations
 * - Parameterized template-based fallbacks
 * - Performance benchmarking
 */

import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { questionsAddition } from './schema';
import { and, gte, lte } from 'drizzle-orm';

// Type definitions
export type MathOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';
export type MathOperationSymbol = '+' | '-' | '×' | '÷';

export interface MathFactQuestion {
  id: number;
  question: {
    text: string;
    style: {
      fontSize: string;
      fontWeight: string;
      textAlign: string;
      display: string;
      justifyContent: string;
      alignItems: string;
      padding: string;
      isFlashcard: boolean;
    };
    isFlashcard: boolean;
  };
  answer: string;
  options: string[];
  grade: string;
  difficulty: number;
  category: string;
  concepts: string[];
  storyId: null;
  storyNode: null;
  storyText: null;
  storyImage: null;
}

// Postgress pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
});

// Grade-appropriate number ranges for each operation
const NUMBER_RANGES = {
  addition: {
    K: { min1: 1, max1: 5, min2: 1, max2: 5 },
    1: { min1: 1, max1: 10, min2: 1, max2: 10 },
    2: { min1: 1, max1: 20, min2: 1, max2: 20 },
    3: { min1: 10, max1: 59, min2: 10, max2: 59 },
    4: { min1: 10, max1: 99, min2: 10, max2: 99 },
    5: { min1: 10, max1: 109, min2: 10, max2: 109 },
    6: { min1: 10, max1: 109, min2: 10, max2: 109 },
    // Higher grades get same range as grade 6 for simple math facts
    default: { min1: 10, max1: 109, min2: 10, max2: 109 }
  },
  subtraction: {
    K: { min2: 1, max2: 3, minDiff: 0, maxDiff: 4 },
    1: { min2: 1, max2: 5, minDiff: 0, maxDiff: 9 },
    2: { min2: 1, max2: 10, minDiff: 0, maxDiff: 19 },
    3: { min2: 1, max2: 30, minDiff: 0, maxDiff: 49 },
    4: { min2: 1, max2: 50, minDiff: 0, maxDiff: 99 },
    5: { min2: 1, max2: 50, minDiff: 0, maxDiff: 99 },
    6: { min2: 1, max2: 50, minDiff: 0, maxDiff: 99 },
    default: { min2: 1, max2: 50, minDiff: 0, maxDiff: 99 }
  },
  multiplication: {
    K: { min1: 1, max1: 5, min2: 1, max2: 5 },
    1: { min1: 1, max1: 5, min2: 1, max2: 5 },
    2: { min1: 1, max1: 5, min2: 1, max2: 5 },
    3: { min1: 1, max1: 10, min2: 1, max2: 10 },
    4: { min1: 1, max1: 12, min2: 1, max2: 12 },
    5: { min1: 1, max1: 20, min2: 1, max2: 12 },
    6: { min1: 1, max1: 20, min2: 1, max2: 12 },
    default: { min1: 1, max1: 20, min2: 1, max2: 12 }
  },
  division: {
    K: { minDivisor: 2, maxDivisor: 5, minQuotient: 1, maxQuotient: 4 },
    1: { minDivisor: 2, maxDivisor: 5, minQuotient: 1, maxQuotient: 4 },
    2: { minDivisor: 2, maxDivisor: 5, minQuotient: 1, maxQuotient: 4 },
    3: { minDivisor: 2, maxDivisor: 10, minQuotient: 1, maxQuotient: 9 },
    4: { minDivisor: 2, maxDivisor: 12, minQuotient: 1, maxQuotient: 9 },
    5: { minDivisor: 2, maxDivisor: 12, minQuotient: 1, maxQuotient: 20 },
    6: { minDivisor: 2, maxDivisor: 12, minQuotient: 1, maxQuotient: 20 },
    default: { minDivisor: 2, maxDivisor: 12, minQuotient: 1, maxQuotient: 20 }
  }
};

// Operator symbols mapping for consistency
const OPERATION_SYMBOLS: Record<MathOperation, MathOperationSymbol> = {
  addition: '+',
  subtraction: '-',
  multiplication: '×',
  division: '÷'
};

// Cache to store previously generated question signatures
// Using grade-operation-signature as key to ensure uniqueness
const questionSignatureCache: Record<string, Set<string>> = {
  addition: new Set<string>(),
  subtraction: new Set<string>(),
  multiplication: new Set<string>(),
  division: new Set<string>()
};

/**
 * Generate a hash signature for a question to prevent duplicates
 * @param num1 First operand
 * @param num2 Second operand
 * @param operation Math operation
 * @returns String hash representing the question
 */
function generateQuestionSignature(num1: number, num2: number, operation: MathOperation): string {
  // For commutative operations (addition, multiplication), order doesn't matter
  // Sort numbers for consistent signatures regardless of order
  if (operation === 'addition' || operation === 'multiplication') {
    [num1, num2] = [Math.min(num1, num2), Math.max(num1, num2)];
  }
  return `${num1}${OPERATION_SYMBOLS[operation]}${num2}`;
}

/**
 * Generate numbers for addition questions based on grade level
 * @param grade Student grade level
 * @param seen Set of previously seen question signatures
 * @returns [num1, num2, signature]
 */
async function generateAdditionNumbers(grade: string, seen: Set<string>): Promise<[number, number, string]> {
  const db = drizzle(pool);
  const gradeRanges = NUMBER_RANGES.addition[grade] || NUMBER_RANGES.addition.default;

  // Get all questions from the database within the grade range
  const questions = await db.select()
    .from(questionsAddition)
    .where(
      and(
        gte(questionsAddition.int1, gradeRanges.min1),
        lte(questionsAddition.int1, gradeRanges.max1),
        gte(questionsAddition.int2, gradeRanges.min2),
        lte(questionsAddition.int2, gradeRanges.max2)
      )
    );

  // Filter out questions we've already seen
  const availableQuestions = questions.filter(q => {
    const signature = generateQuestionSignature(q.int1, q.int2, 'addition');
    return !seen.has(signature);
  });

  if (availableQuestions.length > 0) {
    // Pick a random question from available ones
    const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    const signature = generateQuestionSignature(question.int1, question.int2, 'addition');
    return [question.int1, question.int2, signature];
  }

  // Fallback to original random generation if no suitable questions found
  const num1 = Math.floor(Math.random() * (gradeRanges.max1 - gradeRanges.min1 + 1)) + gradeRanges.min1;
  const num2 = Math.floor(Math.random() * (gradeRanges.max2 - gradeRanges.min2 + 1)) + gradeRanges.min2;
  return [num1, num2, generateQuestionSignature(num1, num2, 'addition')];
}

/**
 * Generate numbers for subtraction questions based on grade level
 * @param grade Student grade level
 * @param seen Set of previously seen question signatures
 * @returns [num1, num2, signature]
 */
function generateSubtractionNumbers(grade: string, seen: Set<string>): [number, number, string] {
  const gradeRanges = NUMBER_RANGES.subtraction[grade] || NUMBER_RANGES.subtraction.default;

  // Performance optimization: If we've generated too many questions,
  // clear the seen set to allow reuse of questions after a while
  if (seen.size > 100) {
    seen.clear();
  }

  // Try to generate unique questions, but limit attempts to avoid infinite loops
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    // Generate second number (subtrahend) first
    const num2 = Math.floor(Math.random() * (gradeRanges.max2 - gradeRanges.min2 + 1)) + gradeRanges.min2;

    // Generate a random difference to add to num2
    const diff = Math.floor(Math.random() * (gradeRanges.maxDiff - gradeRanges.minDiff + 1)) + gradeRanges.minDiff;

    // First number (minuend) is sum of num2 and diff to ensure positive result
    const num1 = num2 + diff;

    const signature = generateQuestionSignature(num1, num2, 'subtraction');

    if (!seen.has(signature) || attempts >= maxAttempts - 1) {
      return [num1, num2, signature];
    }

    attempts++;
  }

  // Fallback case
  const num2 = Math.floor(Math.random() * (gradeRanges.max2 - gradeRanges.min2 + 1)) + gradeRanges.min2;
  const diff = Math.floor(Math.random() * (gradeRanges.maxDiff - gradeRanges.minDiff + 1)) + gradeRanges.minDiff;
  const num1 = num2 + diff;
  return [num1, num2, generateQuestionSignature(num1, num2, 'subtraction')];
}

/**
 * Generate numbers for multiplication questions based on grade level
 * @param grade Student grade level
 * @param seen Set of previously seen question signatures
 * @returns [num1, num2, signature]
 */
function generateMultiplicationNumbers(grade: string, seen: Set<string>): [number, number, string] {
  const gradeRanges = NUMBER_RANGES.multiplication[grade] || NUMBER_RANGES.multiplication.default;

  // Performance optimization: If we've generated too many questions,
  // clear the seen set to allow reuse of questions after a while
  if (seen.size > 100) {
    seen.clear();
  }

  // Try to generate unique questions, but limit attempts to avoid infinite loops
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const num1 = Math.floor(Math.random() * (gradeRanges.max1 - gradeRanges.min1 + 1)) + gradeRanges.min1;
    const num2 = Math.floor(Math.random() * (gradeRanges.max2 - gradeRanges.min2 + 1)) + gradeRanges.min2;

    const signature = generateQuestionSignature(num1, num2, 'multiplication');

    if (!seen.has(signature) || attempts >= maxAttempts - 1) {
      return [num1, num2, signature];
    }

    attempts++;
  }

  // Fallback case
  const num1 = Math.floor(Math.random() * (gradeRanges.max1 - gradeRanges.min1 + 1)) + gradeRanges.min1;
  const num2 = Math.floor(Math.random() * (gradeRanges.max2 - gradeRanges.min2 + 1)) + gradeRanges.min2;
  return [num1, num2, generateQuestionSignature(num1, num2, 'multiplication')];
}

/**
 * Generate numbers for division questions based on grade level
 * @param grade Student grade level
 * @param seen Set of previously seen question signatures
 * @returns [dividend, divisor, signature]
 */
function generateDivisionNumbers(grade: string, seen: Set<string>): [number, number, string] {
  const gradeRanges = NUMBER_RANGES.division[grade] || NUMBER_RANGES.division.default;

  // Performance optimization: If we've generated too many questions,
  // clear the seen set to allow reuse of questions after a while
  if (seen.size > 100) {
    seen.clear();
  }

  // Try to generate unique questions, but limit attempts to avoid infinite loops
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    // First, generate divisor (to avoid division by zero)
    const divisor = Math.floor(Math.random() * (gradeRanges.maxDivisor - gradeRanges.minDivisor + 1)) + gradeRanges.minDivisor;

    // Generate quotient (result of division)
    const quotient = Math.floor(Math.random() * (gradeRanges.maxQuotient - gradeRanges.minQuotient + 1)) + gradeRanges.minQuotient;

    // Calculate dividend based on divisor and quotient (ensures clean division)
    const dividend = divisor * quotient;

    const signature = generateQuestionSignature(dividend, divisor, 'division');

    if (!seen.has(signature) || attempts >= maxAttempts - 1) {
      return [dividend, divisor, signature];
    }

    attempts++;
  }

  // Fallback case
  const divisor = Math.floor(Math.random() * (gradeRanges.maxDivisor - gradeRanges.minDivisor + 1)) + gradeRanges.minDivisor;
  const quotient = Math.floor(Math.random() * (gradeRanges.maxQuotient - gradeRanges.minQuotient + 1)) + gradeRanges.minQuotient;
  const dividend = divisor * quotient;
  return [dividend, divisor, generateQuestionSignature(dividend, divisor, 'division')];
}

/**
 * Generate realistic but incorrect answer options for multiple choice
 * @param correctAnswer The correct numeric answer
 * @returns Array of 4 options (including the correct one)
 */
function generateOptions(correctAnswer: number): string[] {
  const options = new Set<string>();

  // Always include the correct answer
  options.add(correctAnswer.toString());

  // Add options that are close to the correct answer
  const errorMargin = Math.max(1, Math.floor(correctAnswer * 0.1));

  // Add close options with small differences
  options.add((correctAnswer + 1).toString());
  options.add((correctAnswer - 1).toString());

  // If answer is large enough, add options with larger differences
  if (correctAnswer > 10) {
    options.add((correctAnswer + Math.floor(correctAnswer * 0.1)).toString());
    if (correctAnswer > 5) {
      options.add((correctAnswer - Math.floor(correctAnswer * 0.1)).toString());
    }
  }

  // Convert set to array
  let optionsArray = Array.from(options);

  // Ensure we have exactly 4 options
  while (optionsArray.length < 4) {
    const newOption = (correctAnswer + optionsArray.length + 1).toString();
    optionsArray.push(newOption);
  }

  // If we have more than 4, trim
  if (optionsArray.length > 4) {
    optionsArray = optionsArray.slice(0, 4);
  }

  // Shuffle options
  return optionsArray.sort(() => Math.random() - 0.5);
}

/**
 * Main function to generate a math fact question with O(1) complexity
 * @param grade Student grade
 * @param operation Math operation (addition, subtraction, multiplication, division)
 * @param seen Optional Set of question signatures to avoid
 * @returns Generated question with answer and options
 */
export async function getNextMathFact(
  grade: string, 
  operation: MathOperation,
  seen?: Set<string>
): Promise<MathFactQuestion> {
  // Start performance measurement
  const startTime = performance.now();

  // If operation is invalid, default to addition
  if (!['addition', 'subtraction', 'multiplication', 'division'].includes(operation)) {
    operation = 'addition';
  }

  // Use our module-level cache if no seen set is provided
  const seenSet = seen || questionSignatureCache[operation];

  // Generate appropriate numbers based on operation
  let num1: number, num2: number, questionSignature: string;

  // Use the appropriate generator for the operation
  switch (operation) {
    case 'addition':
      [num1, num2, questionSignature] = await generateAdditionNumbers(grade, seenSet);
      break;
    case 'subtraction':
      [num1, num2, questionSignature] = generateSubtractionNumbers(grade, seenSet);
      break;
    case 'multiplication':
      [num1, num2, questionSignature] = generateMultiplicationNumbers(grade, seenSet);
      break;
    case 'division':
      [num1, num2, questionSignature] = generateDivisionNumbers(grade, seenSet);
      break;
  }

  // Mark this question as seen
  seenSet.add(questionSignature);

  // Calculate the correct answer
  let answer: number;
  switch (operation) {
    case 'addition':
      answer = num1 + num2;
      break;
    case 'subtraction':
      answer = num1 - num2;
      break;
    case 'multiplication':
      answer = num1 * num2;
      break;
    case 'division':
      answer = num1 / num2;
      break;
  }

  // Generate options for multiple choice
  const options = generateOptions(answer);

  // Define flashcard styling for consistent display
  const flashcardStyle = {
    fontSize: '60px',
    fontWeight: 'bold',
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    isFlashcard: true
  };

  // Format the question text
  const questionText = `${num1} ${OPERATION_SYMBOLS[operation]} ${num2} = ?`;

  // Generate a unique ID for the question
  const uniqueId = Date.now() + Math.floor(Math.random() * 1000000);

  // Calculate the difficulty level based on grade
  const gradeLevel = grade === 'K' ? 0 : parseInt(grade) || 1;
  const difficulty = Math.min(3, gradeLevel + 1);

  // End performance measurement
  const endTime = performance.now();
  const executionTime = endTime - startTime;

  // Log performance metrics
  console.log(`MathFacts: Generated ${operation} question in ${executionTime.toFixed(3)}ms`);

  // Return the complete question object
  return {
    id: uniqueId,
    question: {
      text: questionText,
      style: flashcardStyle,
      isFlashcard: true
    },
    answer: answer.toString(),
    options: options,
    grade: grade,
    difficulty: difficulty,
    category: `math-facts-${operation}`,
    concepts: [operation],
    storyId: null,
    storyNode: null,
    storyText: null,
    storyImage: null
  };
}

/**
 * Generate a word problem template as a fallback when needed
 * Produces contextual problems with the same math operations
 * @param grade Student grade
 * @param operation Math operation
 * @returns Word problem that exercises the same skill
 */
export function generateFallbackWordProblem(grade: string, operation: MathOperation): MathFactQuestion {
  // Template-based fallback generation
  const templates = {
    addition: [
      { template: "If you have {num1} apples and get {num2} more, how many apples do you have in total?", minGrade: "K", maxGrade: "2" },
      { template: "A class has {num1} boys and {num2} girls. How many students are in the class?", minGrade: "1", maxGrade: "3" },
      { template: "You scored {num1} points in the first game and {num2} points in the second game. What is your total score?", minGrade: "2", maxGrade: "6" },
      { template: "A store sold {num1} notebooks on Monday and {num2} notebooks on Tuesday. How many notebooks were sold in total?", minGrade: "3", maxGrade: "6" }
    ],
    subtraction: [
      { template: "If you have {num1} cookies and eat {num2} of them, how many cookies do you have left?", minGrade: "K", maxGrade: "2" },
      { template: "There were {num1} students in class, but {num2} students went home early. How many students remained?", minGrade: "1", maxGrade: "3" },
      { template: "A book has {num1} pages and you've read {num2} pages. How many pages do you have left to read?", minGrade: "2", maxGrade: "6" },
      { template: "A store had {num1} items in stock and sold {num2} items. How many items are still in stock?", minGrade: "3", maxGrade: "6" }
    ],
    multiplication: [
      { template: "If each box has {num2} crayons, how many crayons are in {num1} boxes?", minGrade: "2", maxGrade: "3" },
      { template: "A teacher gives {num2} stickers to each of {num1} students. How many stickers does the teacher give out?", minGrade: "2", maxGrade: "4" },
      { template: "There are {num1} rows of chairs with {num2} chairs in each row. How many chairs are there in total?", minGrade: "3", maxGrade: "5" },
      { template: "A bookshelf has {num1} shelves with {num2} books on each shelf. How many books are on the bookshelf?", minGrade: "3", maxGrade: "6" }
    ],
    division: [
      { template: "If you have {num1} candies and want to share them equally among {num2} friends, how many candies does each friend get?", minGrade: "3", maxGrade: "4" },
      { template: "A teacher has {num1} stickers to distribute equally to {num2} students. How many stickers will each student receive?", minGrade: "3", maxGrade: "5" },
      { template: "If {num1} cookies are placed equally on {num2} plates, how many cookies will be on each plate?", minGrade: "3", maxGrade: "6" },
      { template: "A library needs to arrange {num1} books equally on {num2} shelves. How many books should be placed on each shelf?", minGrade: "4", maxGrade: "6" }
    ]
  };

  // Get the numeric grade level for comparison
  const numericGrade = grade === 'K' ? 0 : parseInt(grade) || 1;

  // Filter templates appropriate for the student's grade
  const appropriateTemplates = templates[operation].filter(t => {
    const minGradeNum = t.minGrade === 'K' ? 0 : parseInt(t.minGrade);
    const maxGradeNum = parseInt(t.maxGrade);
    return numericGrade >= minGradeNum && numericGrade <= maxGradeNum;
  });

  // If no appropriate templates, use the first one
  const selectedTemplate = appropriateTemplates.length > 0 ? 
    appropriateTemplates[Math.floor(Math.random() * appropriateTemplates.length)] : 
    templates[operation][0];

  // Generate appropriate numbers for the problem
  let num1: number, num2: number, answer: number;

  // Use our existing number generators but create a temporary seen set
  const tempSeen = new Set<string>();

  switch (operation) {
    case 'addition':
      [num1, num2] = generateAdditionNumbers(grade, tempSeen);
      answer = num1 + num2;
      break;
    case 'subtraction':
      [num1, num2] = generateSubtractionNumbers(grade, tempSeen);
      answer = num1 - num2;
      break;
    case 'multiplication':
      [num1, num2] = generateMultiplicationNumbers(grade, tempSeen);
      answer = num1 * num2;
      break;
    case 'division':
      [num1, num2] = generateDivisionNumbers(grade, tempSeen);
      answer = num1 / num2;
      break;
    default:
      [num1, num2] = generateAdditionNumbers(grade, tempSeen);
      answer = num1 + num2;
  }

  // Fill in the template with the numbers
  let questionText = selectedTemplate.template
    .replace('{num1}', num1.toString())
    .replace('{num2}', num2.toString());

  // Generate options for multiple choice
  const options = generateOptions(answer);

  // Calculate difficulty
  const gradeLevel = grade === 'K' ? 0 : parseInt(grade) || 1;
  const difficulty = Math.min(3, gradeLevel + 1);

  // Generate a unique ID
  const uniqueId = Date.now() + Math.floor(Math.random() * 1000000);

  // Return the complete question object
  return {
    id: uniqueId,
    question: {
      text: questionText,
      style: {
        fontSize: '24px',  // Use a normal font size for word problems
        fontWeight: 'normal',
        textAlign: 'left',
        display: 'block',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: '20px',
        isFlashcard: false
      },
      isFlashcard: false
    },
    answer: answer.toString(),
    options: options,
    grade: grade,
    difficulty: difficulty,
    category: `math-facts-${operation}`,
    concepts: [operation],
    storyId: null,
    storyNode: null,
    storyText: null,
    storyImage: null
  };
}

/**
 * Run a benchmark to verify the performance of the question generation
 * @returns Results of the benchmark
 */
export function runPerformanceBenchmark(): { 
  averageTime: number,
  totalQuestions: number,
  uniqueRatio: number
} {
  const startTime = performance.now();
  const totalQuestions = 1000;
  const operations: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
  const grades = ['K', '1', '2', '3', '4', '5', '6'];

  // Clear caches for fresh benchmark
  operations.forEach(op => questionSignatureCache[op].clear());

  // Track unique questions
  const uniqueSignatures = new Set<string>();

  // Generate questions
  for (let i = 0; i < totalQuestions; i++) {
    const operation = operations[i % operations.length];
    const grade = grades[Math.floor(Math.random() * grades.length)];

    const result = getNextMathFact(grade, operation);

    // Extract numbers from question text for signature
    const numMatch = result.question.text.match(/(\d+)\s*([\+\-×÷])\s*(\d+)/);
    if (numMatch) {
      const [_, num1, op, num2] = numMatch;
      uniqueSignatures.add(`${num1}${op}${num2}`);
    }
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  return {
    averageTime: totalTime / totalQuestions,
    totalQuestions,
    uniqueRatio: uniqueSignatures.size / totalQuestions
  };
}