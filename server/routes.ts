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
  
  for (const [key, entry] of questionCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      questionCache.delete(key);
      expiredCount++;
    }
  }
  
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
        error: error.message 
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

  const httpServer = createServer(app);
  return httpServer;
}