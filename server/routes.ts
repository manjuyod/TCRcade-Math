import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { questions, users, User, UserProgress, MultiplayerRoom } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  syncUserProgressData, 
  syncAllUsers, 
  calculateTokenPercentile, 
  calculateAccuracyPercentile,
  getCategoryLabel,
  calculateModuleCompletion,
  calculateModuleAccuracy
} from "./utils/data-sync";

// Player type for multiplayer functionality
type Player = {
  id: number;
  username: string;
  isHost: boolean;
  score: number;
  avatar?: string;
  grade?: string;
  isReady?: boolean;
};
import {
  calcTokensRush,
  calcTokensFacts,
  validateTokenAmount,
} from "./utils/token";

/**
 * Import the efficient, deterministic math facts module
 */
import {
  getNextMathFact,
  generateFallbackWordProblem,
  MathOperation,
} from "./modules/mathFacts";

/**
 * Import the fractions puzzle module
 */
import { generateFractionsPuzzle } from "./modules/fractionsPuzzle";
import { FRACTIONS_PUZZLE_RULES as R } from "../shared/fractionsPuzzleRules";

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

// Helper function for category labels
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    addition: "Addition",
    subtraction: "Subtraction", 
    multiplication: "Multiplication",
    division: "Division",
    fractions: "Fractions",
    decimals: "Decimals",
    geometry: "Geometry",
    measurement: "Measurement",
    time: "Time",
    money: "Money",
    algebra: "Pre-Algebra Basics",
    "math-facts-addition": "Addition Facts",
    "math-facts-subtraction": "Subtraction Facts",
    "math-facts-multiplication": "Multiplication Facts",
    "math-facts-division": "Division Facts",
    "fractions_puzzle": "Fractions Puzzle",
    "math_rush": "Math Rush",
    "decimal_defender": "Decimal Defender", 
    "ratios_proportions": "Ratios & Proportions",
    "measurement_mastery": "Measurement Mastery",
    "overall": "Overall Progress"
  };
  return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

// Helper functions for percentile calculations
async function calculateTokenPercentile(userTokens: number): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as total_users,
             SUM(CASE WHEN tokens < ${userTokens} THEN 1 ELSE 0 END) as users_below
      FROM users
    `);
    
    const row = result.rows[0] as any;
    const totalUsers = parseInt(row.total_users) || 1;
    const usersBelow = parseInt(row.users_below) || 0;
    
    return (usersBelow / totalUsers) * 100;
  } catch (error) {
    console.error("Error calculating token percentile:", error);
    return 50; // Default to 50th percentile on error
  }
}

async function calculateAccuracyPercentile(userAccuracy: number): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as total_users,
             SUM(CASE 
               WHEN questions_answered > 0 AND 
                    (correct_answers::float / questions_answered::float * 100) < ${userAccuracy}
               THEN 1 ELSE 0 END) as users_below
      FROM users
      WHERE questions_answered > 0
    `);
    
    const row = result.rows[0] as any;
    const totalUsers = parseInt(row.total_users) || 1;
    const usersBelow = parseInt(row.users_below) || 0;
    
    return (usersBelow / totalUsers) * 100;
  } catch (error) {
    console.error("Error calculating accuracy percentile:", error);
    return 50; // Default to 50th percentile on error
  }
}

// Import decimal defender module
import { generateDecimalDefenderQuestions } from "./modules/decimalDefender";
import { DECIMAL_DEFENDER_RULES } from "../shared/decimalDefenderRules";

// Import ratios module
import { generateRatiosQuestions, validateRatiosAnswer, getUserSkillLevel } from "./modules/ratios";
import { RATIOS_RULES } from "../shared/ratiosRules";

// Import measurement module
import { 
  getUserMeasurementProgress,
  getPracticeQuestions as getMeasurementPracticeQuestions,
  getTokenQuestions as getMeasurementTokenQuestions,
  validateMeasurementAnswer,
  calculateSessionResults,
  getUserMeasurementData 
} from "./modules/measurement";
import { MEASUREMENT_CONFIG } from "../shared/measurementRules";

