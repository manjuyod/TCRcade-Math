import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Get question for user
  app.get("/api/questions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user!.id;
    const grade = req.user!.grade || "K";
    
    // Get previously answered question IDs from query parameter
    const answeredIdsParam = req.query.answeredIds as string;
    let answeredIds: number[] = [];
    
    if (answeredIdsParam) {
      try {
        answeredIds = JSON.parse(answeredIdsParam);
      } catch (e) {
        console.error("Failed to parse answeredIds:", e);
      }
    }
    
    // Get current module category from localStorage if set
    const moduleCategory = req.query.category as string;
    
    try {
      // Maximum retry attempts to find a non-duplicate question
      const maxRetries = 15; // Increased to give more chances to find matching questions
      let question = null;
      let attempts = 0;
      let seenQuestionIds = new Set(answeredIds); // Track seen questions to avoid duplicates
      
      // Try to find a question that hasn't been answered in this session
      while (attempts < maxRetries && !question) {
        // Check if forceDynamic was explicitly requested in the query parameters
        const forceDynamicRequested = req.query.forceDynamic === 'true';
        
        // Force dynamic generation if requested or by random chance (90%)
        const forceDynamic = forceDynamicRequested || Math.random() < 0.9;
        
        // Get an adaptive question matching the requested category if available
        question = await storage.getAdaptiveQuestion(userId, grade, forceDynamic, moduleCategory);
        
        // If we found a question and it's in the already seen IDs, try again
        if (question && seenQuestionIds.has(question.id)) {
          question = null;
        }
        
        attempts++;
      }
      
      if (!question) {
        return res.status(404).json({ message: "No questions found for your grade level and selected category" });
      }
      
      res.json(question);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch question" });
    }
  });

  // Answer question
  app.post("/api/answer", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { questionId, answer } = req.body;
    if (!questionId || !answer) {
      return res.status(400).json({ message: "Question ID and answer are required" });
    }

    const { analyzeStudentResponse } = await import('./openai');
    
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      // Find the question
      const questions = Array.from(storage["questions"].values());
      const question = questions.find(q => q.id === parseInt(questionId));
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Check if answer is correct
      const isCorrect = question.answer === answer;
      
      // Update user stats
      const questionsAnswered = user.questionsAnswered + 1;
      const correctAnswers = user.correctAnswers + (isCorrect ? 1 : 0);
      
      // Award tokens for correct answers (max 200 per day)
      let tokensEarned = 0;
      let dailyTokensEarned = user.dailyTokensEarned;
      
      if (isCorrect && dailyTokensEarned < 200) {
        // Award tokens based on difficulty
        tokensEarned = Math.min(question.difficulty * 2, 10);
        // Make sure we don't exceed daily limit
        tokensEarned = Math.min(tokensEarned, 200 - dailyTokensEarned);
        dailyTokensEarned += tokensEarned;
      }
      
      // Update user data
      const updatedUser = await storage.updateUser(userId, {
        tokens: user.tokens + tokensEarned,
        questionsAnswered,
        correctAnswers,
        dailyTokensEarned,
        lastActive: new Date()
      });
      
      // Update progress for this category
      await storage.updateUserProgress(userId, question.category, {
        score: (isCorrect ? question.difficulty * 5 : 0),
        completedQuestions: 1
      });
      
      const feedback = await analyzeStudentResponse(
        question.question, // Using question.question instead of question.text
        answer,
        question.answer
      );

      res.json({
        correct: isCorrect,
        tokensEarned,
        totalTokens: updatedUser?.tokens || user.tokens,
        correctAnswer: question.answer,
        feedback
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process answer" });
    }
  });

  // Get user progress
  app.get("/api/progress", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user!.id;
    
    try {
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Admin endpoints
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      // Get all users except admins
      const users = Array.from(storage["users"].values())
        .filter(user => !user.isAdmin)
        .map(user => ({
          ...user,
          password: undefined // Don't expose passwords
        }));
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Update user
  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.sendStatus(403);
    }
    
    const userId = parseInt(req.params.id);
    const updates = req.body;
    
    // Don't allow updating sensitive fields
    delete updates.password;
    delete updates.isAdmin;
    
    try {
      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
