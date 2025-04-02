import { storage } from "./storage";
import { Question, Recommendation, ConceptMastery } from "@shared/schema";

/**
 * Updates the concept mastery tracking when a user answers a question
 * @param userId The user ID
 * @param conceptsOrQuestionId Either an array of concepts or a question ID
 * @param gradeOrIsCorrect Either the grade level (if concepts provided) or isCorrect flag (if questionId provided)
 * @param isCorrect Optional isCorrect flag (only used when concepts are directly provided)
 */
export async function updateConceptsFromAnswer(
  userId: number, 
  conceptsOrQuestionId: number | string[],
  gradeOrIsCorrect: string | boolean,
  isCorrect?: boolean
): Promise<void> {
  // Get the user for grade info if not provided
  const user = await storage.getUser(userId);
  if (!user) {
    console.error("User not found for concept mastery update");
    return;
  }
  
  // Case 1: Direct concepts array provided
  if (Array.isArray(conceptsOrQuestionId)) {
    const concepts = conceptsOrQuestionId;
    const grade = gradeOrIsCorrect as string;
    const correct = isCorrect === undefined ? false : isCorrect;
    
    console.log(`Updating concept mastery for user ${userId} with concepts:`, concepts);
    
    // Update mastery for each concept directly
    for (const concept of concepts) {
      await storage.updateConceptMastery(userId, concept, grade, correct);
    }
    return;
  }
  
  // Case 2: Question ID provided
  const questionId = conceptsOrQuestionId as number;
  const correct = gradeOrIsCorrect as boolean;
  
  console.log(`Updating concept mastery for user ${userId} from question ${questionId}`);
  
  // Fetch the question to get its concepts
  const question = await storage.getQuestion(questionId);
  if (!question || !question.concepts || question.concepts.length === 0) {
    console.log(`No concepts found for question ${questionId}`);
    return;
  }
  
  if (!user.grade) {
    console.error("User has no grade specified for concept mastery update");
    return;
  }
  
  // Update mastery for each concept in the question
  for (const concept of question.concepts) {
    await storage.updateConceptMastery(userId, concept, user.grade, correct);
  }
}

/**
 * Returns a recommended question for the user based on their learning history
 */
export async function getRecommendedQuestion(userId: number): Promise<Question | undefined> {
  const user = await storage.getUser(userId);
  if (!user || !user.grade) return undefined;
  
  // Generate recommendations if we don't have any
  let recommendations = await storage.getUserRecommendations(userId);
  if (!recommendations) {
    recommendations = await storage.generateRecommendations(userId);
  }
  
  // If we have concepts to review, prioritize questions that cover those concepts
  if (recommendations.conceptsToReview.length > 0) {
    // Try to find a question from a concept that needs review
    const conceptToReview = recommendations.conceptsToReview[
      Math.floor(Math.random() * recommendations.conceptsToReview.length)
    ];
    
    // Find questions that cover this concept
    const matchingQuestions = await storage.getQuestionsByConcept(
      user.grade, 
      conceptToReview
    );
    
    if (matchingQuestions.length > 0) {
      return matchingQuestions[Math.floor(Math.random() * matchingQuestions.length)];
    }
  }
  
  // If we have suggested categories, prioritize those
  if (recommendations.suggestedCategories.length > 0) {
    const suggestedCategory = recommendations.suggestedCategories[
      Math.floor(Math.random() * recommendations.suggestedCategories.length)
    ];
    
    // Get an adaptive question from this category with the recommended difficulty
    return storage.getAdaptiveQuestion(
      userId, 
      user.grade, 
      true, // Force dynamic to get fresh content
      suggestedCategory
    );
  }
  
  // If all else fails, get a standard adaptive question
  return storage.getAdaptiveQuestion(userId, user.grade);
}

/**
 * Generates learning recommendations for a user based on their performance
 */