// Import algebra module
import {
  getUserAlgebraProgress,
  getPracticeQuestions as getAlgebraPracticeQuestions,
  getTokenQuestions as getAlgebraTokenQuestions,
  getChallengeQuestions,
  sampleQuestions,
  updateAlgebraProgressSuccess,
  updateAlgebraProgressFailure,
  checkAndUpdateAlgebraLevel
} from "./modules/algebra";
import { ALGEBRA_CONFIG, parseAlgebraText, parseAlgebraAnswer, checkAlgebraAnswer } from "../shared/algebraRules";

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
  // Basic route logging for debugging
  app.use((req, res, next) => {
    // Only log API routes, skip static assets
    if (req.url.startsWith("/api/")) {
      console.log(`${req.method} ${req.url}`);
    }
    next();
  });

  // Set up authentication routes
  setupAuth(app);

  // Add basic API logging
  app.use("/api/*", (req, res, next) => {
    // Only log non-routine API calls for debugging
    if (
      !req.originalUrl.includes("/questions/next") &&
      !req.originalUrl.includes("/assets/")
    ) {
      console.log(`API: ${req.method} ${req.originalUrl}`);
    }
    next();
  });

  // Test endpoint for decimal defender
  app.get("/api/test/decimal-defender", async (req, res) => {
    try {
      const questions = await generateDecimalDefenderQuestions("rounding", 3);
      res.json({ success: true, questions });
    } catch (error) {
      console.error("Decimal defender test failed:", error);
      res.status(500).json({ error: "Test failed" });
    }
  });

  // Decimal Defender route - placed early to take priority
  app.get("/api/modules/decimal-defender/questions", async (req, res) => {
    try {
      const questions = await generateDecimalDefenderQuestions("rounding", 10);

      // Set proper headers
      res.setHeader("Content-Type", "application/json");
      res.json(questions);
    } catch (error) {
      console.error("Error generating decimal questions:", error);
      res.status(500).json({ error: "Failed to generate decimal questions" });
    }
  });

  // Get available subjects for a grade
  app.get(
    "/api/subjects/available/:grade",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const userId = getUserId(req);
        const { grade } = req.params;

        const availableSubjects = await storage.getAvailableSubjectsForGrade(
          userId,
          grade,
        );
        res.json(availableSubjects);
      } catch (error) {
        console.error("Error fetching available subjects:", error);
        res.status(500).json({
          message: "Failed to fetch available subjects",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Get subject masteries for the current user
  // Initialize subject masteries for a grade
  app.post(
    "/api/subject-mastery/initialize",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const userId = getUserId(req);
        const { grade } = req.body;

        if (!grade) {
          return res.status(400).json({ message: "Grade is required" });
        }

        // Get available subjects for this grade
        const subjects = [
          "addition",
          "subtraction",
          "multiplication",
          "division",
          "fractions",
        ].filter((subject) => {
          // Filter subjects based on grade level
          const gradeNum = parseInt(grade);
          if (gradeNum <= 2)
            return ["addition", "subtraction"].includes(subject);
          if (gradeNum <= 4) return !["geometry", "algebra"].includes(subject);
          return true;
        });

        // Initialize each subject
        const initializedSubjects = [];
        for (const subject of subjects) {
          const mastery = await storage.unlockGradeForSubject(
            userId,
            subject,
            grade,
          );
          initializedSubjects.push(mastery);
        }

        res.json(initializedSubjects);
      } catch (error) {
        console.error("Error initializing subject masteries:", error);
        res.status(500).json({
          message: "Failed to initialize subject masteries",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Clear session data for fresh question generation
  app.post("/api/session/clear", ensureAuthenticated, async (req, res) => {
    try {
      // Clear session question tracking
      if (req.session) {
        (req.session as any).seenQuestions = [];
        (req.session as any).currentBatch = undefined;
      }

      console.log("Session data cleared for fresh question generation");
      res.json({ success: true, message: "Session cleared" });
    } catch (error) {
      console.error("Error clearing session:", error);
      res.status(500).json({
        success: false,
        message: "Failed to clear session",
        error: error instanceof Error ? error.message : String(error),
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
      
      // Sync data before returning progress to ensure consistency
      await syncUserProgressData(userId);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const hiddenGradeAsset = user.hiddenGradeAsset as any || {};
      const globalStats = hiddenGradeAsset.global_stats || {};
      const modules = hiddenGradeAsset.modules || {};

      // Use table fields as primary source (now synced)
      const totalTokens = user.tokens || 0;
      const totalQuestions = user.questionsAnswered || 0;
      const totalCorrect = user.correctAnswers || 0;
      const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

      // Calculate percentiles with synced data
      const [tokenPercentile, accuracyPercentile] = await Promise.all([
        calculateTokenPercentile(totalTokens),
        calculateAccuracyPercentile(accuracy)
      ]);

      // Build progress array with consistent data
      const progress = [];

      // Global progress using synced data
      progress.push({
        category: 'overall',
        label: 'Overall Progress',
        score: totalTokens,
        completion: Math.min(100, (totalTokens / 1000) * 100),
        questionsAnswered: totalQuestions,
        correctAnswers: totalCorrect,
        accuracy: Math.round(accuracy * 100) / 100,
        moduleData: {
          ...globalStats,
          synced: true,
          lastSync: new Date().toISOString()
        }
      });

      // Module progress - now with async completion calculation
      const moduleProgressPromises = Object.entries(modules).map(async ([moduleKey, moduleData]: [string, any]) => {
        if (moduleData && moduleData.progress) {
          const moduleProgress = moduleData.progress;
          // Pass the complete module data (including grade_level) to completion calculation
          const moduleWithGradeLevel = {
            ...moduleProgress,
            grade_level: moduleData.grade_level || moduleProgress.grade_level || 0
          };
          const completion = await calculateModuleCompletion(moduleKey, moduleWithGradeLevel);
          return {
            category: moduleKey,
            label: getCategoryLabel(moduleKey),
            score: moduleProgress.tokens_earned || 0,
            completion,
            questionsAnswered: moduleProgress.total_questions_answered || 0,
            correctAnswers: moduleProgress.correct_answers || 0,
            accuracy: calculateModuleAccuracy(moduleProgress),
            moduleData: moduleProgress
          };
        }
        return null;
      });

      const moduleProgressResults = await Promise.all(moduleProgressPromises);
      const validModuleProgress = moduleProgressResults.filter(item => item !== null);
      progress.push(...validModuleProgress);

      res.json({
        progress,
        globalStats: {
          totalTokens,
          totalQuestions,
          totalCorrect,
          accuracy: Math.round(accuracy * 100) / 100,
          tokenPercentile: Math.round(tokenPercentile * 100) / 100,
          accuracyPercentile: Math.round(accuracyPercentile * 100) / 100,
          synced: true,
          streak: user.streakDays || 0,
          lastActive: user.lastActive
        }
      });

    } catch (error) {
      errorResponse(res, 500, "Failed to fetch user progress", error);
    }
  });

  // Helper function to calculate percentile
  function calculatePercentile(value: number, allValues: number[]): number {
    if (allValues.length === 0) return 50;
    
    const sortedValues = allValues.sort((a, b) => a - b);
    const rank = sortedValues.filter(v => v < value).length;
    return Math.round((rank / sortedValues.length) * 100);
  }

  // Admin endpoint to manually trigger synchronization
  app.post("/api/admin/sync-user-data", ensureAuthenticated, async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (userId) {
        await syncUserProgressData(userId);
        res.json({ success: true, message: `User ${userId} synchronized` });
      } else {
        const syncedCount = await syncAllUsers();
        res.json({ 
          success: true, 
          message: `Synchronized ${syncedCount} users`,
          syncedCount 
        });
      }
    } catch (error) {
      errorResponse(res, 500, "Failed to synchronize user data", error);
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
            ? new Date((a as any).updatedAt).getTime()
            : (b as any).date
              ? new Date((a as any).date).getTime()
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

      const sessionData = req.session as any;

      // DEBUG: Log current session state
      console.log("=== ANSWER SUBMISSION DEBUG ===");
      console.log("Question ID:", req.body.questionId);
      console.log("Current session batch state:", sessionData.currentBatch);

      // SAFETY: Reset batch if it's somehow already complete or invalid
      if (sessionData.currentBatch) {
        if (sessionData.currentBatch.count >= 5) {
          console.log("WARNING: Found completed batch in session, resetting");
          sessionData.currentBatch = undefined;
        } else if (!Array.isArray(sessionData.currentBatch.questions)) {
          console.log("WARNING: Invalid batch structure, resetting");
          sessionData.currentBatch = undefined;
        }
      }
      // END DEBUG CODE

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
        // Calculate tokens using shared utility for consistency
        tokensEarned = isCorrect ? calcTokensFacts(1, 1) : 0;

        // Validate token amount
        if (!validateTokenAmount(tokensEarned)) {
          console.error(
            "Invalid token amount calculated for math facts:",
            tokensEarned,
          );
          tokensEarned = 0;
        }

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

      // Initialize or update session batch tracking
      if (!sessionData.currentBatch) {
        // Start a new batch
        sessionData.currentBatch = {
          questions: [questionId],
          correctAnswers: isCorrect ? [questionId] : [],
          start: new Date(),
          count: 1,
        };
        console.log("✅ Started new question batch:", sessionData.currentBatch);
      } else {
        // Update existing batch
        sessionData.currentBatch.questions.push(questionId);
        if (isCorrect) {
          sessionData.currentBatch.correctAnswers.push(questionId);
        }
        sessionData.currentBatch.count += 1;
        console.log("📊 Updated batch progress:", sessionData.currentBatch);
      }

      // 🔧 MORE DETAILED LOGGING
      console.log(
        `Batch status: ${sessionData.currentBatch.count}/5 questions`,
      );
      console.log(
        `Correct answers in batch: ${sessionData.currentBatch.correctAnswers.length}`,
      );

      // Check if this completes a batch of 5 questions
      const batchComplete = sessionData.currentBatch.count >= 5;
      console.log(
        `Batch complete check: ${sessionData.currentBatch.count} >= 5 = ${batchComplete}`,
      );

      // Check if all 5 answers in the batch were correct for the perfect score bonus
      const allCorrect =
        batchComplete && sessionData.currentBatch.correctAnswers.length === 5;
      console.log(
        `All correct check: batchComplete(${batchComplete}) && correctAnswers(${sessionData.currentBatch.correctAnswers.length}) === 5 = ${allCorrect}`,
      );

      // Calculate bonus tokens (20 tokens for perfect score in a batch of 5)
      const bonusTokens = allCorrect ? 20 : 0;
      console.log(`Bonus tokens awarded: ${bonusTokens}`);
      // END OF INSERTED BATCH LOGIC

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

            // Emit real-time token update to client if tokens were added
            if (totalTokensToAdd > 0 && updatedUser) {
              const tokenNamespace = (global as any).tokenNamespace;
              if (tokenNamespace) {
                tokenNamespace
                  .to(`user_${userId}`)
                  .emit("token_updated", updatedUser.tokens);
                console.log(
                  `Emitted token update for user ${userId}: ${updatedUser.tokens} tokens`,
                );
              }
            }

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
          const dateB = (a as any).updatedAt
            ? new Date((a as any).updatedAt).getTime()
            : (a as any).date
              ? new Date((a as any).date).getTime()
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
      const { getQuestionTypes } = await import("./modules/mathRush");
      let types = await getQuestionTypes(operation as string);

      // If no types found, provide some defaults based on operation
      if (types.length === 0) {
        const isAddition =
          operation === "addition" || operation === "subtraction";

        if (isAddition) {
          types = ["ones", "addition"];
          console.log(
            "No types found in database, using default addition types:",
            types,
          );
        } else {
          types = ["multiplication", "times_tables"];
          console.log(
            "No types found in database, using default multiplication types:",
            types,
          );
        }
      }

      console.log("Returning types:", types);

      // Set proper content type
      res.setHeader("Content-Type", "application/json");
      res.json({ types });
    } catch (error) {
      console.error("Error fetching question types:", error);
      res.status(500).json({ error: "Failed to fetch types" });
    }
  });

  app.get("/api/rush/questions", async (req, res) => {
    try {
      const { mode = "addition", type } = req.query;
      const userId = getUserId(req);

      // Dynamically import the Math Rush functionality and rules
      const { getRushQuestions } = await import("./modules/mathRush");
      const { MATH_RUSH_RULES } = await import("../shared/mathRushRules");

      // Validate that mode is one of the allowed modes
      if (!MATH_RUSH_RULES.modes.includes(mode as any)) {
        return res.status(400).json({
          error: `Invalid mode. Must be one of: ${MATH_RUSH_RULES.modes.join(", ")}`,
        });
      }

      const questions = await getRushQuestions(mode as any, type as string);
      res.json({ questions });
    } catch (error) {
      console.error("Error fetching rush questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.post("/api/rush/complete", async (req, res) => {
    try {
      const { correct, total, durationSec, mode } = req.body;
      const userId = getUserId(req);

      if (
        typeof correct !== "number" ||
        typeof total !== "number" ||
        typeof durationSec !== "number"
      ) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      // Validate session data - be more lenient
      if (correct < 0 || correct > total || total <= 0) {
        console.log("Invalid stats:", { correct, total, durationSec });
        return res.status(400).json({ error: "Invalid session statistics" });
      }

      // Calculate tokens earned using shared utility
      const tokens = calcTokensRush(correct, total, durationSec);

      // Validate token amount
      if (!validateTokenAmount(tokens)) {
        console.error("Invalid token amount calculated:", tokens);
        return res.status(500).json({ error: "Token calculation error" });
      }

      // Update user tokens in database if user is authenticated
      if (userId) {
        // Get current user
        const user = await storage.getUser(userId);
        if (user) {
          // Update user's tokens and track statistics using casting to handle type system conflicts
          const updatedUser = await storage.updateUser(userId, {
            tokens: (user.tokens || 0) + tokens,
            // Use type assertion to handle schema vs database mismatch
            ["questions_answered" as keyof typeof user]:
              ((user as any).questions_answered || 0) + total,
            ["correct_answers" as keyof typeof user]:
              ((user as any).correct_answers || 0) + correct,
          });

          const newBalance = (user.tokens || 0) + tokens;

          console.log(
            `DATABASE: Updating user ${userId} with data: { tokens: ${newBalance} }`,
          );
          console.log(
            `DATABASE: User ${userId} update successful: ${newBalance}`,
          );

          // Emit real-time token update to client
          const tokenNamespace = (global as any).tokenNamespace;
          if (tokenNamespace) {
            tokenNamespace
              .to(`user_${userId}`)
              .emit("token_updated", newBalance);
          }

          // Log the completion
          console.log(
            `User ${userId} completed Math Rush mode ${mode} with ${correct}/${total} correct in ${durationSec}s. Earned ${tokens} tokens.`,
          );
        }
      }

      // Return the results
      res.json({
        tokens,
        correct,
        total,
        durationSec,
        mode,
      });
    } catch (error) {
      console.error("Error completing rush:", error);
      res.status(500).json({ error: "Failed to process completion" });
    }
  });

  // Decimal Defender API routes
  app.get("/api/decimals/questions", async (req, res) => {
    try {
      const { skill = "rounding" } = req.query;

      const questions = await generateDecimalDefenderQuestions(
        skill as string,
        DECIMAL_DEFENDER_RULES.questionsPerSession,
      );

      res.json({ questions });
    } catch (error) {
      console.error("Error generating decimal questions:", error);
      res.status(500).json({ error: "Failed to generate questions" });
    }
  });

  app.post(
    "/api/decimal-defender/complete",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const { correct, total, skill } = req.body;
        const userId = getUserId(req);

        if (typeof correct !== "number" || typeof total !== "number") {
          return res.status(400).json({ error: "Invalid request data" });
        }

        // Calculate tokens
        const baseTokens =
          correct * DECIMAL_DEFENDER_RULES.tokensPerCorrectAnswer;
        const bonusTokens =
          correct === total ? DECIMAL_DEFENDER_RULES.bonusTokensOnPerfect : 0;
        const tokensEarned = baseTokens + bonusTokens;

        // Update user tokens
        const user = await storage.getUser(userId);
        if (user) {
          const updatedUser = await storage.updateUser(userId, {
            tokens: (user.tokens || 0) + tokensEarned,
            questionsAnswered: (user.questionsAnswered || 0) + total,
            correctAnswers: (user.correctAnswers || 0) + correct,
          });

          // Emit real-time token update to client
          const tokenNamespace = (global as any).tokenNamespace;
          if (tokenNamespace) {
            tokenNamespace
              .to(`user_${userId}`)
              .emit("token_updated", updatedUser?.tokens || 0);
          }

          console.log(
            `User ${userId} completed Decimal Defender with ${correct}/${total} correct. Earned ${tokensEarned} tokens.`,
          );
        }

        res.json({
          success: true,
          tokens: tokensEarned,
          totalTokens: (user?.tokens || 0) + tokensEarned,
          correct,
          total,
        });
      } catch (error) {
        console.error("Error completing decimal defender session:", error);
        res.status(500).json({ error: "Failed to complete session" });
      }
    },
  );

  // Fractions Puzzle routes
  app.get("/api/fractions/questions", async (req, res) => {
    try {
      const { skill = "define" } = req.query;

      const questions = Array.from({ length: R.questionCount }, (_, i) =>
        generateFractionsPuzzle(skill as any, i),
      );
      res.json({ questions });
    } catch (error) {
      console.error("Error generating fractions questions:", error);
      res.status(500).json({ error: "Failed to generate questions" });
    }
  });

  app.post("/api/fractions/complete", ensureAuthenticated, async (req, res) => {
    try {
      const { correct, total, skill } = req.body;
      const userId = getUserId(req);

      // Calculate tokens
      const tokens =
        Math.floor(correct / 5) * R.tokensPer5 +
        (correct === total ? R.bonusPerfect : 0);

      // Update user tokens
      const user = await storage.getUser(userId);
      if (user) {
        const updatedUser = await storage.updateUser(userId, {
          tokens: (user.tokens || 0) + tokens,
        });

        // Emit real-time token update to client
        const tokenNamespace = (global as any).tokenNamespace;
        if (tokenNamespace) {
          tokenNamespace
            .to(`user_${userId}`)
            .emit("token_updated", updatedUser?.tokens || 0);
        }
      }

      // Update concept mastery for fractions
      await storage.updateConceptMastery(
        userId,
        `fractions-${skill}`,
        "3", // Grade 3+ for fractions
        correct === total, // Perfect score means mastery
      );

      res.json({ tokens, totalTokens: (user?.tokens || 0) + tokens });
    } catch (error) {
      console.error("Error completing fractions puzzle:", error);
      res.status(500).json({ error: "Failed to complete session" });
    }
  });

  // Ratios & Proportions routes
  app.get("/api/ratios/questions", async (req, res) => {
    try {
      const { skill = "write_form" } = req.query;
      console.log("GET ratios questions for skill:", skill);

      const questions = generateRatiosQuestions(skill as any, 1);
      res.json({ questions });
    } catch (error) {
      console.error("Error generating ratios questions:", error);
      res.status(500).json({ error: "Failed to generate questions" });
    }
  });

  app.post("/api/ratios/questions", async (req, res) => {
    try {
      const { skill = "write_form" } = req.body;
      console.log("POST ratios questions for skill:", skill);

      const questions = generateRatiosQuestions(skill as any, 1);
      res.json({ questions });
    } catch (error) {
      console.error("Error generating ratios questions:", error);
      res.status(500).json({ error: "Failed to generate questions" });
    }
  });

  app.post("/api/ratios/submit", ensureAuthenticated, async (req, res) => {
    try {
      const { questionIndex, answer, skill, question } = req.body;
      const userId = getUserId(req);

      console.log("RATIOS DEBUG - Question:", JSON.stringify(question, null, 2));
      console.log("RATIOS DEBUG - User answer:", JSON.stringify(answer));
      console.log("RATIOS DEBUG - Expected answer:", question.correctAnswer);

      // Validate the answer
      const isCorrect = validateRatiosAnswer(question, answer);
      console.log("RATIOS DEBUG - Validation result:", isCorrect);

      // Calculate tokens for correct answers
      const tokensEarned = isCorrect ? RATIOS_RULES.questionCount : 0;

      // Update user tokens if correct
      if (isCorrect) {
        const user = await storage.getUser(userId);
        if (user) {
          const updatedUser = await storage.updateUser(userId, {
            tokens: (user.tokens || 0) + tokensEarned,
          });

          // Emit real-time token update
          const tokenNamespace = (global as any).tokenNamespace;
          if (tokenNamespace) {
            tokenNamespace
              .to(`user_${userId}`)
              .emit("token_updated", updatedUser?.tokens || 0);
          }
        }
      }

      res.json({ 
        correct: isCorrect,
        tokensEarned,
        explanation: isCorrect ? "Correct!" : "Keep practicing!"
      });
    } catch (error) {
      console.error("Error submitting ratios answer:", error);
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });

  app.post("/api/ratios/complete", ensureAuthenticated, async (req, res) => {
    try {
      const { correct, total, skill } = req.body;
      const userId = getUserId(req);

      // Calculate tokens based on performance
      const baseTokens = Math.floor((correct / total) * 50);
      const bonusTokens = correct === total ? 25 : 0;
      const totalTokens = baseTokens + bonusTokens;

      // Update user tokens
      const user = await storage.getUser(userId);
      if (user) {
        const updatedUser = await storage.updateUser(userId, {
          tokens: (user.tokens || 0) + totalTokens,
        });

        // Emit real-time token update
        const tokenNamespace = (global as any).tokenNamespace;
        if (tokenNamespace) {
          tokenNamespace
            .to(`user_${userId}`)
            .emit("token_updated", updatedUser?.tokens || 0);
        }
      }

      // Update concept mastery for ratios
      await storage.updateConceptMastery(
        userId,
        `ratios-${skill}`,
        "5", // Grade 5+ for ratios
        correct === total,
      );

      res.json({ 
        tokens: totalTokens, 
        totalTokens: (user?.tokens || 0) + totalTokens,
        correct,
        total,
      });
    } catch (error) {
      console.error("Error completing ratios session:", error);
      res.status(500).json({ error: "Failed to complete session" });
    }
  });

  // Measurement Mastery routes
  app.get("/api/measurement/progress", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { getUserMeasurementProgress, getUserMeasurementData } = await import('./modules/measurement');

      const progress = await getUserMeasurementProgress(userId);
      const userData = await getUserMeasurementData(userId);

      res.json({ progress, userData });
    } catch (error) {
      console.error("Error getting measurement progress:", error);
      res.status(500).json({ error: "Failed to get progress" });
    }
  });

  app.get("/api/measurement/questions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const runType = req.query.runType as string || 'practice';
      const { preloadMeasurementQuestions } = await import('./modules/measurement');

      if (!runType || !['practice', 'token'].includes(runType)) {
        return res.status(400).json({ error: "Invalid run type" });
      }

      const questions = await preloadMeasurementQuestions(userId, runType as any);
      res.json(questions);
    } catch (error) {
      console.error("Error loading measurement questions:", error);
      res.status(500).json({ error: "Failed to load questions" });
    }
  });

  app.post("/api/measurement/submit-session", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { runType, questions, totalTime, score } = req.body;
      const { calculateSessionResults } = await import('./modules/measurement');

      if (!runType || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: "Invalid submission data" });
      }

      const results = await calculateSessionResults(userId, questions, runType);

      // Emit real-time token update
      const tokenNamespace = (global as any).tokenNamespace;
      if (tokenNamespace && results.tokensEarned > 0) {
        const user = await storage.getUser(userId);
        if (user) {
          tokenNamespace
            .to(`user_${userId}`)
            .emit("token_updated", user.tokens || 0);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error submitting measurement session:", error);
      res.status(500).json({ error: "Failed to submit session" });
    }
  });

  // Pre-Algebra Basics routes
  app.get("/api/algebra/progress", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const progress = await getUserAlgebraProgress(userId);

      res.json({ progress });
    } catch (error) {
      console.error("Error getting algebra progress:", error);
      res.status(500).json({ error: "Failed to get progress" });
    }
  });

  app.get("/api/algebra/questions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const runType = req.query.runType as string || 'practice';

      if (!runType || !['practice', 'token'].includes(runType)) {
        return res.status(400).json({ error: "Invalid run type" });
      }

      const progress = await getUserAlgebraProgress(userId);
      const params = { grade_level: progress.grade_level, lesson: progress.lesson };

      let questions = [];

      if (runType === 'practice') {
        // Practice: TryIt sections only
        questions = await getAlgebraPracticeQuestions(params);
        questions = sampleQuestions(questions, ALGEBRA_CONFIG.practiceQuestionCount);
      } else {
        // Token run: Mix of regular and challenge questions
        const regularQuestions = await getAlgebraTokenQuestions(params);
        const challengeQuestions = await getChallengeQuestions(params);

        const selectedRegular = sampleQuestions(regularQuestions, ALGEBRA_CONFIG.tokenRunRegularCount);
        const selectedChallenge = sampleQuestions(challengeQuestions, ALGEBRA_CONFIG.tokenRunChallengeCount);

        questions = [...selectedRegular, ...selectedChallenge];
      }

      // Process questions to add category and parse content
      const processedQuestions = questions.map(q => ({
        ...q,
        category: 'algebra',
        questionText: q.AnswerBank?.question || q.Title || '',
        options: q.AnswerBank?.options || [],
        correctAnswers: parseAlgebraAnswer(q.CorrectAnswer)
      }));

      res.json(processedQuestions);
    } catch (error) {
      console.error("Error loading algebra questions:", error);
      res.status(500).json({ error: "Failed to load questions" });
    }
  });

  app.post("/api/algebra/submit-session", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { runType, questions, totalTime, score } = req.body;

      if (!runType || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: "Invalid submission data" });
      }

      const correctCount = questions.filter(q => q.isCorrect).length;
      const totalCount = questions.length;
      const sessionScore = totalCount > 0 ? correctCount / totalCount : 0;

      // Calculate tokens based on performance
      let tokensEarned = 0;
      if (sessionScore >= ALGEBRA_CONFIG.perfectScore) {
        tokensEarned = ALGEBRA_CONFIG.tokensForPerfect;
      } else if (sessionScore >= ALGEBRA_CONFIG.passingScore) {
        tokensEarned = ALGEBRA_CONFIG.tokensForPassing;
      }

      // Update user progress based on performance
      if (sessionScore >= ALGEBRA_CONFIG.passingScore) {
        await updateAlgebraProgressSuccess(userId);
      } else {
        await updateAlgebraProgressFailure(userId);
      }

      // Check for level changes
      const levelChange = await checkAndUpdateAlgebraLevel(userId);

      // Update user tokens
      const user = await storage.getUser(userId);
      if (user) {
        const updatedUser = await storage.updateUser(userId, {
          tokens: (user.tokens || 0) + tokensEarned,
          questionsAnswered: (user.questionsAnswered || 0) + totalCount,
          correctAnswers: (user.correctAnswers || 0) + correctCount,
        });

        // Emit real-time token update
        const tokenNamespace = (global as any).tokenNamespace;  
        if (tokenNamespace) {
          tokenNamespace
            .to(`user_${userId}`)
            .emit("token_updated", updatedUser?.tokens || 0);
        }
      }

      res.json({
        success: true,
        tokensEarned,
        totalTokens: (user?.tokens || 0) + tokensEarned,
        score: sessionScore,
        correctAnswers: correctCount,
        totalQuestions: totalCount,
        levelChange
      });
    } catch (error) {
      console.error("Error submitting algebra session:", error);
      res.status(500).json({ error: "Failed to submit session" });
    }
  });
  
  // Helper function to populate player data from user IDs
  async function populatePlayersData(participants: number[]): Promise<Player[]> {
    const players: Player[] = [];
    for (const userId of participants) {
      const user = await storage.getUser(userId);
      if (user) {
        players.push({
          id: user.id,
          username: user.username,
          isHost: false, // Will be set later
          score: 0,
          avatar: (user as any).avatar || undefined,
          grade: user.grade || undefined,
          isReady: false
        });
      }
    }
    return players;
  }

  // Get all available multiplayer rooms
  app.get("/api/multiplayer/rooms", async (req, res) => {
    try {
      const { grade } = req.query;
      const rooms = await storage.listActiveMultiplayerRooms(grade?.toString());
      
      // Populate player data for each room
      const roomsWithPlayers = await Promise.all(
        rooms.map(async (room) => {
          const players = await populatePlayersData(room.participants || []);
          // Mark the host
          const hostPlayer = players.find(p => p.id === room.hostId);
          if (hostPlayer) hostPlayer.isHost = true;
          
          return {
            ...room,
            players
          };
        })
      );
      
      res.json(roomsWithPlayers);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  // Get specific multiplayer room with player data
  app.get("/api/multiplayer/rooms/:id", async (req, res) => {
    try {
      const roomId = Number(req.params.id);
      console.log("API: GET /api/multiplayer/rooms/" + roomId);
      console.log("Fetching room with ID:", roomId);
      
      const room = await storage.getMultiplayerRoom(roomId); 
      if (!room) {
        console.log("Room not found:", roomId);
        return res.status(404).json({ error: 'Room not found' });
      }
      
      console.log("Room found:", room);
      
      // Populate player data
      const players = await populatePlayersData(room.participants || []);
      // Mark the host
      const hostPlayer = players.find(p => p.id === room.hostId);
      if (hostPlayer) hostPlayer.isHost = true;
      
      const roomWithPlayers = {
        ...room,
        players
      };
      
      res.json(roomWithPlayers);
    } catch (error) {
      console.error("Error fetching room:", error);
      res.status(500).json({ error: "Failed to fetch room" });
    }
  });
  
  // Create a multiplayer room
  app.post("/api/multiplayer/rooms", ensureAuthenticated, async (req, res) => {
    try {
      const { name, grade, category, maxPlayers, gameType, settings } = req.body;
      console.log("API: POST /api/multiplayer/rooms");
      console.log("Creating room with data:", { name, grade, category, maxPlayers, gameType, settings });
      
      if (!name || !grade || !category || !maxPlayers || !gameType || !settings) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const hostId = req.user!.id;
      
      const room = await storage.createMultiplayerRoom(hostId, {
        name, 
        grade, 
        category, 
        maxPlayers, 
        gameType, 
        settings
      });

      // Populate player data
      const players = await populatePlayersData(room.participants || []);
      // Mark the host
      const hostPlayer = players.find(p => p.id === room.hostId);
      if (hostPlayer) hostPlayer.isHost = true;

      const roomWithPlayers = {
        ...room,
        players
      };

      res.status(201).json(roomWithPlayers);
    } catch (error) {
      console.error("Failed to create room:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Join a multiplayer room
  app.post("/api/multiplayer/join", ensureAuthenticated, async (req, res) => {
    try {
      const { roomId, roomCode } = req.body;
      const userId = req.user!.id;
      
      console.log("API: POST /api/multiplayer/join");
      console.log("Join request:", { roomId, roomCode, userId });

      let room: MultiplayerRoom | undefined;

      if (roomId) {
        room = await storage.getMultiplayerRoom(roomId);
      } else if (roomCode) {
        room = await storage.getMultiplayerRoomByCode(roomCode);
      } else {
        return res.status(400).json({ error: "Room ID or code required" });
      }

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const success = await storage.joinMultiplayerRoom(room.id, userId);
      if (!success) {
        return res.status(400).json({ error: "Cannot join room (full or already joined)" });
      }

      res.json({ roomId: room.id });
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });

  // Leave a multiplayer room
  app.post("/api/multiplayer/leave", ensureAuthenticated, async (req, res) => {
    try {
      const { roomId } = req.body;
      const userId = req.user!.id;
      
      console.log("API: POST /api/multiplayer/leave");
      console.log("Leave request:", { roomId, userId });

      const success = await storage.leaveMultiplayerRoom(roomId, userId);
      if (!success) {
        return res.status(400).json({ error: "Cannot leave room" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving room:", error);
      res.status(500).json({ error: "Failed to leave room" });
    }
  });

  // Start a multiplayer game
  app.post("/api/multiplayer/start", ensureAuthenticated, async (req, res) => {
    try {
      const { roomId } = req.body;
      const userId = req.user!.id;
      
      console.log("API: POST /api/multiplayer/start");
      console.log("Start game request:", { roomId, userId });

      const room = await storage.getMultiplayerRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      if (room.hostId !== userId) {
        return res.status(403).json({ error: "Only host can start the game" });
      }

      // Generate questions for the game
      const settings = room.settings as any;
      const questionCount = settings?.questionCount || 10;
      const questions = await generateGameQuestions(room.grade || 'K', room.category || 'all', questionCount);

      // Update room with game state
      const gameState = {
        questions,
        currentQuestionIndex: 0,
        startTime: new Date(),
        playerAnswers: {}
      };

      await storage.updateMultiplayerRoom(roomId, {
        status: 'playing',
        startedAt: new Date(),
        gameState
      });

      // Get updated room with players
      const updatedRoom = await storage.getMultiplayerRoom(roomId);
      const players = await populatePlayersData(updatedRoom?.participants || []);
      const hostPlayer = players.find(p => p.id === updatedRoom?.hostId);
      if (hostPlayer) hostPlayer.isHost = true;

      res.json({
        success: true,
        room: {
          ...updatedRoom,
          players
        }
      });
    } catch (error) {
      console.error("Error starting game:", error);
      res.status(500).json({ error: "Failed to start game" });
    }
  });

  // Submit answer in multiplayer game
  app.post("/api/multiplayer/answer", ensureAuthenticated, async (req, res) => {
    try {
      const { roomId, answer } = req.body;
      const userId = req.user!.id;
      
      console.log("API: POST /api/multiplayer/answer");
      console.log("Answer submission:", { roomId, userId, answer });

      const room = await storage.getMultiplayerRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      if (room.status !== 'playing') {
        return res.status(400).json({ error: "Game is not active" });
      }

      const gameState = room.gameState as any;
      const currentQuestion = gameState?.questions?.[gameState.currentQuestionIndex];
      
      if (!currentQuestion) {
        return res.status(400).json({ error: "No current question" });
      }

      // Check answer
      const isCorrect = String(answer).trim().toLowerCase() === 
                       String(currentQuestion.correctAnswer).trim().toLowerCase();

      // Update player answers
      if (!gameState.playerAnswers) gameState.playerAnswers = {};
      if (!gameState.playerAnswers[userId]) gameState.playerAnswers[userId] = [];
      
      gameState.playerAnswers[userId].push({
        questionIndex: gameState.currentQuestionIndex,
        answer,
        isCorrect,
        timestamp: new Date()
      });

      // Check if all players have answered
      const participants = room.participants || [];
      const allAnswered = participants.every(playerId => 
        gameState.playerAnswers[playerId]?.some((a: any) => 
          a.questionIndex === gameState.currentQuestionIndex
        )
      );

      let nextQuestion = null;
      let gameOver = false;

      if (allAnswered) {
        // Move to next question or end game
        gameState.currentQuestionIndex += 1;
        
        if (gameState.currentQuestionIndex >= gameState.questions.length) {
          // Game over
          gameOver = true;
          await storage.updateMultiplayerRoom(roomId, {
            status: 'finished',
            endedAt: new Date(),
            gameState
          });
        } else {
          // Next question
          nextQuestion = gameState.questions[gameState.currentQuestionIndex];
          await storage.updateMultiplayerRoom(roomId, { gameState });
        }
      } else {
        // Update game state with new answer
        await storage.updateMultiplayerRoom(roomId, { gameState });
      }

      // Calculate tokens for correct answer
      const tokensEarned = isCorrect ? 2 : 0;
      if (tokensEarned > 0) {
        const user = await storage.getUser(userId);
        if (user) {
          await storage.updateUser(userId, {
            tokens: (user.tokens || 0) + tokensEarned
          });
        }
      }

      res.json({
        correct: isCorrect,
        nextQuestion,
        gameOver,
        tokensEarned
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });

  // Helper function to generate questions for multiplayer games
  async function generateGameQuestions(grade: string, category: string, count: number) {
    const questions = [];
    
    for (let i = 0; i < count; i++) {
      try {
        // Generate basic arithmetic questions for multiplayer
        if (category === 'math-facts-addition' || category === 'addition') {
          const num1 = Math.floor(Math.random() * 12) + 1;
          const num2 = Math.floor(Math.random() * 12) + 1;
          questions.push({
            id: `add-${i}`,
            questionText: `${num1} + ${num2} = ?`,
            correctAnswer: (num1 + num2).toString(),
            options: [],
            category: 'addition',
            grade
          });
        } else if (category === 'math-facts-multiplication' || category === 'multiplication') {
          const num1 = Math.floor(Math.random() * 12) + 1;
          const num2 = Math.floor(Math.random() * 12) + 1;
          questions.push({
            id: `mult-${i}`,
            questionText: `${num1} × ${num2} = ?`,
            correctAnswer: (num1 * num2).toString(),
            options: [],
            category: 'multiplication',
            grade
          });
        } else {
          // Generate a basic arithmetic question
          const num1 = Math.floor(Math.random() * 10) + 1;
          const num2 = Math.floor(Math.random() * 10) + 1;
          const operations = ['+', '-', '×'];
          const op = operations[Math.floor(Math.random() * operations.length)];
          
          let answer;
          switch (op) {
            case '+': answer = num1 + num2; break;
            case '-': answer = Math.max(num1, num2) - Math.min(num1, num2); break;
            case '×': answer = num1 * num2; break;
            default: answer = num1 + num2;
          }
          
          questions.push({
            id: `gen-${i}`,
            questionText: `${Math.max(num1, num2)} ${op} ${Math.min(num1, num2)} = ?`,
            correctAnswer: answer.toString(),
            options: [],
            category,
            grade
          });
        }
      } catch (error) {
        console.error("Error generating question:", error);
        // Basic fallback question
        questions.push({
          id: `fallback-${i}`,
          questionText: `2 + 2 = ?`,
          correctAnswer: "4",
          options: [],
          category,
          grade
        });
      }
    }
    
    return questions;
  }

  // Enhanced progress API endpoint with percentile calculations
  app.get("/api/progress", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Extract hiddenGradeAsset data
      const hiddenGradeAsset = user.hiddenGradeAsset as any || {};
      const modules = hiddenGradeAsset.modules || {};
      const globalStats = hiddenGradeAsset.global_stats || {};

      // Calculate global statistics
      let totalTokens = user.tokens || 0;
      let totalQuestions = user.questionsAnswered || 0;
      let totalCorrect = user.correctAnswers || 0;
      let accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

      // If hiddenGradeAsset has global stats, use those instead
      if (globalStats.total_tokens !== undefined) {
        totalTokens = globalStats.total_tokens;
      }
      if (globalStats.total_questions !== undefined) {
        totalQuestions = globalStats.total_questions;
      }
      if (globalStats.total_correct !== undefined) {
        totalCorrect = globalStats.total_correct;
        accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
      }

      // Calculate percentiles asynchronously
      const [tokenPercentile, accuracyPercentile] = await Promise.all([
        calculateTokenPercentile(totalTokens),
        calculateAccuracyPercentile(accuracy)
      ]);

      // Build module progress array
      const progress = [];

      // Add overall progress
      progress.push({
        category: 'overall',
        label: 'Overall Progress',
        score: totalTokens,
        completion: Math.min(100, (totalTokens / 1000) * 100), // Assume 1000 tokens = 100%
        questionsAnswered: totalQuestions,
        correctAnswers: totalCorrect,
        accuracy: accuracy,
        moduleData: globalStats
      });

      // Add individual module progress
      Object.entries(modules).forEach(([moduleKey, moduleData]: [string, any]) => {
        if (moduleData && moduleData.progress) {
          const progress_data = moduleData.progress;
          const tokens = progress_data.tokens_earned || 0;
          const questions = progress_data.total_questions_answered || 0;
          const correct = progress_data.correct_answers || 0;
          const moduleAccuracy = questions > 0 ? (correct / questions) * 100 : 0;
          
          // Calculate completion based on sessions and mastery
          let completion = 0;
          if (progress_data.sessions_completed) {
            completion = Math.min(100, (progress_data.sessions_completed / 10) * 100);
          }
          if (progress_data.mastery_level) {
            completion = Math.max(completion, 80);
          }

          progress.push({
            category: moduleKey,
            label: getCategoryLabel(moduleKey),
            score: tokens,
            completion: completion,
            questionsAnswered: questions,
            correctAnswers: correct,
            accuracy: moduleAccuracy,
            moduleData: progress_data
          });
        }
      });

      // Response format
      res.json({
        progress,
        globalStats: {
          totalTokens,
          totalQuestions,
          totalCorrect,
          accuracy: Math.round(accuracy * 100) / 100,
          tokenPercentile: Math.round(tokenPercentile * 100) / 100,
          accuracyPercentile: Math.round(accuracyPercentile * 100) / 100
        }
      });

    } catch (error) {
      console.error("Error fetching progress data:", error);
      res.status(500).json({ 
        error: "Failed to fetch progress data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Endpoint to update user statistics
  app.post("/api/user/stats/update", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { questionsAnswered, correctAnswers, tokensEarned } = req.body;

      // Validate input
      if (
        typeof questionsAnswered !== "number" ||
        typeof correctAnswers !== "number" ||
        typeof tokensEarned !== "number"
      ) {
        return res.status(400).json({
          error:
            "Invalid input. Required numeric fields: questionsAnswered, correctAnswers, tokensEarned",
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
        ["questions_answered" as keyof typeof user]:
          ((user as any).questions_answered || 0) + questionsAnswered,
        ["correct_answers" as keyof typeof user]:
          ((user as any).correct_answers || 0) + correctAnswers,
      };

      // Update user in the database
      const updatedUser = await storage.updateUser(userId, updatedStats);

      if (!updatedUser) {
        return res
          .status(500)
          .json({ error: "Failed to update user statistics" });
      }

      console.log(
        `User ${userId} stats updated: +${questionsAnswered} questions, +${correctAnswers} correct, +${tokensEarned} tokens`,
      );

      res.json({
        success: true,
        updated: {
          tokens: updatedUser.tokens,
          questions_answered: (updatedUser as any).questions_answered,
          correct_answers: (updatedUser as any).correct_answers,
        },
      });
    } catch (error) {
      console.error("Error updating user statistics:", error);
      res.status(500).json({
        error: "Failed to update user statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const httpServer = createServer(app);

  // Set up Socket.IO with dedicated namespace for token updates
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Create dedicated namespace for token updates
  const tokenNamespace = io.of("/tokens");

  tokenNamespace.on("connection", (socket) => {
    console.log("Client connected to token namespace:", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected from token namespace:", socket.id);
    });
  });

  // Make io available globally for token updates
  (global as any).tokenNamespace = tokenNamespace;

  return httpServer;
}