import { storage } from "./storage";
import { Question, Recommendation, ConceptMastery } from "@shared/schema";
import { openai } from "./openai";

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
    const validCategories = ["addition", "subtraction", "multiplication", "division", "fractions", "time"];
    
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
      suggestedCategories.push("fractions");
    }
  }
  
  // Find concepts the user hasn't practiced yet but should learn
  // based on their grade level
  const conceptsMastered = new Set(conceptMasteries.map(m => m.concept));
  const conceptsToLearn: string[] = [];
  
  // Grade-specific concepts to learn
  if (user.grade === "K") {
    if (!conceptsMastered.has("counting")) conceptsToLearn.push("counting");
  } else if (user.grade === "1") {
    if (!conceptsMastered.has("place value")) conceptsToLearn.push("place value");
    if (!conceptsMastered.has("measurement")) conceptsToLearn.push("measurement");
  } else if (user.grade === "2") {
    if (!conceptsMastered.has("arrays")) conceptsToLearn.push("arrays");
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

/**
 * Generate personalized questions using OpenAI based on analytics and module history
 */
export async function generatePersonalizedQuestions({
  user,
  analytics,
  moduleHistory,
  validModules,
  weakConcepts,
  maxQuestions = 10
}: {
  user: any;
  analytics: any;
  moduleHistory: any[];
  validModules: string[];
  weakConcepts: string[];
  maxQuestions?: number;
}): Promise<Question[]> {
  console.log('Starting personalized question generation');
  
  try {
    // Create context for OpenAI from both data sources
    const userContext = {
      grade: user.grade || 'K',
      weakConcepts: weakConcepts.slice(0, 5), // Limit to top 5 weak concepts
      validModules: validModules.slice(0, 3), // Limit to top 3 modules
      recentPerformance: moduleHistory.slice(0, 5).map(h => ({
        module: h.moduleName,
        score: h.finalScore,
        questionsCorrect: h.questionsCorrect,
        questionsTotal: h.questionsTotal
      })),
      strengths: analytics.strengthConcepts || [],
      learningStyle: analytics.learningStyle || 'Visual'
    };

    console.log('User context for recommendations:', userContext);

    // Generate questions using OpenAI
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert math educator creating personalized quiz questions for a ${userContext.grade} grade student. 

IMPORTANT: Only create questions for concepts the student has attempted before (valid modules: ${validModules.join(', ')}).

Student Profile:
- Grade: ${userContext.grade}
- Weak Concepts: ${weakConcepts.join(', ')}
- Learning Style: ${userContext.learningStyle}
- Recent Performance: ${JSON.stringify(userContext.recentPerformance)}

Create ${maxQuestions} questions that:
1. Focus on weak concepts but are achievable
2. Match the student's grade level
3. Use their learning style (${userContext.learningStyle})
4. Build confidence while addressing gaps

Format each question as JSON with: question, answer, options (4 choices), category, difficulty (1-5), concepts (array).`
        },
        {
          role: "user",
          content: `Generate ${maxQuestions} personalized math questions focusing on these weak concepts: ${weakConcepts.join(', ')}. 

Only include concepts from modules the student has attempted: ${validModules.join(', ')}.

Return a JSON array of questions.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiContent = openaiResponse.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse OpenAI response
    let generatedQuestions: Question[] = [];
    try {
      const parsed = JSON.parse(aiContent);
      generatedQuestions = Array.isArray(parsed) ? parsed : [parsed];
    } catch (parseError) {
      console.error('Failed to parse OpenAI response, using fallback');
      throw parseError;
    }

    // Validate and enhance questions
    const validQuestions = generatedQuestions
      .filter(q => q.question && q.answer && q.options && q.options.length >= 4)
      .map((q, index) => ({
        id: Date.now() + index, // Temporary ID
        question: q.question,
        answer: q.answer,
        options: q.options,
        category: q.category || 'general',
        difficulty: q.difficulty || 3,
        concepts: q.concepts || weakConcepts.slice(0, 2),
        grade: user.grade || 'K'
      }))
      .slice(0, maxQuestions);

    console.log(`Generated ${validQuestions.length} personalized questions`);
    return validQuestions;

  } catch (error) {
    console.error('OpenAI question generation failed, using fallback:', error);
    
    // Fallback: Generate questions from existing database
    return generateFallbackQuestions(user, weakConcepts, validModules, maxQuestions);
  }
}

/**
 * Fallback question generation when OpenAI is unavailable
 */
async function generateFallbackQuestions(
  user: any, 
  weakConcepts: string[], 
  validModules: string[], 
  maxQuestions: number
): Promise<Question[]> {
  console.log('Using fallback question generation');
  
  const questions: Question[] = [];
  const grade = user.grade || 'K';
  
  // Try to get questions for weak concepts from database
  for (const concept of weakConcepts.slice(0, 3)) {
    try {
      const conceptQuestions = await storage.getQuestionsByGradeAndConcept(grade, concept);
      if (conceptQuestions.length > 0) {
        questions.push(...conceptQuestions.slice(0, 3));
      }
    } catch (error) {
      console.error(`Failed to get questions for concept ${concept}:`, error);
    }
  }
  
  // If we don't have enough questions, get general questions for the grade
  if (questions.length < maxQuestions) {
    try {
      const generalQuestions = await storage.getQuestionsByGrade(grade);
      questions.push(...generalQuestions.slice(0, maxQuestions - questions.length));
    } catch (error) {
      console.error('Failed to get general questions:', error);
    }
  }
  
  return questions.slice(0, maxQuestions);
}