export async function generateRecommendations(userId: number): Promise<Recommendation> {
  const user = await storage.getUser(userId);
  if (!user || !user.grade) {
    throw new Error("User not found or grade not set");
  }
  
  // Get user's concept masteries
  const conceptMasteries = await storage.getUserConceptMasteries(userId);
  
  // Gather concepts that need review based on performance
  const conceptsToReview = conceptMasteries
    .filter(m => m.needsReview)
    .map(m => m.concept);
  
  // Get user progress by category
  const userProgress = await storage.getUserProgress(userId);
  
  // Calculate category scores
  const categoryScores: Record<string, number> = {};
  userProgress.forEach(prog => {
    categoryScores[prog.category] = prog.score / Math.max(1, prog.completedQuestions);
  });
  
  // Find categories with low scores and suggest them
  const suggestedCategories = Object.entries(categoryScores)
    .filter(([_, score]) => score < 3.5) // Below average score
    .map(([category, _]) => category);
  
  // If user is doing well in all categories, suggest more advanced ones
  if (suggestedCategories.length === 0) {
    const validCategories = ["addition", "subtraction", "multiplication", "division", "fractions", "geometry", "time", "money"];
    
    // For K-1, focus on addition and subtraction
    if (user.grade === "K" || user.grade === "1") {
      suggestedCategories.push("addition", "subtraction");
    } 
    // For grade 2-3, introduce multiplication and division
    else if (user.grade === "2" || user.grade === "3") {
      suggestedCategories.push("multiplication", "division");
    }
    // For higher grades, focus on fractions and advanced concepts
    else {
      suggestedCategories.push("fractions", "geometry");
    }
  }
  
  // Find concepts the user hasn't practiced yet but should learn
  // based on their grade level
  const conceptsMastered = new Set(conceptMasteries.map(m => m.concept));
  const conceptsToLearn: string[] = [];
  
  // Grade-specific concepts to learn
  if (user.grade === "K") {
    if (!conceptsMastered.has("counting")) conceptsToLearn.push("counting");
    if (!conceptsMastered.has("shapes")) conceptsToLearn.push("shapes");
  } else if (user.grade === "1") {
    if (!conceptsMastered.has("place value")) conceptsToLearn.push("place value");
    if (!conceptsMastered.has("measurement")) conceptsToLearn.push("measurement");
  } else if (user.grade === "2") {
    if (!conceptsMastered.has("arrays")) conceptsToLearn.push("arrays");
    if (!conceptsMastered.has("money")) conceptsToLearn.push("money");
  } else if (user.grade === "3") {
    if (!conceptsMastered.has("fractions")) conceptsToLearn.push("fractions");
    if (!conceptsMastered.has("time calculation")) conceptsToLearn.push("time calculation");
  } else if (user.grade === "4") {
    if (!conceptsMastered.has("decimal values")) conceptsToLearn.push("decimal values");
    if (!conceptsMastered.has("area")) conceptsToLearn.push("area");
  } else {
    if (!conceptsMastered.has("ratios")) conceptsToLearn.push("ratios");
    if (!conceptsMastered.has("percentages")) conceptsToLearn.push("percentages");
  }
  
  // Calculate appropriate difficulty level based on performance
  let difficultyLevel = 1;
  if (user.questionsAnswered > 0) {
    const correctRate = user.correctAnswers / user.questionsAnswered;
    if (correctRate > 0.8) difficultyLevel = Math.min(5, difficultyLevel + 1);
    else if (correctRate < 0.5) difficultyLevel = Math.max(1, difficultyLevel - 1);
  }
  
  // Create new recommendation
  return storage.createRecommendation({
    userId,
    conceptsToReview,
    conceptsToLearn,
    suggestedCategories,
    difficultyLevel,
    recommendationData: {
      performance: {
        correctRate: user.questionsAnswered > 0 ? user.correctAnswers / user.questionsAnswered : 0,
        totalAnswered: user.questionsAnswered
      },
      categoryProgress: userProgress.map(p => ({
        category: p.category,
        level: p.level,
        score: p.score,
        completedQuestions: p.completedQuestions
      }))
    }
  });
}