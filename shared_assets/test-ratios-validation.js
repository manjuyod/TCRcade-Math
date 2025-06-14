// Test script to debug ratios validation
import { generateRatiosQuestions, validateRatiosAnswer } from './server/modules/ratios.ts';

// Generate a visual identification question
console.log("Generating visual identification question...");
const questions = generateRatiosQuestions('visual_identification', 1);
const question = questions[0];

console.log("Generated question:", JSON.stringify(question, null, 2));
console.log("Expected answer format:", question.correctAnswer);

// Test various answer formats
const testAnswers = [
  question.correctAnswer,
  question.correctAnswer.replace(':', ' to '),
  question.correctAnswer.replace(':', '/'),
  question.correctAnswer.split(':').reverse().join(':')
];

console.log("\nTesting validation:");
testAnswers.forEach((answer, index) => {
  const isValid = validateRatiosAnswer(question, answer);
  console.log(`Test ${index + 1}: "${answer}" -> ${isValid ? 'CORRECT' : 'INCORRECT'}`);
});