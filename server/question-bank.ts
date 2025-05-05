/**
 * Question Bank Module
 * 
 * This module provides functions to manage and retrieve questions from the database.
 * It prioritizes getting questions from the pre-generated question bank instead of using OpenAI.
 */

import { db } from './db';
import { questions } from '@shared/schema';
import { eq, and, not, inArray, sql } from 'drizzle-orm';

/**
 * Get a random question from the bank for a specific grade and category
 * 
 * @param grade The grade level (K-6)
 * @param category The category (optional)
 * @param excludeIds IDs to exclude
 * @param isMathFactsModule Flag indicating if this is for Math Facts
 * @returns A question or null if none found
 */
export async function getRandomQuestionFromBank(grade: string, category?: string, excludeIds: number[] = [], isMathFactsModule: boolean = false) {
  try {
    console.log(`Fetching random question from bank: grade=${grade}, category=${category || 'any'}, excludeIds.length=${excludeIds.length}, isMathFactsModule=${isMathFactsModule}`);
    
    // Build conditions array for the WHERE clause
    const conditions = [eq(questions.grade, grade)];
    
    // Add category filter if specified
    if (category) {
      if (isMathFactsModule) {
        // For Math Facts modules, the category is stored as math-facts-[operation]
        conditions.push(eq(questions.category, `math-facts-${category}`));
      } else {
        conditions.push(eq(questions.category, category));
      }
    }
    
    // Exclude previously seen questions if specified
    if (excludeIds.length > 0 && excludeIds.some(id => !isNaN(id) && id > 0)) {
      // Only exclude up to 1000 ids to prevent query size issues
      const limitedExcludeIds = excludeIds.slice(-1000).filter(id => !isNaN(id) && id > 0);
      conditions.push(not(inArray(questions.id, limitedExcludeIds)));
    }
    
    // Execute query with all conditions, random order, and limit
    const results = await db
      .select()
      .from(questions)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    
    // Return random question or null if none found
    if (results.length > 0) {
      console.log(`Found question in bank: ID=${results[0].id}`);
      return results[0];
    }
    
    console.log(`No matching questions found in bank for grade=${grade}, category=${category || 'any'}`);
    return null;
  } catch (error) {
    console.error('Error fetching random question from bank:', error);
    return null;
  }
}

/**
 * Count questions available for a specific grade and category
 * 
 * @param grade The grade level
 * @param category The category (optional)
 * @returns The count of available questions
 */
export async function countQuestionsInBank(grade: string, category?: string) {
  try {
    // Build conditions array for the WHERE clause
    const conditions = [eq(questions.grade, grade)];
    
    // Add category filter if specified
    if (category) {
      conditions.push(eq(questions.category, category));
    }
    
    // Execute query with conditions
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
      .where(and(...conditions));
    
    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error counting questions in bank:', error);
    return 0;
  }
}

/**
 * Get all categories available for a specific grade
 * 
 * @param grade The grade level
 * @returns Array of category names
 */
export async function getCategoriesForGrade(grade: string) {
  try {
    const result = await db
      .select({ category: questions.category })
      .from(questions)
      .where(eq(questions.grade, grade))
      .groupBy(questions.category);
    
    return result.map(r => r.category);
  } catch (error) {
    console.error('Error fetching categories for grade:', error);
    return [];
  }
}
