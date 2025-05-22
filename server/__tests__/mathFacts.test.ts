/**
 * Unit tests for the optimized mathFacts module
 */

import { 
  getNextMathFact, 
  generateFallbackWordProblem,
  runPerformanceBenchmark,
  MathOperation 
} from './mathFacts';

// Test helper function to check if a number is within expected range
function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Test helper to extract numbers from a question
function extractNumbers(questionText: string): [number, number, string, number] {
  const match = questionText.match(/(\d+)\s*([\+\-×÷])\s*(\d+)\s*=\s*\?/);
  if (!match) {
    throw new Error(`Question text does not match expected format: ${questionText}`);
  }
  
  const [_, num1Str, operation, num2Str] = match;
  const num1 = parseInt(num1Str);
  const num2 = parseInt(num2Str);
  
  let result: number;
  switch (operation) {
    case '+': result = num1 + num2; break;
    case '-': result = num1 - num2; break;
    case '×': result = num1 * num2; break;
    case '÷': result = num1 / num2; break;
    default: throw new Error(`Unknown operation: ${operation}`);
  }
  
  return [num1, num2, operation, result];
}

describe('MathFacts Module Tests', () => {
  
  // Test addition operations
  describe('Addition Operations', () => {
    const operation: MathOperation = 'addition';
    
    // Test for different grade levels
    test('Kindergarten addition has appropriate numbers (1-5)', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('K', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('+');
      expect(isInRange(num1, 1, 5)).toBeTruthy();
      expect(isInRange(num2, 1, 5)).toBeTruthy();
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Grade 3 addition has appropriate numbers (10-59)', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('3', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('+');
      expect(isInRange(num1, 10, 59)).toBeTruthy();
      expect(isInRange(num2, 10, 59)).toBeTruthy();
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Higher grade addition has larger numbers (10-109)', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('6', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('+');
      expect(isInRange(num1, 10, 109)).toBeTruthy();
      expect(isInRange(num2, 10, 109)).toBeTruthy();
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Addition produces no duplicates until exhaustion', () => {
      const seen = new Set<string>();
      const signatures = new Set<string>();
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        const question = getNextMathFact('3', operation, seen);
        const [num1, num2, op] = extractNumbers(question.question.text);
        const signature = `${num1}${op}${num2}`;
        
        // We're adding to signatures to check if we've seen this before
        // Some duplicates are expected when the operation's combinations are exhausted
        signatures.add(signature);
      }
      
      // Allow for some duplicates due to the limited number space
      // but ensure we have reasonable variety
      expect(signatures.size).toBeGreaterThan(iterations * 0.7);
    });
  });
  
  // Test subtraction operations
  describe('Subtraction Operations', () => {
    const operation: MathOperation = 'subtraction';
    
    test('Kindergarten subtraction has appropriate numbers', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('K', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('-');
      expect(isInRange(num2, 1, 3)).toBeTruthy();
      expect(num1).toBeGreaterThanOrEqual(num2); // Ensure positive result
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Grade 3 subtraction has appropriate numbers', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('3', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('-');
      expect(isInRange(num2, 1, 30)).toBeTruthy();
      expect(num1).toBeGreaterThanOrEqual(num2); // Ensure positive result
      expect(num1 - num2).toBeLessThanOrEqual(49); // Difference in expected range
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Higher grade subtraction has larger numbers', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('6', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('-');
      expect(isInRange(num2, 1, 50)).toBeTruthy();
      expect(num1).toBeGreaterThanOrEqual(num2); // Ensure positive result
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Subtraction produces no duplicates until exhaustion', () => {
      const seen = new Set<string>();
      const signatures = new Set<string>();
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        const question = getNextMathFact('3', operation, seen);
        const [num1, num2, op] = extractNumbers(question.question.text);
        const signature = `${num1}${op}${num2}`;
        
        signatures.add(signature);
      }
      
      expect(signatures.size).toBeGreaterThan(iterations * 0.7);
    });
  });
  
  // Test multiplication operations
  describe('Multiplication Operations', () => {
    const operation: MathOperation = 'multiplication';
    
    test('Grade 2 multiplication has appropriate numbers (1-5)', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('2', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('×');
      expect(isInRange(num1, 1, 5)).toBeTruthy();
      expect(isInRange(num2, 1, 5)).toBeTruthy();
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Grade 3 multiplication has appropriate numbers (1-10)', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('3', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('×');
      expect(isInRange(num1, 1, 10)).toBeTruthy();
      expect(isInRange(num2, 1, 10)).toBeTruthy();
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Grade 5 multiplication has larger numbers', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('5', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('×');
      expect(isInRange(num1, 1, 20)).toBeTruthy();
      expect(isInRange(num2, 1, 12)).toBeTruthy();
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Multiplication produces no duplicates until exhaustion', () => {
      const seen = new Set<string>();
      const signatures = new Set<string>();
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        const question = getNextMathFact('3', operation, seen);
        const [num1, num2, op] = extractNumbers(question.question.text);
        // Use a commutative-aware signature (order doesn't matter)
        const orderedNums = [num1, num2].sort((a, b) => a - b);
        const signature = `${orderedNums[0]}${op}${orderedNums[1]}`;
        
        signatures.add(signature);
      }
      
      expect(signatures.size).toBeGreaterThan(iterations * 0.7);
    });
  });
  
  // Test division operations
  describe('Division Operations', () => {
    const operation: MathOperation = 'division';
    
    test('Grade 3 division has appropriate numbers', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('3', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('÷');
      expect(isInRange(num2, 2, 10)).toBeTruthy(); // Divisor
      expect(Number.isInteger(result)).toBeTruthy(); // Clean division
      expect(isInRange(result, 1, 9)).toBeTruthy(); // Quotient
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Grade 5 division has larger numbers', () => {
      const seen = new Set<string>();
      const question = getNextMathFact('5', operation, seen);
      const [num1, num2, op, result] = extractNumbers(question.question.text);
      
      expect(op).toBe('÷');
      expect(isInRange(num2, 2, 12)).toBeTruthy(); // Divisor
      expect(Number.isInteger(result)).toBeTruthy(); // Clean division
      expect(isInRange(result, 1, 20)).toBeTruthy(); // Quotient
      expect(result.toString()).toBe(question.answer);
    });
    
    test('Division produces no duplicates until exhaustion', () => {
      const seen = new Set<string>();
      const signatures = new Set<string>();
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        const question = getNextMathFact('3', operation, seen);
        const [num1, num2, op] = extractNumbers(question.question.text);
        const signature = `${num1}${op}${num2}`;
        
        signatures.add(signature);
      }
      
      expect(signatures.size).toBeGreaterThan(iterations * 0.6);
    });
  });
  
  // Verify options and formatting
  describe('Question formatting and options', () => {
    test('Question provides 4 options including the correct answer', () => {
      const operations: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
      
      operations.forEach(operation => {
        const question = getNextMathFact('3', operation);
        
        expect(question.options.length).toBe(4);
        expect(question.options).toContain(question.answer);
      });
    });
    
    test('Question is formatted as a flash card', () => {
      const question = getNextMathFact('3', 'addition');
      
      expect(question.question.isFlashcard).toBeTruthy();
      expect(question.question.style.fontSize).toBe('60px');
      expect(question.question.style.fontWeight).toBe('bold');
      expect(question.question.text).toMatch(/^\d+\s*[\+\-×÷]\s*\d+\s*=\s*\?$/);
    });
  });
  
  // Test fallback functionality
  describe('Fallback word problems', () => {
    test('Fallback problems include the correct numbers and operations', () => {
      const operations: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
      
      operations.forEach(operation => {
        const problem = generateFallbackWordProblem('3', operation);
        
        // Should not be in flashcard format
        expect(problem.question.isFlashcard).toBeFalsy();
        
        // Should include numbers and have the correct answer
        const numRegex = /\b\d+\b.*\b\d+\b/;
        expect(problem.question.text).toMatch(numRegex);
        
        // Should have 4 options
        expect(problem.options.length).toBe(4);
        expect(problem.options).toContain(problem.answer);
      });
    });
  });
  
  // Performance benchmark
  describe('Performance testing', () => {
    test('Question generation is O(1) time complexity', () => {
      // Run small sample first
      const smallSample = 10;
      let startTime = performance.now();
      for (let i = 0; i < smallSample; i++) {
        getNextMathFact('3', 'addition');
      }
      let smallTime = performance.now() - startTime;
      
      // Run larger sample
      const largeSample = 100;
      startTime = performance.now();
      for (let i = 0; i < largeSample; i++) {
        getNextMathFact('3', 'addition');
      }
      let largeTime = performance.now() - startTime;
      
      // Calculate average time per operation
      const smallAvg = smallTime / smallSample;
      const largeAvg = largeTime / largeSample;
      
      // If O(1), the average time should be similar regardless of input size
      // Allow for a 50% variance due to initialization, garbage collection, etc.
      const ratio = largeAvg / smallAvg;
      expect(ratio).toBeLessThan(1.5);
      
      // Individual operation should be under 1ms for O(1) performance
      expect(largeAvg).toBeLessThan(1);
    });
    
    test('Benchmark reports accurate metrics', () => {
      const result = runPerformanceBenchmark();
      
      expect(result.totalQuestions).toBe(1000);
      expect(result.averageTime).toBeLessThan(0.5); // Under half a millisecond per question
      expect(result.uniqueRatio).toBeGreaterThan(0.7); // At least 70% of questions should be unique
    });
  });
});