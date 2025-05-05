/**
 * Question Bank Generator Script
 * 
 * This script pre-generates a large set of questions for each grade level and category
 * and stores them in the database for quick retrieval.
 */

import { db } from '../db';
import { questions } from '@shared/schema';
import * as openai from '../openai';
import * as openaiDebug from '../openai-debug';

// Configuration
const QUESTIONS_PER_GRADE_CATEGORY = 50; // Number of questions to generate per grade+category combination
const GRADES = ['K', '1', '2', '3', '4', '5', '6'];
const CATEGORIES = [
  'addition', 'subtraction', 'multiplication', 'division', 
  'fractions', 'decimals', 'algebra', 'geometry',
  'word_problems', 'number_sense', 'measurement', 'data',
  'money', 'time', 'probability', 'statistics'
];

// Also generate pure math facts questions for quick operations
const MATH_FACTS_OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division'];

/**
 * Generate a single batch of questions for a specific grade and category
 */
async function generateQuestionsForGradeAndCategory(grade: string, category: string, count: number) {
  console.log(`Generating ${count} questions for grade ${grade}, category ${category}...`);
  
  const generatedQuestions = [];
  
  for (let i = 0; i < count; i++) {
    try {
      // Use the existing generate function from openai.ts but with slightly modified params
      const result = await openai.generateAdaptiveQuestion({
        grade,
        category,
        forceDynamic: true
      });
      
      // If question generation was successful, add it to our list
      if (result && result.question) {
        generatedQuestions.push({
          grade,
          category,
          question: result.question,
          answer: result.answer,
          options: result.options || [],
          difficulty: result.difficulty || 2,
          concepts: result.concepts || [],
        });
        
        console.log(`  [${i+1}/${count}] Question generated successfully.`);
      }
    } catch (error) {
      console.error(`  [${i+1}/${count}] Error generating question:`, error);
      
      // If OpenAI fails, use the fallback question generator
      try {
        const fallbackQuestion = await openaiDebug.generateBasicQuestion(grade, category);
        if (fallbackQuestion) {
          generatedQuestions.push({
            grade,
            category,
            question: fallbackQuestion.question,
            answer: fallbackQuestion.answer,
            options: fallbackQuestion.options || [],
            difficulty: fallbackQuestion.difficulty || 2,
            concepts: fallbackQuestion.concepts || [],
          });
          console.log(`  [${i+1}/${count}] Fallback question generated successfully.`);
        }
      } catch (fallbackError) {
        console.error(`  [${i+1}/${count}] Fallback question generation also failed:`, fallbackError);
      }
    }

    // Add a short delay between question generations to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return generatedQuestions;
}

/**
 * Generate Math Facts questions (pure computation)
 */
async function generateMathFactsQuestions(grade: string, operation: string, count: number) {
  console.log(`Generating ${count} Math Facts questions for grade ${grade}, operation ${operation}...`);
  
  const generatedQuestions = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a pure computation question for Math Facts modules
    let question, answer, options;
    
    // Different number ranges based on grade level
    const maxNum = grade === 'K' ? 10 : 
                   grade === '1' ? 20 :
                   grade === '2' ? 50 :
                   grade === '3' ? 100 :
                   grade === '4' ? 1000 :
                   grade === '5' ? 10000 : 1000000;
    
    // Generate question based on operation
    if (operation === 'addition') {
      // Adjust ranges based on grade level
      let num1, num2;
      if (grade === 'K') {
        // Kindergarten: Single-digit addition (0-9)
        num1 = Math.floor(Math.random() * 10);
        num2 = Math.floor(Math.random() * 10);
      } else if (grade === '1') {
        // 1st grade: Mix of single-digit and adding to 20
        num1 = Math.floor(Math.random() * 15);
        num2 = Math.floor(Math.random() * 10);
      } else if (grade === '2') {
        // 2nd grade: Two-digit addition up to 100
        num1 = Math.floor(Math.random() * 50) + 10;
        num2 = Math.floor(Math.random() * 40) + 1;
      } else {
        // Higher grades: Larger numbers
        num1 = Math.floor(Math.random() * (maxNum / 2)) + Math.floor(maxNum / 10);
        num2 = Math.floor(Math.random() * (maxNum / 2)) + 1;
      }
      question = `${num1} + ${num2} = ?`;
      answer = (num1 + num2).toString();
    } else if (operation === 'subtraction') {
      // Adjust ranges for subtraction based on grade
      let num1, num2;
      if (grade === 'K') {
        // Kindergarten: Single-digit subtraction, no negative results
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * num1);
      } else if (grade === '1') {
        // 1st grade: Subtraction within 20
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * num1);
      } else if (grade === '2') {
        // 2nd grade: Two-digit subtraction
        num1 = Math.floor(Math.random() * 90) + 10;
        num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
      } else {
        // Higher grades: Larger numbers
        num1 = Math.floor(Math.random() * maxNum) + Math.floor(maxNum / 10);
        num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
      }
      question = `${num1} - ${num2} = ?`;
      answer = (num1 - num2).toString();
    } else if (operation === 'multiplication') {
      // Multiplication tables appropriate for grade level
      let num1, num2;
      if (grade === 'K') {
        // Kindergarten: Very basic multiplication (1-3)×(1-3)
        num1 = Math.floor(Math.random() * 3) + 1;
        num2 = Math.floor(Math.random() * 3) + 1;
      } else if (grade === '1') {
        // 1st grade: Basic multiplication tables up to 5×5
        num1 = Math.floor(Math.random() * 5) + 1;
        num2 = Math.floor(Math.random() * 5) + 1;
      } else if (grade === '2') {
        // 2nd grade: Multiplication tables up to 10×10
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
      } else if (grade === '3') {
        // 3rd grade: Multiplication tables up to 12×12
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
      } else {
        // Higher grades: More challenging multiplication
        const maxFactor = Math.min(20, Math.floor(Math.sqrt(maxNum)));
        num1 = Math.floor(Math.random() * maxFactor) + 1;
        num2 = Math.floor(Math.random() * maxFactor) + 1;
      }
      question = `${num1} × ${num2} = ?`;
      answer = (num1 * num2).toString();
    } else if (operation === 'division') {
      // Division that results in whole numbers only
      let divisor, dividend, quotient;
      if (grade === 'K') {
        // Kindergarten: Very simple division (dividend ≤ 10)
        divisor = Math.floor(Math.random() * 2) + 1; // 1-2
        quotient = Math.floor(Math.random() * 3) + 1; // 1-3
        dividend = divisor * quotient;
      } else if (grade === '1') {
        // 1st grade: Simple division up to 20÷5
        divisor = Math.floor(Math.random() * 5) + 1; // 1-5
        quotient = Math.floor(Math.random() * 4) + 1; // 1-4
        dividend = divisor * quotient;
      } else if (grade === '2') {
        // 2nd grade: Division with single-digit divisors
        divisor = Math.floor(Math.random() * 9) + 1; // 1-9
        quotient = Math.floor(Math.random() * 10) + 1; // 1-10
        dividend = divisor * quotient;
      } else if (grade === '3') {
        // 3rd grade: Division with divisors up to 12
        divisor = Math.floor(Math.random() * 12) + 1; // 1-12
        quotient = Math.floor(Math.random() * 12) + 1; // 1-12
        dividend = divisor * quotient;
      } else {
        // Higher grades: More challenging division
        const maxDivisor = Math.min(20, Math.floor(Math.sqrt(maxNum)));
        divisor = Math.floor(Math.random() * maxDivisor) + 1;
        quotient = Math.floor(Math.random() * maxDivisor) + 1;
        dividend = divisor * quotient;
      }
      question = `${dividend} ÷ ${divisor} = ?`;
      answer = quotient.toString();
    }
    
    // Generate options (including correct answer)
    if (question && answer) {
      const answerNum = parseInt(answer);
      
      // Generate reasonable distractors based on the correct answer
      let distractors = [];
      
      // For small numbers (under 10), use a small range of options
      if (answerNum < 10) {
        for (let j = Math.max(0, answerNum - 3); j <= answerNum + 3; j++) {
          if (j !== answerNum) distractors.push(j.toString());
        }
      }
      // For medium numbers (under 100), use common errors
      else if (answerNum < 100) {
        // Off by one errors
        distractors.push((answerNum + 1).toString());
        distractors.push((answerNum - 1).toString());
        
        // Transposition errors (if applicable)
        if (answerNum >= 10) {
          const tensDigit = Math.floor(answerNum / 10);
          const onesDigit = answerNum % 10;
          if (tensDigit !== onesDigit) {
            distractors.push((onesDigit * 10 + tensDigit).toString());
          }
        }
        
        // Off by ten errors
        distractors.push((answerNum + 10).toString());
        distractors.push((answerNum - 10).toString());
      }
      // For large numbers, use percentage-based errors
      else {
        distractors.push((answerNum + 1).toString());
        distractors.push((answerNum - 1).toString());
        distractors.push(Math.round(answerNum * 1.1).toString()); // 10% too high
        distractors.push(Math.round(answerNum * 0.9).toString()); // 10% too low
        distractors.push((answerNum + 10).toString());
        distractors.push((answerNum - 10).toString());
      }
      
      // Filter out negative or duplicate distractors
      distractors = distractors.filter(d => parseInt(d) >= 0 && d !== answer);
      
      // Ensure we have at least 3 options plus the correct answer
      while (distractors.length < 3) {
        const offset = distractors.length + 1;
        distractors.push((answerNum + offset).toString());
      }
      
      // Take first 3 distractors and add the correct answer
      options = [answer, ...distractors.slice(0, 3)];
      
      // Shuffle options
      options = options.sort(() => Math.random() - 0.5);
      
      // Create the question object with proper formatting for flashcard style
      generatedQuestions.push({
        grade,
        category: `math-facts-${operation}`,
        question: {
          text: question,
          style: {
            fontSize: "60px",
            fontWeight: "bold",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            isFlashcard: true
          },
          isFlashcard: true
        },
        answer,
        options,
        difficulty: 2,
        concepts: [operation],
      });
      
      console.log(`  [${i+1}/${count}] Math Facts question generated: ${question}`);
    }
  }
  
  return generatedQuestions;
}

