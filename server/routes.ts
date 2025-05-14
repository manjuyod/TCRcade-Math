import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { questions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

/**
 * Import the efficient, deterministic math facts module
 */
import { 
  getNextMathFact, 
  generateFallbackWordProblem, 
  MathOperation 
} from './mathFacts';

import {
  analyzeStudentResponse,
  generateMathHint,
  explainMathConcept,
  generateAdaptiveQuestion,
  predictStudentPerformance,
  generateConceptMap,
  generateMathTimeline,
  generateAchievements
} from './openai';

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
function getQuestionCacheKey(userId: number, grade: string, category: string | undefined, previousQuestionCount: number): string {
  // Create cache buckets based on how many questions the user has already seen (in blocks of 5)
  // This ensures students at similar progress levels get appropriately challenging questions
  const progressBucket = Math.floor(previousQuestionCount / 5) * 5;
  return `question-${userId}-${grade}-${category || 'all'}-${progressBucket}`;
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
  
  // Get all questions (with filters)
  app.get("/api/questions", ensureAuthenticated, async (req, res) => {
    try {
      const { grade, category } = req.query;
      
      let dbQuestions;
      if (grade) {
        dbQuestions = await storage.getQuestionsByGrade(grade as string, category as string);
      } else {
        // Get all questions (implement pagination later)
        dbQuestions = await db.select().from(questions).limit(100);
      }
      
      res.json(dbQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ 
        message: "Failed to fetch questions",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // API endpoint for testing the math facts functionality
  app.get("/api/test/math-facts", async (req, res) => {
    const { grade = "3", operation = "multiplication" } = req.query;
    try {
      const question = getNextMathFact(grade as string, operation as MathOperation);
      res.json(question);
    } catch (error) {
      console.error("Error testing math facts:", error);
      res.status(500).json({ 
        message: "Failed to generate test math facts", 
        error: error.message 
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
        error: error.message 
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
        error: error.message 
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
        operation as MathOperation
      );
      
      res.json(question);
    } catch (error) {
      console.error("Error generating math facts question:", error);
      res.status(500).json({ 
        message: "Failed to generate math facts question", 
        error: error.message 
      });
    }
  });
  
  // Next endpoint: questions/next
  app.get("/api/questions/next", ensureAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { grade, category, excludeIds } = req.query;
      const userId = req.user.id;
      
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
        req.query.forceDynamic === 'true',
        category as string,
        parsedExcludeIds
      );
      
      if (!question) {
        return res.status(404).json({ message: "No questions available" });
      }
      
      res.json(question);
    } catch (error) {
      console.error("Error fetching next question:", error);
      res.status(500).json({ 
        message: "Failed to fetch next question", 
        error: error.message 
      });
    }
  });

  app.get("/api/questions/concept/:grade/:concept", ensureAuthenticated, async (req, res) => {
    try {
      const { grade, concept } = req.params;
      const questions = await storage.getQuestionsByConcept(grade, concept);
      
      if (!questions || questions.length === 0) {
        return res.status(404).json({ message: "No questions found for this concept" });
      }
      
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions by concept:", error);
      res.status(500).json({
        message: "Failed to fetch questions by concept",
        error: error.message
      });
    }
  });
  
  app.get("/api/questions/grade/:grade", ensureAuthenticated, async (req, res) => {
    try {
      const { grade } = req.params;
      const { category } = req.query;
      const questions = await storage.getQuestionsByGrade(grade, category as string);
      
      if (!questions || questions.length === 0) {
        return res.status(404).json({ message: "No questions found for this grade" });
      }
      
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions by grade:", error);
      res.status(500).json({
        message: "Failed to fetch questions by grade",
        error: error.message
      });
    }
  });
  
  app.get("/api/questions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.json(question);
    } catch (error) {
      console.error("Error fetching question by id:", error);
      res.status(500).json({
        message: "Failed to fetch question",
        error: error.message
      });
    }
  });
  
  app.get("/api/categories", ensureAuthenticated, async (req, res) => {
    try {
      // For now, we use a hardcoded list of categories
      const categories = [
        'addition',
        'subtraction', 
        'multiplication', 
        'division',
        'fractions',
        'decimals',
        'geometry',
        'measurement',
        'time',
        'money'
      ];
      
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({
        message: "Failed to fetch categories",
        error: error.message
      });
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
        return res.status(404).json({ message: "No concepts found for this grade" });
      }
      
      res.json(concepts);
    } catch (error) {
      console.error("Error fetching concepts:", error);
      res.status(500).json({
        message: "Failed to fetch concepts",
        error: error.message
      });
    }
  });
  
  app.get("/api/progress", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const progress = await storage.getUserProgress(userId);
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({
        message: "Failed to fetch user progress", 
        error: error.message 
      });
    }
  });
  
  // AI Math Tutor endpoints
  app.post('/api/tutor/feedback', ensureAuthenticated, async (req, res) => {
    try {
      const { question, studentAnswer, correctAnswer } = req.body;
      
      if (!question || !studentAnswer || !correctAnswer) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const feedback = await analyzeStudentResponse(question, studentAnswer, correctAnswer);
      res.json(feedback);
    } catch (error) {
      console.error("Error analyzing student response:", error);
      res.status(500).json({ 
        error: "Failed to analyze response",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post('/api/tutor/hint', ensureAuthenticated, async (req, res) => {
    try {
      const { question, grade, previousAttempts } = req.body;
      
      if (!question || !grade) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const hint = await generateMathHint(question, grade, previousAttempts || 0);
      res.json({ hint });
    } catch (error) {
      console.error("Error generating math hint:", error);
      res.status(500).json({ 
        error: "Failed to generate hint",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post('/api/tutor/explain', ensureAuthenticated, async (req, res) => {
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
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // AI Analytics endpoints
  // Get current analytics
  app.get('/api/analytics', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      
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
          const dateA = (a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 
                       ((a as any).date ? new Date((a as any).date).getTime() : 0);
          const dateB = (b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 
                       ((b as any).date ? new Date((b as any).date).getTime() : 0);
          return dateB - dateA;
        })
        .slice(0, 10)
        .reverse()
        .map(p => ({
          date: (p as any).updatedAt ? new Date((p as any).updatedAt).toLocaleDateString() : 
                ((p as any).date ? new Date((p as any).date).toLocaleDateString() : new Date().toLocaleDateString()),
          score: p.score || 0,
          questionsAnswered: p.completedQuestions || ((p as any).questionsAnswered || 0),
          timeSpent: (p as any).timeSpent || 0
        }));
      
      // Create a placeholder analytics object if none exists
      // This ensures the client always has something to display
      if (!analytics) {
        analytics = {
          id: 0,
          userId,
          analysisDate: new Date(),
          learningPatterns: {},
          recommendations: "Complete more questions to get personalized recommendations.",
          strengths: [],
          areasForImprovement: [],
          engagementAnalysis: {},
          suggestedActivities: [],
          learningStyle: "Visual",
          strengthConcepts: [],
          weaknessConcepts: [],
          recommendedActivities: [],
          generatedAt: new Date()
        };
      }
      
      // Ensure we send the analytics data in the expected format
      res.json({
        analytics: {
          analytics, // This nesting is needed to match the client's expectations
          conceptMasteries,
          recentProgress
        }
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ 
        error: "Failed to fetch analytics",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Generate new analytics
  app.post('/api/analytics/generate', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Generate new analytics
      const analytics = await storage.generateUserAnalytics(userId);
      
      res.json({ success: true, analytics });
    } catch (error) {
      console.error("Error generating analytics:", error);
      res.status(500).json({ 
        error: "Failed to generate analytics",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post('/api/analytics/predict', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const conceptMasteries = await storage.getUserConceptMasteries(userId);
      const progressHistory = await storage.getUserProgress(userId);
      
      const predictions = await predictStudentPerformance(userId, conceptMasteries, progressHistory);
      res.json(predictions);
    } catch (error) {
      console.error("Error predicting student performance:", error);
      res.status(500).json({ 
        error: "Failed to predict performance",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get('/api/concept-map/:grade/:concept', ensureAuthenticated, async (req, res) => {
    try {
      const { grade, concept } = req.params;
      
      const conceptMap = await generateConceptMap(grade, concept);
      res.json(conceptMap);
    } catch (error) {
      console.error("Error generating concept map:", error);
      res.status(500).json({ 
        error: "Failed to generate concept map",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get('/api/math-timeline/:grade/:concept', ensureAuthenticated, async (req, res) => {
    try {
      const { grade, concept } = req.params;
      
      const timeline = await generateMathTimeline(concept, grade);
      res.json(timeline);
    } catch (error) {
      console.error("Error generating math timeline:", error);
      res.status(500).json({ 
        error: "Failed to generate math timeline",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post('/api/achievements/generate', ensureAuthenticated, async (req, res) => {
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
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // AI-driven adaptive question endpoint
  app.get('/api/questions/adaptive', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { grade, concept, category, difficulty } = req.query;
      
      // Only use this for non-math-facts content
      // Math facts should use the dedicated efficient generator
      if (category?.toString().startsWith('math-facts-')) {
        return res.redirect(`/api/questions/math-facts?grade=${grade}&operation=${category?.toString().split('-')[2]}`);
      }
      
      const studentContext = {
        userId,
        grade: grade?.toString() || '3',
        concept: concept?.toString() || 'general',
        category: category?.toString(),
        difficulty: difficulty ? parseInt(difficulty.toString()) : 3,
        forceDynamic: true,
        isMathFactsModule: false
      };
      
      const generatedQuestion = await generateAdaptiveQuestion(studentContext);
      res.json(generatedQuestion);
    } catch (error) {
      console.error("Error generating adaptive question:", error);
      res.status(500).json({ 
        error: "Failed to generate adaptive question",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}