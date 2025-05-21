import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { questions, User, UserProgress } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";

/**
 * Import the efficient, deterministic math facts module
 */
import {
  getNextMathFact,
  generateFallbackWordProblem,
  MathOperation,
} from "./mathFacts";

import {
  analyzeStudentResponse,
  generateMathHint,
  explainMathConcept,
  generateAdaptiveQuestion,
  predictStudentPerformance,
  generateConceptMap,
  generateMathTimeline,
  generateAchievements,
} from "./openai";

// Cache configuration
const CACHE_MAX_SIZE = 500; // Maximum number of items to keep in cache
const CACHE_TTL = 12 * 60 * 60 * 1000; // Cache time-to-live (12 hours in milliseconds)

// Define cache entry type for better type safety
interface CacheEntry {
  question: any; // The question object
  timestamp: number; // When it was added to cache
}

// Map to store cached questions with timestamp for TTL management
const questionCache = new Map<string, CacheEntry>();

// Helper function to create a consistent cache key for questions
function getQuestionCacheKey(
  userId: number,
  grade: string,
  category: string | undefined,
  previousQuestionCount: number,
): string {
  // Create cache buckets based on how many questions the user has already seen (in blocks of 5)
  // This ensures students at similar progress levels get appropriately challenging questions
  const progressBucket = Math.floor(previousQuestionCount / 5) * 5;
  return `question-${userId}-${grade}-${category || "all"}-${progressBucket}`;
}

// Function to purge old cache entries (called periodically)
function cleanCache() {
  const now = Date.now();
  let expiredCount = 0;

  // Convert entries to array to avoid MapIterator issues
  Array.from(questionCache.entries()).forEach(([key, entry]) => {
    if (now - entry.timestamp > CACHE_TTL) {
      questionCache.delete(key);
      expiredCount++;
    }
  });

  // If cache is too large, remove oldest entries
  if (questionCache.size > CACHE_MAX_SIZE) {
    const entriesToRemove = questionCache.size - CACHE_MAX_SIZE;
    const entries = Array.from(questionCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, entriesToRemove);

    for (const [key] of entries) {
      questionCache.delete(key);
    }
  }
}

// Periodically clean the cache (every hour)
setInterval(cleanCache, 60 * 60 * 1000);

// Helper to safely access req.user
function getUserId(req: Request): number {
  if (!req.user || !req.user.id) {
    throw new Error("User is not authenticated or has no ID");
  }
  return req.user.id;
}

// Helper for standardized error responses
function errorResponse(
  res: Response,
  status: number,
  message: string,
  error: unknown,
): void {
  console.error(`Error: ${message}`, error);
  res.status(status).json({
    message,
    error: error instanceof Error ? error.message : String(error),
  });
}

