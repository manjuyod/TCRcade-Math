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
      const num1 = Math.floor(Math.random() * maxNum);
      const num2 = Math.floor(Math.random() * maxNum);
      question = `${num1} + ${num2} = ?`;
      answer = (num1 + num2).toString();
    } else if (operation === 'subtraction') {
      let num1 = Math.floor(Math.random() * maxNum);
      let num2 = Math.floor(Math.random() * (num1 + 1)); // Ensure num2 <= num1 to avoid negative results for younger grades
      question = `${num1} - ${num2} = ?`;
      answer = (num1 - num2).toString();
    } else if (operation === 'multiplication') {
      // For K and 1st grade, use very small numbers
      const maxFactor = grade === 'K' ? 5 : 
                        grade === '1' ? 10 :
                        grade === '2' ? 12 :
                        grade === '3' ? 12 : 20;
      const num1 = Math.floor(Math.random() * maxFactor) + 1; // Avoid multiplication by 0
      const num2 = Math.floor(Math.random() * maxFactor) + 1;
      question = `${num1} × ${num2} = ?`;
      answer = (num1 * num2).toString();
    } else if (operation === 'division') {
      // Generate division questions that result in whole numbers
      // For younger grades, use smaller numbers
      const maxDivisor = grade === 'K' ? 5 : 
                          grade === '1' ? 10 :
                          grade === '2' ? 12 : 20;
      
      const divisor = Math.floor(Math.random() * maxDivisor) + 1; // 1-10 or 1-12 based on grade
      const quotient = Math.floor(Math.random() * maxDivisor) + 1; // 1-10 or 1-12 based on grade
      const dividend = divisor * quotient; // This ensures division results in a whole number
      
      question = `${dividend} ÷ ${divisor} = ?`;
      answer = quotient.toString();
    }
    
    // Generate options (including correct answer)
    if (question && answer) {
      const answerNum = parseInt(answer);
      options = [
        answerNum.toString(),
        (answerNum + 1).toString(),
        (answerNum - 1).toString(),
        (answerNum + 2).toString()
      ];
      
      // Shuffle options
      options = options.sort(() => Math.random() - 0.5);
      
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
    for (let i = 0; i < questionsData.length; i += BATCH_SIZE) {
      const batch = questionsData.slice(i, i + BATCH_SIZE);
      await db.insert(questions).values(batch);
      console.log(`  Saved batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(questionsData.length/BATCH_SIZE)}`);
    }
    console.log(`Successfully saved ${questionsData.length} questions to database.`);
    return true;
  } catch (error) {
    console.error('Error saving questions to database:', error);
    return false;
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
      try {
        const questions = await generateQuestionsForGradeAndCategory(grade, category, QUESTIONS_PER_GRADE_CATEGORY);
        totalGenerated += questions.length;
        
        if (questions.length > 0) {
          const saved = await saveQuestionsToDB(questions);
          if (saved) {
            totalSaved += questions.length;
          }
        }
      } catch (error) {
        console.error(`Error processing grade ${grade}, category ${category}:`, error);
      }
    }
    
    // Also generate Math Facts questions for each operation
    for (const operation of MATH_FACTS_OPERATIONS) {
      try {
        const questions = await generateMathFactsQuestions(grade, operation, QUESTIONS_PER_GRADE_CATEGORY);
        totalGenerated += questions.length;
        
        if (questions.length > 0) {
          const saved = await saveQuestionsToDB(questions);
          if (saved) {
            totalSaved += questions.length;
          }
        }
      } catch (error) {
        console.error(`Error processing Math Facts for grade ${grade}, operation ${operation}:`, error);
      }
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