/**
 * Save generated questions to the database
 */
async function saveQuestionsToDB(questionsData: any[]) {
  console.log(`Saving ${questionsData.length} questions to database...`);
  
  try {
    // Insert questions in batches to avoid overwhelming the DB
    const BATCH_SIZE = 50;
    
    // Process the data to remove any problematic ID fields
    // PostgreSQL serial type will auto-assign IDs
    const processedData = questionsData.map(question => {
      // Create a new object without the id field
      const { id, ...questionWithoutId } = question;
      
      // Return the question without an ID so PostgreSQL can assign one
      return questionWithoutId;
    });
    
    for (let i = 0; i < processedData.length; i += BATCH_SIZE) {
      const batch = processedData.slice(i, i + BATCH_SIZE);
      await db.insert(questions).values(batch);
      console.log(`  Saved batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(processedData.length/BATCH_SIZE)}`);
    }
    
    console.log(`Successfully saved ${processedData.length} questions to database.`);
    return true;
  } catch (error) {
    console.error('Error saving questions to database:', error);
    return false;
  }
}

/**
 * Generate questions for a specific grade and category
 * This function is exported so it can be called individually for targeted generation
 */
export async function generateForGradeAndCategory(grade: string, category: string, count: number) {
  try {
    console.log(`Generating questions for grade ${grade}, category ${category}...`);
    const questions = await generateQuestionsForGradeAndCategory(grade, category, count);
    console.log(`Generated ${questions.length} questions for grade ${grade}, category ${category}`);
    
    let saved = 0;
    if (questions.length > 0) {
      const saveSuccess = await saveQuestionsToDB(questions);
      if (saveSuccess) {
        saved = questions.length;
      }
    }
    
    return { generated: questions.length, saved };
  } catch (error) {
    console.error(`Error generating questions for grade ${grade}, category ${category}:`, error);
    return { generated: 0, saved: 0 };
  }
}