// Authentication middleware
const ensureAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Get available subjects for a grade
  app.get("/api/subjects/available/:grade", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { grade } = req.params;

      const availableSubjects = await storage.getAvailableSubjectsForGrade(userId, grade);
      res.json(availableSubjects);
    } catch (error) {
      console.error("Error fetching available subjects:", error);
      res.status(500).json({
        message: "Failed to fetch available subjects",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get subject masteries for the current user
  // Initialize subject masteries for a grade
app.post("/api/subject-mastery/initialize", ensureAuthenticated, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { grade } = req.body;

    if (!grade) {
      return res.status(400).json({ message: "Grade is required" });
    }

    // Get available subjects for this grade
    const subjects = ['addition', 'subtraction', 'multiplication', 'division', 'fractions'].filter(subject => {
      // Filter subjects based on grade level
      const gradeNum = parseInt(grade);
      if (gradeNum <= 2) return ['addition', 'subtraction'].includes(subject);
      if (gradeNum <= 4) return !['geometry', 'algebra'].includes(subject);
      return true;
    });

    // Initialize each subject
    const initializedSubjects = [];
    for (const subject of subjects) {
      const mastery = await storage.unlockGradeForSubject(userId, subject, grade);
      initializedSubjects.push(mastery);
    }

    res.json(initializedSubjects);
  } catch (error) {
    console.error("Error initializing subject masteries:", error);
    res.status(500).json({
      message: "Failed to initialize subject masteries",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get("/api/subject-masteries", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const subjectMasteries = await storage.getUserSubjectMasteries(userId);
      
      res.json(subjectMasteries);
    } catch (error) {
      console.error("Error fetching subject masteries:", error);
      res.status(500).json({
        message: "Failed to fetch subject masteries",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get all questions (with filters)
  app.get("/api/questions", ensureAuthenticated, async (req, res) => {
    try {
      const { grade, category } = req.query;

      let dbQuestions;
      if (grade) {
        dbQuestions = await storage.getQuestionsByGrade(
          grade as string,
          category as string,
        );
      } else {
        // Get all questions (implement pagination later)
        dbQuestions = await db.select().from(questions).limit(100);
      }

      res.json(dbQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({
        message: "Failed to fetch questions",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // API endpoint for testing the math facts functionality
  app.get("/api/test/math-facts", async (req, res) => {
    const { grade = "3", operation = "multiplication" } = req.query;
    try {
      const question = getNextMathFact(
        grade as string,
        operation as MathOperation,
      );
      res.json(question);
    } catch (error) {
      console.error("Error testing math facts:", error);
      res.status(500).json({
        message: "Failed to generate test math facts",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Debug OpenAI connectivity
  app.get("/api/debug/test-openai", async (req, res) => {
    try {
      // This endpoint would use OpenAI for testing
      res.json({ message: "OpenAI connectivity test endpoint" });
    } catch (error) {
      console.error("OpenAI test error:", error);
      res.status(500).json({
        message: "Failed to test OpenAI",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Debug question generation
  app.get("/api/debug/generate-question", async (req, res) => {
    const { grade = "3", category = "addition" } = req.query;
    try {
      // This would use a question generation function
      res.json({ message: "Question generation debug endpoint" });
    } catch (error) {
      console.error("Question generation error:", error);
      res.status(500).json({
        message: "Failed to generate question",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Math Facts endpoint - uses our efficient O(1) algorithm
  app.get("/api/questions/math-facts", async (req, res) => {
    try {
      const { grade = "3", operation = "addition" } = req.query;

      // Generate an efficient math fact question
      const question = getNextMathFact(
        grade as string,
        operation as MathOperation,
      );

      res.json(question);
    } catch (error) {
      console.error("Error generating math facts question:", error);
      res.status(500).json({
        message: "Failed to generate math facts question",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Next endpoint: questions/next
  app.get("/api/questions/next", ensureAuthenticated, async (req, res) => {
    try {
      const { grade, category, excludeIds } = req.query;
      const userId = getUserId(req);

      let parsedExcludeIds: number[] = [];
      if (excludeIds) {
        try {
          parsedExcludeIds = JSON.parse(excludeIds as string);
        } catch (err) {
          console.error("Failed to parse excludeIds:", err);
        }
      }

      const question = await storage.getAdaptiveQuestion(
        userId,
        grade as string,
        req.query.forceDynamic === "true",
        category as string,
        parsedExcludeIds,
      );

      if (!question) {
        return res.status(404).json({ message: "No questions available" });
      }

      res.json(question);
    } catch (error) {
      console.error("Error fetching next question:", error);
      res.status(500).json({
        message: "Failed to fetch next question",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get(
    "/api/questions/concept/:grade/:concept",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const { grade, concept } = req.params;
        const questions = await storage.getQuestionsByConcept(grade, concept);

        if (!questions || questions.length === 0) {
          return res
            .status(404)
            .json({ message: "No questions found for this concept" });
        }

        res.json(questions);
      } catch (error) {
        errorResponse(res, 500, "Failed to fetch questions by concept", error);
      }
    },
  );

  app.get(
    "/api/questions/grade/:grade",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const { grade } = req.params;
        const { category } = req.query;
        const questions = await storage.getQuestionsByGrade(
          grade,
          category as string,
        );

        if (!questions || questions.length === 0) {
          return res
            .status(404)
            .json({ message: "No questions found for this grade" });
        }

        res.json(questions);
      } catch (error) {
        errorResponse(res, 500, "Failed to fetch questions by grade", error);
      }
    },
  );

  app.get("/api/questions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestion(questionId);

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.json(question);
    } catch (error) {
      errorResponse(res, 500, "Failed to fetch question", error);
    }
  });

  app.get("/api/categories", ensureAuthenticated, async (req, res) => {
    try {
      // For now, we use a hardcoded list of categories
      const categories = [
        "addition",
        "subtraction",
        "multiplication",
        "division",
        "fractions",
        "decimals",
        "geometry",
        "measurement",
        "time",
        "money",
      ];

      res.json(categories);
    } catch (error) {
      errorResponse(res, 500, "Failed to fetch categories", error);
    }
  });

  app.get("/api/concepts", ensureAuthenticated, async (req, res) => {
    try {
      const { grade } = req.query;

      if (!grade) {
        return res.status(400).json({ message: "Grade parameter is required" });
      }

      const concepts = await storage.getConceptsForGrade(grade as string);

      if (!concepts || concepts.length === 0) {
        return res
          .status(404)
          .json({ message: "No concepts found for this grade" });
      }

      res.json(concepts);
    } catch (error) {
      errorResponse(res, 500, "Failed to fetch concepts", error);
    }
  });

  app.get("/api/progress", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const progress = await storage.getUserProgress(userId);

      res.json(progress);
    } catch (error) {
      errorResponse(res, 500, "Failed to fetch user progress", error);
    }
  });

  app.get("/api/leaderboard", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Fetching leaderboard data...");
      const leaderboard = await storage.getLeaderboard();
      console.log(`Leaderboard fetched: ${leaderboard.length} entries`);
      console.log("Sample data:", leaderboard.slice(0, 2));
      res.json(leaderboard);
    } catch (error) {
      console.error("Error in leaderboard fetch:", error);
      errorResponse(res, 500, "Failed to fetch leaderboard data", error);
    }
  });

  // AI Math Tutor endpoints
  app.post("/api/tutor/feedback", ensureAuthenticated, async (req, res) => {
    try {
      const { question, studentAnswer, correctAnswer } = req.body;

      if (!question || !studentAnswer || !correctAnswer) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const feedback = await analyzeStudentResponse(
        question,
        studentAnswer,
        correctAnswer,
      );
      res.json(feedback);
    } catch (error) {
      console.error("Error analyzing student response:", error);
      res.status(500).json({
        error: "Failed to analyze response",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/tutor/hint", ensureAuthenticated, async (req, res) => {
    try {
      const { question, grade, previousAttempts } = req.body;

      if (!question || !grade) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const hint = await generateMathHint(
        question,
        grade,
        previousAttempts || 0,
      );
      res.json({ hint });
    } catch (error) {
      console.error("Error generating math hint:", error);
      res.status(500).json({
        error: "Failed to generate hint",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/tutor/explain", ensureAuthenticated, async (req, res) => {
    try {
      const { concept, grade } = req.body;

      if (!concept || !grade) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const explanation = await explainMathConcept(concept, grade);
      res.json({ explanation });
    } catch (error) {
      console.error("Error explaining math concept:", error);
      res.status(500).json({
        error: "Failed to explain concept",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // AI Analytics endpoints
  // Get current analytics
  app.get("/api/analytics", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Get analytics data
      let analytics = await storage.getUserAnalytics(userId);

      // Get concept masteries for the user
      const conceptMasteries = await storage.getUserConceptMasteries(userId);

      // Get recent progress data for charts
      const progressData = await storage.getUserProgress(userId);

      // Transform progress data for frontend charts
      // Handle fields that may not exist in the progress data
      // Using type assertion to handle properties that might not exist in the type definition
      // but could be present in the actual data
      const recentProgress = progressData
        .sort((a, b) => {
          // Safely get dates with optional properties using type assertion for additional properties
          const dateA = (a as any).updatedAt
            ? new Date((a as any).updatedAt).getTime()
            : (a as any).date
              ? new Date((a as any).date).getTime()
              : 0;
          const dateB = (b as any).updatedAt
            ? new Date((b as any).updatedAt).getTime()
            : (b as any).date
              ? new Date((b as any).date).getTime()
              : 0;
          return dateB - dateA;
        })
        .slice(0, 10)
        .reverse()
        .map((p) => ({
          date: (p as any).updatedAt
            ? new Date((p as any).updatedAt).toLocaleDateString()
            : (p as any).date
              ? new Date((p as any).date).toLocaleDateString()
              : new Date().toLocaleDateString(),
          score: p.score || 0,
          questionsAnswered:
            p.completedQuestions || (p as any).questionsAnswered || 0,
          timeSpent: (p as any).timeSpent || 0,
        }));

      // Create a placeholder analytics object if none exists
      // This ensures the client always has something to display
      if (!analytics) {
        analytics = {
          id: 0,
          userId,
          analysisDate: new Date(),
          learningPatterns: {},
          recommendations:
            "Complete more questions to get personalized recommendations.",
          strengths: [],
          areasForImprovement: [],
          engagementAnalysis: {},
          suggestedActivities: [],
          learningStyle: "Visual",
          strengthConcepts: [],
          weaknessConcepts: [],
          recommendedActivities: [],
          generatedAt: new Date(),
        };
      }

      // The client expects analytics to be nested under the "analytics" key
      res.json({
        analytics: {
          analytics, // This nesting is intentional to match client expectations
          conceptMasteries,
          recentProgress,
        },
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({
        error: "Failed to fetch analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Handle answer submissions with improved type safety and error handling
  app.post("/api/answer", ensureAuthenticated, async (req, res) => {
    try {
      // Safely access the user ID
      const userId = getUserId(req);

      // Extract question ID and answer from request body with validation
      const {
        questionId,
        answer,
        originalAnswer,
        originalQuestion,
        category,
        grade,
        isCorrect: clientIsCorrect,
        tokensEarned: clientTokensEarned,
      } = req.body;

      // Check if this is a Math Facts module with pre-validated correctness
      const isMathFactsModule = category && category.startsWith("math-facts-");

      if (typeof questionId !== "number" || !answer) {
        return res.status(400).json({
          message: "Invalid request parameters",
          error: "Question ID must be a number and answer must be provided",
        });
      }

      // Fetch the question to validate answer if not provided in request
      let question;
      let correctAnswer = originalAnswer;

      if (!correctAnswer) {
        // If original answer not provided, fetch from database
        question = await storage.getQuestion(questionId);

        if (!question) {
          return res.status(404).json({
            message: "Question not found",
            error: `No question found with ID ${questionId}`,
          });
        }

        correctAnswer = question.answer;
      }

      // For Math Facts, we can trust client validation (better UX, pre-computed)
      if (isMathFactsModule && clientIsCorrect !== undefined) {
        console.log(
          `Math Facts answer: using client-provided correctness: ${clientIsCorrect}`,
        );
      }

      // For Math Facts, we can use client-provided validation (for better UX) or calculate on server
      let isCorrect;
      let tokensEarned;

      if (isMathFactsModule && clientIsCorrect !== undefined) {
        // Use client-provided correctness for Math Facts
        isCorrect = clientIsCorrect;
        tokensEarned =
          clientTokensEarned !== undefined
            ? clientTokensEarned
            : isCorrect
              ? 3
              : 0;
        console.log(
          `Math Facts: Using client-validated answer (${answer}), correct: ${isCorrect}, tokens: ${tokensEarned}`,
        );
      } else {
        // Standard server-side validation for all other question types
        isCorrect =
          String(answer).trim().toLowerCase() ===
          String(correctAnswer).trim().toLowerCase();
        tokensEarned = isCorrect ? calculateTokenReward(question) : 0;
      }

      // Cast session to 'any' to avoid TypeScript errors
      const sessionData = req.session as any;

      // Initialize or update session batch tracking
      if (!sessionData.currentBatch) {
        // Start a new batch
        sessionData.currentBatch = {
          questions: [questionId],
          correctAnswers: isCorrect ? [questionId] : [],
          start: new Date(),
          count: 1,
        };
        console.log("Started new question batch:", sessionData.currentBatch);
      } else {
        // Update existing batch
        sessionData.currentBatch.questions.push(questionId);
        if (isCorrect) {
          sessionData.currentBatch.correctAnswers.push(questionId);
        }
        sessionData.currentBatch.count += 1;
        console.log("Updated batch progress:", sessionData.currentBatch);
      }

      // Check if this completes a batch of 5 questions
      const batchComplete = sessionData.currentBatch.count >= 5;

      // Check if all 5 answers in the batch were correct for the perfect score bonus
      const allCorrect =
        batchComplete && sessionData.currentBatch.correctAnswers.length === 5;

      // Calculate bonus tokens (20 tokens for perfect score in a batch of 5)
      const bonusTokens = allCorrect ? 20 : 0;

      // Reset batch if complete
      if (batchComplete) {
        console.log(
          `Batch complete! All correct: ${allCorrect}, bonus tokens: ${bonusTokens}`,
        );
        // We'll reset after the response is sent
      }

      // Update user progress and tokens
      if (userId) {
        try {
          // For all questions (including Math Facts), update the user's total tokens
          // Always update question stats, even if no tokens were earned
          if (req.user) {
            const user = req.user;

            // Calculate new values
            const newQuestionsAnswered = (user.questionsAnswered || 0) + 1;
            const newCorrectAnswers =
              (user.correctAnswers || 0) + (isCorrect ? 1 : 0);

            // Prepare the update with required fields
            const userUpdate: Partial<User> = {
              questionsAnswered: newQuestionsAnswered,
              correctAnswers: newCorrectAnswers,
            };

            // Calculate total tokens to add (question tokens + any batch bonus)
            let totalTokensToAdd = tokensEarned;

            // Add perfect score bonus if applicable
            if (bonusTokens > 0) {
              totalTokensToAdd += bonusTokens;
              console.log(`Adding perfect score bonus: +${bonusTokens} tokens`);
            }

            // Add tokens only if earned
            if (totalTokensToAdd > 0) {
              const currentTokens = user.tokens || 0;
              const newTokens = currentTokens + totalTokensToAdd;
              userUpdate.tokens = newTokens;

              // Update the user object in the request to reflect the token change
              user.tokens = newTokens;
            }

            // Update the user record with token count and statistics
            console.log(
              "DATABASE UPDATE: Updating user tokens and stats:",
              userUpdate,
            );
            const updatedUser = await storage.updateUser(userId, userUpdate);
            console.log(
              "DATABASE UPDATE: Updated user result:",
              updatedUser ? "Success" : "Failed",
            );

            // Also update user stats in the request object to reflect changes
            if (typeof newQuestionsAnswered === "number") {
              user.questionsAnswered = newQuestionsAnswered;
            }
            if (typeof newCorrectAnswers === "number") {
              user.correctAnswers = newCorrectAnswers;
            }
          }

          // For non-Math Facts questions, update additional progress metrics
          const category = question?.category || "general";

          if (!category.startsWith("math-facts-")) {
            // Update user progress in database with proper category name
            const normalizedCategory =
              category === "unknown" ? "general" : category;
            await storage.updateUserProgress(userId, normalizedCategory, {
              completedQuestions: 1,
              score: tokensEarned,
            });

            // Update concept mastery if applicable
            if (question?.concepts && question.concepts.length > 0) {
              for (const concept of question.concepts) {
                await storage.updateConceptMastery(
                  userId,
                  concept,
                  question.grade || "3",
                  isCorrect,
                );
              }
            }

            // Update subject mastery if applicable
            if (question?.category && question.grade) {
              await storage.updateSubjectMastery(
                userId,
                question.category,
                question.grade,
                isCorrect,
              );
            }
          }
        } catch (updateError) {
          console.error("Error updating progress:", updateError);
          // Continue - don't fail the answer submission if progress update fails
        }
      }

      // Send response with standardized format with complete stats
      // Including new batch completion and bonus info
      res.json({
        success: true,
        correct: isCorrect,
        tokensEarned,
        totalTokens: userId && req.user ? req.user.tokens : 0,
        questionsAnswered: userId && req.user ? req.user.questionsAnswered : 0,
        correctAnswers: userId && req.user ? req.user.correctAnswers : 0,
        correctAnswer: correctAnswer,
        batchComplete: batchComplete,
        bonusAwarded: bonusTokens > 0,
        bonusTokens: bonusTokens,
        newTokenTotal: userId && req.user ? req.user.tokens : 0,
      });

      // Reset the batch if it's complete - after sending the response
      if (batchComplete) {
        sessionData.currentBatch = undefined;
        console.log("Batch reset after completion");
      }
    } catch (error) {
      errorResponse(res, 500, "Failed to process answer submission", error);
    }
  });

  // Helper function to calculate token rewards based on question difficulty
  function calculateTokenReward(question: any): number {
    if (!question) return 1;

    // Base reward is difficulty level * 2 (default to difficulty 1 if not specified)
    const difficulty = question.difficulty || 1;
    let reward = difficulty * 2;

    // Cap the reward between 1 and 10 tokens
    return Math.max(1, Math.min(10, reward));
  }

  // Generate new analytics
  app.post("/api/analytics/generate", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Generate new analytics
      const analytics = await storage.generateUserAnalytics(userId);

      // Get concept masteries for the user
      const conceptMasteries = await storage.getUserConceptMasteries(userId);

      // Get recent progress data for charts
      const progressData = await storage.getUserProgress(userId);

      // Transform progress data for frontend charts
      const recentProgress = progressData
        .sort((a, b) => {
          // Safely get dates with optional properties using type assertion
          const dateA = (a as any).updatedAt
            ? new Date((a as any).updatedAt).getTime()
            : (a as any).date
              ? new Date((a as any).date).getTime()
              : 0;
          const dateB = (b as any).updatedAt
            ? new Date((b as any).updatedAt).getTime()
            : (b as any).date
              ? new Date((b as any).date).getTime()
              : 0;
          return dateB - dateA;
        })
        .slice(0, 10)
        .reverse()
        .map((p) => ({
          date: (p as any).updatedAt
            ? new Date((p as any).updatedAt).toLocaleDateString()
            : (p as any).date
              ? new Date((p as any).date).toLocaleDateString()
              : new Date().toLocaleDateString(),
          score: p.score || 0,
          questionsAnswered:
            p.completedQuestions || (p as any).questionsAnswered || 0,
          timeSpent: (p as any).timeSpent || 0,
        }));

      // Return the data in a structure matching what the client expects
      res.json({
        success: true,
        analytics: {
          analytics,
          conceptMasteries,
          recentProgress,
        },
      });
    } catch (error) {
      console.error("Error generating analytics:", error);
      res.status(500).json({
        error: "Failed to generate analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/analytics/predict", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const conceptMasteries = await storage.getUserConceptMasteries(userId);
      const progressHistory = await storage.getUserProgress(userId);

      const predictions = await predictStudentPerformance(
        userId,
        conceptMasteries,
        progressHistory,
      );
      res.json(predictions);
    } catch (error) {
      console.error("Error predicting student performance:", error);
      res.status(500).json({
        error: "Failed to predict performance",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get(
    "/api/concept-map/:grade/:concept",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const { grade, concept } = req.params;

        const conceptMap = await generateConceptMap(grade, concept);
        res.json(conceptMap);
      } catch (error) {
        console.error("Error generating concept map:", error);
        res.status(500).json({
          error: "Failed to generate concept map",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  app.get(
    "/api/math-timeline/:grade/:concept",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const { grade, concept } = req.params;

        const timeline = await generateMathTimeline(concept, grade);
        res.json(timeline);
      } catch (error) {
        console.error("Error generating math timeline:", error);
        res.status(500).json({
          error: "Failed to generate math timeline",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  app.post(
    "/api/achievements/generate",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const { grade, concepts } = req.body;

        if (!grade || !Array.isArray(concepts)) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const achievements = await generateAchievements(grade, concepts);
        res.json(achievements);
      } catch (error) {
        console.error("Error generating achievements:", error);
        res.status(500).json({
          error: "Failed to generate achievements",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // AI-driven adaptive question endpoint
  app.get("/api/questions/adaptive", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { grade, concept, category, difficulty } = req.query;

      // Only use this for non-math-facts content
      // Math facts should use the dedicated efficient generator
      if (category?.toString().startsWith("math-facts-")) {
        return res.redirect(
          `/api/questions/math-facts?grade=${grade}&operation=${category?.toString().split("-")[2]}`,
        );
      }

      const studentContext = {
        userId,
        grade: grade?.toString() || "3",
        concept: concept?.toString() || "general",
        category: category?.toString(),
        difficulty: difficulty ? parseInt(difficulty.toString()) : 3,
        forceDynamic: true,
        isMathFactsModule: false,
      };

      const generatedQuestion = await generateAdaptiveQuestion(studentContext);
      res.json(generatedQuestion);
    } catch (error) {
      console.error("Error generating adaptive question:", error);
      res.status(500).json({
        error: "Failed to generate adaptive question",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Math Rush routes
  app.get("/api/rush/types", async (req, res) => {
    try {
      console.log("Rush types API called with params:", req.query);
      const { operation = "addition" } = req.query;
      
      // Use the dedicated function to get question types
      const { getQuestionTypes } = await import("./mathRush");
      let types = await getQuestionTypes(operation as string);
      
      // If no types found, provide some defaults based on operation
      if (types.length === 0) {
        const isAddition = operation === "addition" || operation === "subtraction";
        
        if (isAddition) {
          types = ["ones", "addition"];
          console.log("No types found in database, using default addition types:", types);
        } else {
          types = ["multiplication", "times_tables"];
          console.log("No types found in database, using default multiplication types:", types);
        }
      }
      
      console.log("Returning types:", types);
      
      // Set proper content type
      res.setHeader('Content-Type', 'application/json');
      res.json({ types });
    } catch (error) {
      console.error('Error fetching question types:', error);
      res.status(500).json({ error: 'Failed to fetch types' });
    }
  });

  app.get("/api/rush/questions", async (req, res) => {
    try {
      const { mode = "addition", type } = req.query;
      const userId = getUserId(req);
      
      // Dynamically import the Math Rush functionality and rules
      const { getRushQuestions } = await import("./mathRush");
      const { MATH_RUSH_RULES } = await import("../shared/mathRushRules");
      
      // Validate that mode is one of the allowed modes
      if (!MATH_RUSH_RULES.modes.includes(mode as any)) {
        return res.status(400).json({ 
          error: `Invalid mode. Must be one of: ${MATH_RUSH_RULES.modes.join(', ')}` 
        });
      }
      
      const questions = await getRushQuestions(mode as any, type as string);
      res.json({ questions });
    } catch (error) {
      console.error('Error fetching rush questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });

  app.post("/api/rush/complete", async (req, res) => {
    try {
      const { correct, total, durationSec, mode } = req.body;
      const userId = getUserId(req);
      
      // Dynamically import the Math Rush functionality and rules
      const { calculateRushTokens } = await import("./mathRush");
      const { MATH_RUSH_RULES } = await import("../shared/mathRushRules");
      
      if (typeof correct !== 'number' || typeof total !== 'number' || typeof durationSec !== 'number') {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      
      // Validate session data - be more lenient
      if (correct < 0 || correct > total || total <= 0) {
        console.log('Invalid stats:', { correct, total, durationSec });
        return res.status(400).json({ error: 'Invalid session statistics' });
      }
      
      // Calculate tokens earned
      const tokens = calculateRushTokens(correct, total, durationSec);
      
      // Update user tokens in database if user is authenticated
      if (userId) {
        // Get current user
        const user = await storage.getUser(userId);
        if (user) {
          // Update user's tokens and track statistics using casting to handle type system conflicts
          const updatedUser = await storage.updateUser(userId, {
            tokens: (user.tokens || 0) + tokens,
            // Use type assertion to handle schema vs database mismatch
            ['questions_answered' as keyof typeof user]: ((user as any).questions_answered || 0) + total,
            ['correct_answers' as keyof typeof user]: ((user as any).correct_answers || 0) + correct
          });
          
          console.log(`DATABASE: Updating user ${userId} with data: { tokens: ${(user.tokens || 0) + tokens} }`);
          console.log(`DATABASE: User ${userId} update successful: ${(user.tokens || 0) + tokens}`);
          
          // Log the completion
          console.log(`User ${userId} completed Math Rush mode ${mode} with ${correct}/${total} correct in ${durationSec}s. Earned ${tokens} tokens.`);
        }
      }
      
      // Return the results
      res.json({ 
        tokens,
        correct,
        total,
        durationSec,
        mode
      });
    } catch (error) {
      console.error('Error completing rush:', error);
      res.status(500).json({ error: 'Failed to process completion' });
    }
  });

  // Endpoint to update user statistics
  app.post("/api/user/stats/update", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { questionsAnswered, correctAnswers, tokensEarned } = req.body;
      
      // Validate input
      if (typeof questionsAnswered !== 'number' || typeof correctAnswers !== 'number' || typeof tokensEarned !== 'number') {
        return res.status(400).json({ 
          error: 'Invalid input. Required numeric fields: questionsAnswered, correctAnswers, tokensEarned' 
        });
      }
      
      // Get current user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Calculate new statistics - using type assertions to handle schema conflicts
      const updatedStats = {
        tokens: (user.tokens || 0) + tokensEarned,
        // Use type assertions to bridge gap between TypeScript schema and database
        ['questions_answered' as keyof typeof user]: ((user as any).questions_answered || 0) + questionsAnswered,
        ['correct_answers' as keyof typeof user]: ((user as any).correct_answers || 0) + correctAnswers
      };
      
      // Update user in the database
      const updatedUser = await storage.updateUser(userId, updatedStats);
      
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update user statistics" });
      }
      
      console.log(`User ${userId} stats updated: +${questionsAnswered} questions, +${correctAnswers} correct, +${tokensEarned} tokens`);
      
      res.json({ 
        success: true,
        updated: {
          tokens: updatedUser.tokens,
          questions_answered: (updatedUser as any).questions_answered,
          correct_answers: (updatedUser as any).correct_answers
        }
      });
    } catch (error) {
      console.error("Error updating user statistics:", error);
      res.status(500).json({
        error: "Failed to update user statistics",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