/**
 * Generate Math Facts questions for a specific grade and operation
 * This function is exported so it can be called individually for targeted generation
 */
export async function generateMathFacts(grade: string, operation: string, count: number) {
  try {
    console.log(`Generating Math Facts questions for grade ${grade}, operation ${operation}...`);
    const questions = await generateMathFactsQuestions(grade, operation, count);
    console.log(`Generated ${questions.length} Math Facts questions for grade ${grade}, operation ${operation}`);
    
    let saved = 0;
    if (questions.length > 0) {
      const saveSuccess = await saveQuestionsToDB(questions);
      if (saveSuccess) {
        saved = questions.length;
      }
    }
    
    return { generated: questions.length, saved };
  } catch (error) {
    console.error(`Error generating Math Facts questions for grade ${grade}, operation ${operation}:`, error);
    return { generated: 0, saved: 0 };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('Starting question bank generation...');
  let totalGenerated = 0;
  let totalSaved = 0;
  
  // Generate questions for each grade and category combination
  for (const grade of GRADES) {
    for (const category of CATEGORIES) {
      const result = await generateForGradeAndCategory(grade, category, QUESTIONS_PER_GRADE_CATEGORY);
      totalGenerated += result.generated;
      totalSaved += result.saved;
    }
    
    // Also generate Math Facts questions for each operation
    for (const operation of MATH_FACTS_OPERATIONS) {
      const result = await generateMathFacts(grade, operation, QUESTIONS_PER_GRADE_CATEGORY);
      totalGenerated += result.generated;
      totalSaved += result.saved;
    }
  }
  
  console.log(`\nQuestion bank generation complete!`);
  console.log(`- Generated: ${totalGenerated} questions`);
  console.log(`- Saved: ${totalSaved} questions`);
}

// Execute the main function
main().catch(error => {
  console.error('Unhandled error in question bank generation:', error);
  process.exit(1);
}).finally(() => {
  console.log('Question bank generation script completed.');
});
