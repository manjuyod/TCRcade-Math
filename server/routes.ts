import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { DatabaseStorage } from "./database-storage";
import { 
  analyzeStudentResponse,
  generateMathHint,
  explainMathConcept
} from "./openai";

// Helper function to get concept information
const getConceptInfo = (concept: string) => {
  // This is a mapping of concepts to their categories, related concepts, and grade ranges
  // In a real application, this would come from a database or curriculum structure
  const conceptMap: Record<string, { category: string, relatedConcepts: string[], grade: string }> = {
    "Addition": { 
      category: "Operations", 
      relatedConcepts: ["Subtraction", "Number Sense"], 
      grade: "K-2" 
    },
    "Subtraction": { 
      category: "Operations", 
      relatedConcepts: ["Addition", "Number Sense"], 
      grade: "K-2" 
    },
    "Multiplication": { 
      category: "Operations", 
      relatedConcepts: ["Division", "Arrays"], 
      grade: "2-4" 
    },
    "Division": { 
      category: "Operations", 
      relatedConcepts: ["Multiplication", "Fractions"], 
      grade: "3-5" 
    },
    "Fractions": { 
      category: "Numbers", 
      relatedConcepts: ["Division", "Decimals", "Ratio"], 
      grade: "3-6" 
    },
    "Decimals": { 
      category: "Numbers", 
      relatedConcepts: ["Fractions", "Place Value"], 
      grade: "4-6" 
    },
    "Place Value": { 
      category: "Numbers", 
      relatedConcepts: ["Number Sense", "Decimals"], 
      grade: "K-4" 
    },
    "Number Sense": { 
      category: "Numbers", 
      relatedConcepts: ["Counting", "Place Value"], 
      grade: "K-2" 
    },
    "Counting": { 
      category: "Numbers", 
      relatedConcepts: ["Number Sense"], 
      grade: "K-1" 
    },
    "Geometry": { 
      category: "Measurement", 
      relatedConcepts: ["Spatial Reasoning", "Angles"], 
      grade: "2-6" 
    },
    "Measurement": { 
      category: "Measurement", 
      relatedConcepts: ["Geometry", "Units"], 
      grade: "1-6" 
    },
    "Time": { 
      category: "Measurement", 
      relatedConcepts: ["Measurement", "Units"], 
      grade: "1-3" 
    },
    "Money": { 
      category: "Measurement", 
      relatedConcepts: ["Addition", "Decimals"], 
      grade: "1-4" 
    },
    "Word Problems": { 
      category: "Applications", 
      relatedConcepts: ["All Operations"], 
      grade: "K-6" 
    }
  };
  
  // Return information for the concept, or a default if not found
  return conceptMap[concept] || {
    category: "General Math",
    relatedConcepts: [],
    grade: "K-6"
  };
};

// Helper middleware to ensure user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);
  
  // TODO: Future implementation of WebSocket server for multiplayer functionality
  // For now, we'll leave this commented out to avoid conflicts with Vite

  // Get question for user
  app.get("/api/questions", ensureAuthenticated, async (req, res) => {
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
    
    // Check if the user wants recommended questions based on learning history
    const useRecommendations = req.query.recommended === 'true';
    
    // Get current module category from localStorage if set
    const moduleCategory = req.query.category as string;
    
    try {
      // Maximum retry attempts to find a non-duplicate question
      const maxRetries = 15;
      let question = null;
      let attempts = 0;
      let seenQuestionIds = new Set(answeredIds); // Track seen questions to avoid duplicates
      
      // Try to find a question that hasn't been answered in this session
      while (attempts < maxRetries && !question) {
        if (useRecommendations) {
          // Import the recommendation engine functions
          const { getRecommendedQuestion } = await import('./recommendation-engine');
          
          // Get a recommended question based on the user's learning history
          question = await getRecommendedQuestion(userId);
        } else {
          // Check if forceDynamic was explicitly requested in the query parameters
          const forceDynamicRequested = req.query.forceDynamic === 'true';
          
          // Force dynamic generation if requested or by random chance (90%)
          const forceDynamic = forceDynamicRequested || Math.random() < 0.9;
          
          // Get an adaptive question matching the requested category if available
          question = await storage.getAdaptiveQuestion(userId, grade, forceDynamic, moduleCategory);
        }
        
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

  // Better question fetching endpoint that uses session tracking to prevent duplicates
  app.get("/api/questions/next", ensureAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const grade = req.query.grade as string || req.user!.grade || "3";
    const category = req.query.category as string;
    const forceDynamic = req.query.forceDynamic === 'true';

    // Initialize session tracking for seen questions if it doesn't exist
    if (!req.session.seenQuestions) {
      req.session.seenQuestions = [];
    }
    
    // Extract excluded question IDs from query parameter
    const excludeParam = req.query.exclude as string;
    let explicitExcludeIds: number[] = [];
    
    if (excludeParam) {
      try {
        // Support both comma-separated and single ID
        if (excludeParam.includes(',')) {
          explicitExcludeIds = excludeParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        } else {
          const id = parseInt(excludeParam);
          if (!isNaN(id)) {
            explicitExcludeIds = [id];
          }
        }
      } catch (e) {
        console.error("Failed to parse exclude IDs:", e);
      }
    }
    
    try {
      // Combine explicit exclude IDs with session's seen questions
      // But limit the session history to the last 20 questions to avoid
      // running out of questions in small datasets
      const sessionHistory = req.session.seenQuestions.slice(-20);
      const allExcludeIds = [...new Set([...explicitExcludeIds, ...sessionHistory])];
      
      // Maximum retry attempts to find a non-duplicate question
      const maxRetries = 15;
      let question = null;
      let attempts = 0;
      
      // Try to find a question that hasn't been seen recently
      while (attempts < maxRetries && !question) {
        // Get an adaptive question matching the requested category if available
        // Pass our exclude list to prevent duplicates
        question = await storage.getAdaptiveQuestion(
          userId, 
          grade, 
          forceDynamic || attempts > 0, // Force dynamic generation on retry
          category,
          allExcludeIds
        );
        
        attempts++;
        
        // If we still got a question we've seen, try again
        if (question && sessionHistory.includes(question.id)) {
          question = null;
        }
      }
      
      if (!question) {
        return res.status(404).json({ message: "No questions found for your grade level and selected category" });
      }
      
      // Add this question to the session's seen list
      req.session.seenQuestions.push(question.id);
      
      // Save the session to persist the update
      req.session.save(err => {
        if (err) {
          console.error("Error saving session:", err);
        }
      });
      
      res.json(question);
    } catch (error) {
      console.error("Error fetching next question:", error);
      res.status(500).json({ message: "Failed to fetch question" });
    }
  });
  
  // Get questions by concept for practice mode
  app.get("/api/questions/concept/:grade/:concept", ensureAuthenticated, async (req, res) => {
    try {
      const questions = await storage.getQuestionsByConcept(
        req.params.grade, 
        req.params.concept
      );
      res.json(questions);
    } catch (error) {
      console.error("Error fetching concept questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });
  
  // Get questions by grade for practice mode
  app.get("/api/questions/grade/:grade", ensureAuthenticated, async (req, res) => {
    try {
      const grade = req.params.grade;
      const category = req.query.category as string | undefined;
      
      const questions = await storage.getQuestionsByGrade(grade, category);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching grade questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });
  
  // Get available categories for a grade
  app.get("/api/categories", ensureAuthenticated, async (req, res) => {
    try {
      const grade = req.query.grade as string;
      if (!grade) {
        return res.status(400).json({ error: "Grade parameter is required" });
      }
      
      // Get all questions for the grade
      const questions = await storage.getQuestionsByGrade(grade);
      
      // Extract unique categories
      const categories = [...new Set(questions.map(q => q.category))];
      
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  
  // Get available concepts for a grade
  app.get("/api/concepts", ensureAuthenticated, async (req, res) => {
    try {
      const grade = req.query.grade as string;
      if (!grade) {
        return res.status(400).json({ error: "Grade parameter is required" });
      }
      
      const concepts = await storage.getConceptsForGrade(grade);
      res.json(concepts);
    } catch (error) {
      console.error("Error fetching concepts:", error);
      res.status(500).json({ error: "Failed to fetch concepts" });
    }
  });

  // Answer question
  app.post("/api/answer", ensureAuthenticated, async (req, res) => {
    const { questionId, answer, timeSpent } = req.body;
    if (!questionId || !answer) {
      return res.status(400).json({ message: "Question ID and answer are required" });
    }
    
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      // Find the question
      const question = await storage.getQuestion(parseInt(questionId));
      
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
        dailyEngagementMinutes: (user.dailyEngagementMinutes || 0) + Math.ceil((timeSpent || 0) / 60),
        lastActive: new Date()
      });
      
      // Update progress for this category
      await storage.updateUserProgress(userId, question.category, {
        score: (isCorrect ? question.difficulty * 5 : 0),
        completedQuestions: 1
      });
      
      // Update concept mastery for this question
      try {
        const { updateConceptsFromAnswer } = await import('./recommendation-engine');
        if (question.concepts && question.concepts.length > 0) {
          await updateConceptsFromAnswer(
            userId, 
            question.concepts, 
            question.grade, 
            isCorrect
          );
        } else {
          await updateConceptsFromAnswer(userId, questionId, isCorrect);
        }
      } catch (e) {
        console.error("Failed to update concept mastery:", e);
      }
      
      const feedback = await analyzeStudentResponse(
        question.question,
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

  // Submit an answer to a question (alternative endpoint with more features)
  app.post("/api/questions/answer", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { questionId, answer, timeSpent } = req.body;
      
      if (!questionId || !answer) {
        return res.status(400).json({ error: "Question ID and answer are required" });
      }
      
      // Get the question
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      // Check if answer is correct
      const isCorrect = answer.toLowerCase() === question.answer.toLowerCase();
      
      // Update user progress
      const category = question.category;
      let progress = await storage.updateUserProgress(userId, category, {
        score: isCorrect ? 10 : 0,
        completedQuestions: 1
      });
      
      // Update concept mastery for the concepts in this question
      if (question.concepts && question.concepts.length > 0) {
        const { updateConceptsFromAnswer } = await import('./recommendation-engine');
        await updateConceptsFromAnswer(
          userId, 
          question.concepts, 
          question.grade, 
          isCorrect
        );
      }
      
      // Update user stats
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUser(userId, {
          questionsAnswered: (user.questionsAnswered || 0) + 1,
          correctAnswers: (user.correctAnswers || 0) + (isCorrect ? 1 : 0),
          tokens: (user.tokens || 0) + (isCorrect ? 10 : 0),
          dailyTokensEarned: (user.dailyTokensEarned || 0) + (isCorrect ? 10 : 0),
          dailyEngagementMinutes: (user.dailyEngagementMinutes || 0) + Math.ceil(timeSpent / 60)
        });
      }
      
      // Get AI analysis for detailed feedback (if available)
      let analysis = null;
      try {
        analysis = await analyzeStudentResponse(
          question.question,
          answer,
          question.answer
        );
      } catch (e) {
        console.error("Error generating AI analysis:", e);
        // Continue without analysis
      }
      
      res.json({
        correct: isCorrect,
        correctAnswer: question.answer,
        tokensEarned: isCorrect ? 10 : 0,
        analysis
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ error: "Failed to process answer" });
    }
  });

  // Get user progress
  app.get("/api/progress", ensureAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    
    try {
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });
  
  // Update user stats from practice/quiz sessions
  app.post("/api/user/stats", ensureAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const { correctAnswers, tokensEarned, questionsAnswered } = req.body;
    
    if (typeof correctAnswers !== 'number' || typeof tokensEarned !== 'number' || typeof questionsAnswered !== 'number') {
      return res.status(400).json({ message: "Invalid stats data" });
    }
    
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user stats
      const updatedUser = await storage.updateUser(userId, {
        tokens: user.tokens + tokensEarned,
        correctAnswers: user.correctAnswers + correctAnswers,
        questionsAnswered: user.questionsAnswered + questionsAnswered,
        lastActive: new Date()
      });
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user stats:", error);
      res.status(500).json({ message: "Failed to update user stats" });
    }
  });
  
  // Note: Using the better implementation of /api/questions/next from above
  // The older implementation has been removed to avoid route conflicts
  
  // Get personalized recommendations for the current user
  app.get("/api/recommendations", ensureAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    
    try {
      // Generate fresh recommendations if requested
      const regenerate = req.query.regenerate === 'true';
      
      // Import the recommendation engine functions
      const { generateRecommendations } = await import('./recommendation-engine');
      
      // Get existing recommendations or generate new ones
      const recommendations = regenerate
        ? await generateRecommendations(userId)
        : await (async () => {
            let rec = await storage.getUserRecommendations(userId);
            if (!rec) {
              rec = await generateRecommendations(userId);
            }
            return rec;
          })();
      
      res.json(recommendations);
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
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
  app.get("/api/admin/users", ensureAuthenticated, async (req, res) => {
    if (!req.user!.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      // Get all users except admins
      const users = await storage.getAllUsers();
      const filteredUsers = users
        .filter(user => !user.isAdmin)
        .map(user => ({
          ...user,
          password: undefined // Don't expose passwords
        }));
      
      res.json(filteredUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Admin analytics endpoints
  
  // Analytics summary
  app.get("/api/admin/analytics/summary", ensureAuthenticated, async (req, res) => {
    if (!req.user!.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      const grade = req.query.grade as string;
      const dateRange = req.query.dateRange as string;
      
      // Get all users based on filters
      const allUsers = await storage.getAllUsers();
      const users = allUsers
        .filter(user => !user.isAdmin)
        .filter(user => {
          // Filter by grade if specified
          if (grade && grade !== 'all' && user.grade !== grade) {
            return false;
          }
          
          // Filter by date range if specified
          if (dateRange && dateRange !== 'all') {
            const lastActive = new Date(user.lastActive);
            const now = new Date();
            
            if (dateRange === '7days') {
              const sevenDaysAgo = new Date(now);
              sevenDaysAgo.setDate(now.getDate() - 7);
              return lastActive >= sevenDaysAgo;
            } else if (dateRange === '30days') {
              const thirtyDaysAgo = new Date(now);
              thirtyDaysAgo.setDate(now.getDate() - 30);
              return lastActive >= thirtyDaysAgo;
            } else if (dateRange === '90days') {
              const ninetyDaysAgo = new Date(now);
              ninetyDaysAgo.setDate(now.getDate() - 90);
              return lastActive >= ninetyDaysAgo;
            } else if (dateRange === 'year') {
              const oneYearAgo = new Date(now);
              oneYearAgo.setFullYear(now.getFullYear() - 1);
              return lastActive >= oneYearAgo;
            }
          }
          
          return true;
        });
      
      // Calculate aggregated metrics
      const studentsCount = users.length;
      
      // Count users active today
      const today = new Date();
      const activeToday = users.filter(user => {
        const lastActive = new Date(user.lastActive);
        return lastActive.getDate() === today.getDate() &&
          lastActive.getMonth() === today.getMonth() &&
          lastActive.getFullYear() === today.getFullYear();
      }).length;
      
      // Total questions answered
      const totalQuestionsAnswered = users.reduce((sum, user) => sum + user.questionsAnswered, 0);
      
      // Average accuracy
      const averageAccuracy = users.length > 0 
        ? Math.round(users.reduce((sum, user) => sum + (user.correctAnswers / (user.questionsAnswered || 1) * 100), 0) / users.length)
        : 0;
      
      // Average time per question (example calculation)
      const averageTimePerQuestion = 25; // In seconds - would be calculated from actual data
      
      // Total session time in minutes
      const totalSessionTime = users.reduce((sum, user) => sum + user.dailyGoalProgress, 0);
      
      // Most/least active grade
      const gradeDistribution = ['K', '1', '2', '3', '4', '5', '6'].map(grade => {
        const count = users.filter(user => user.grade === grade).length;
        return { grade, count };
      });
      
      // Sort by count to find most and least active grades
      const sortedGrades = [...gradeDistribution].sort((a, b) => b.count - a.count);
      const mostActiveGrade = sortedGrades.length > 0 ? sortedGrades[0].grade : 'K';
      const leastActiveGrade = sortedGrades.length > 0 ? sortedGrades[sortedGrades.length - 1].grade : 'K';
      
      // Get concept masteries for all users
      const allConceptMasteries = [];
      for (const user of users) {
        const userConceptMasteries = await storage.getUserConceptMasteries(user.id);
        allConceptMasteries.push(...userConceptMasteries);
      }
      
      // Find the most challenged concept (lowest average mastery)
      const conceptMasteryMap = new Map();
      allConceptMasteries.forEach(cm => {
        if (!conceptMasteryMap.has(cm.concept)) {
          conceptMasteryMap.set(cm.concept, { total: cm.masteryLevel, count: 1 });
        } else {
          const current = conceptMasteryMap.get(cm.concept);
          conceptMasteryMap.set(cm.concept, { 
            total: current.total + cm.masteryLevel, 
            count: current.count + 1 
          });
        }
      });
      
      const conceptAverages = Array.from(conceptMasteryMap.entries()).map(([concept, data]) => ({
        concept,
        averageMastery: Math.round((data.total / data.count) * 100)
      }));
      
      const sortedConcepts = [...conceptAverages].sort((a, b) => a.averageMastery - b.averageMastery);
      const mostChallengedConcept = sortedConcepts.length > 0 ? sortedConcepts[0].concept : 'Fractions';
      
      // Mock most popular feature (would be based on actual usage data)
      const mostPopularFeature = 'Daily Challenge';
      
      // Generate weekly engagement data
      const weeklyEngagement = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        // Count active students for this day
        const activeStudents = users.filter(user => {
          const lastActive = new Date(user.lastActive);
          return lastActive.getDate() === date.getDate() &&
            lastActive.getMonth() === date.getMonth() &&
            lastActive.getFullYear() === date.getFullYear();
        }).length;
        
        // Calculate total questions answered this day (would normally come from activity logs)
        // For demonstration, we'll use a random value between 100-300 based on active students
        const questionsAnswered = Math.round(activeStudents * (Math.random() * 5 + 3));
        
        weeklyEngagement.push({ date: dateString, activeStudents, questionsAnswered });
      }
      
      // Performance by grade
      const performanceByGrade = ['K', '1', '2', '3', '4', '5', '6'].map(grade => {
        const gradeUsers = users.filter(user => user.grade === grade);
        const accuracy = gradeUsers.length > 0
          ? Math.round(gradeUsers.reduce((sum, user) => sum + (user.correctAnswers / (user.questionsAnswered || 1) * 100), 0) / gradeUsers.length)
          : 0;
        const questionsAnswered = gradeUsers.reduce((sum, user) => sum + user.questionsAnswered, 0);
        
        return { grade, accuracy, questionsAnswered };
      });
      
      res.json({
        studentsCount,
        activeToday,
        totalQuestionsAnswered,
        averageAccuracy,
        averageTimePerQuestion,
        totalSessionTime,
        mostActiveGrade,
        leastActiveGrade,
        mostChallengedConcept,
        mostPopularFeature,
        gradeDistribution,
        weeklyEngagement,
        performanceByGrade,
        conceptMastery: conceptAverages
      });
    } catch (error) {
      console.error("Error generating analytics summary:", error);
      res.status(500).json({ message: "Failed to generate analytics summary" });
    }
  });
  
  // Student analytics
  app.get("/api/admin/analytics/students", ensureAuthenticated, async (req, res) => {
    if (!req.user!.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      const grade = req.query.grade as string;
      const dateRange = req.query.dateRange as string;
      
      // Get filtered users
      const allUsers = await storage.getAllUsers();
      const users = allUsers
        .filter(user => !user.isAdmin)
        .filter(user => {
          // Filter by grade if specified
          if (grade && grade !== 'all' && user.grade !== grade) {
            return false;
          }
          
          // Filter by date range if specified
          if (dateRange && dateRange !== 'all') {
            const lastActive = new Date(user.lastActive);
            const now = new Date();
            
            if (dateRange === '7days') {
              const sevenDaysAgo = new Date(now);
              sevenDaysAgo.setDate(now.getDate() - 7);
              return lastActive >= sevenDaysAgo;
            } else if (dateRange === '30days') {
              const thirtyDaysAgo = new Date(now);
              thirtyDaysAgo.setDate(now.getDate() - 30);
              return lastActive >= thirtyDaysAgo;
            } else if (dateRange === '90days') {
              const ninetyDaysAgo = new Date(now);
              ninetyDaysAgo.setDate(now.getDate() - 90);
              return lastActive >= ninetyDaysAgo;
            } else if (dateRange === 'year') {
              const oneYearAgo = new Date(now);
              oneYearAgo.setFullYear(now.getFullYear() - 1);
              return lastActive >= oneYearAgo;
            }
          }
          
          return true;
        });
      
      // Enhance users with analytics data
      const studentAnalytics = await Promise.all(users.map(async user => {
        // Get top strengths and weaknesses from concept masteries
        const conceptMasteries = await storage.getUserConceptMasteries(user.id);
        
        const sortedByMastery = [...conceptMasteries].sort((a, b) => b.masteryLevel - a.masteryLevel);
        const topStrengths = sortedByMastery.slice(0, 3).map(cm => cm.concept);
        
        const sortedByWeakness = [...conceptMasteries].sort((a, b) => a.masteryLevel - b.masteryLevel);
        const topWeaknesses = sortedByWeakness.slice(0, 3).map(cm => cm.concept);
        
        // Calculate inactive streak (days since last activity)
        const lastActive = new Date(user.lastActive);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastActive.getTime());
        const inactiveStreak = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          grade: user.grade,
          questionsAnswered: user.questionsAnswered,
          correctAnswers: user.correctAnswers,
          streakDays: user.streakDays,
          lastActive: user.lastActive,
          topStrengths,
          topWeaknesses,
          learningStyle: user.learningStyle,
          timeSpent: user.dailyGoalProgress || 0,
          dailyStreak: user.streakDays,
          inactiveStreak
        };
      }));
      
      res.json(studentAnalytics);
    } catch (error) {
      console.error("Error generating student analytics:", error);
      res.status(500).json({ message: "Failed to generate student analytics" });
    }
  });
  
  // Concepts analytics
  app.get("/api/admin/analytics/concepts", ensureAuthenticated, async (req, res) => {
    if (!req.user!.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      const grade = req.query.grade as string;
      
      // Get all concept masteries from all users
      const allUsers = await storage.getAllUsers();
      const users = allUsers
        .filter(user => !user.isAdmin)
        .filter(user => {
          // Filter by grade if specified
          if (grade && grade !== 'all' && user.grade !== grade) {
            return false;
          }
          return true;
        });
      
      // Get all concepts
      const allConcepts = new Set();
      for (const user of users) {
        const conceptMasteries = await storage.getUserConceptMasteries(user.id);
        conceptMasteries.forEach(cm => allConcepts.add(cm.concept));
      }
      
      // For each concept, calculate aggregate metrics
      const conceptsAnalytics = [];
      
      for (const concept of allConcepts) {
        // Get all masteries for this concept
        let totalMastery = 0;
        let count = 0;
        let attemptCount = 0;
        let successCount = 0;
        
        for (const user of users) {
          const conceptMasteries = await storage.getUserConceptMasteries(user.id);
          const matching = conceptMasteries.find(cm => cm.concept === concept);
          
          if (matching) {
            totalMastery += matching.masteryLevel;
            count += 1;
            attemptCount += matching.attempts;
            successCount += matching.successes;
          }
        }
        
        // Calculate averages
        const averageMastery = count > 0 ? Math.round((totalMastery / count) * 100) : 0;
        const successRate = attemptCount > 0 ? Math.round((successCount / attemptCount) * 100) : 0;
        
        // Determine concept category and grade range
        // This would normally come from a curriculum structure or tags
        const conceptInfo = getConceptInfo(concept);
        
        // Calculate difficulty rating based on success rate
        // Lower success rate = higher difficulty
        const difficultyRating = (100 - successRate) / 20; // Scale to 0-5 range
        
        conceptsAnalytics.push({
          concept,
          category: conceptInfo.category,
          averageMastery,
          attemptCount,
          successRate,
          difficultyRating,
          relatedConcepts: conceptInfo.relatedConcepts,
          grade: conceptInfo.grade
        });
      }
      
      res.json(conceptsAnalytics);
    } catch (error) {
      console.error("Error generating concept analytics:", error);
      res.status(500).json({ message: "Failed to generate concept analytics" });
    }
  });
  
  // Export analytics
  app.get("/api/admin/analytics/export", ensureAuthenticated, async (req, res) => {
    if (!req.user!.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      const format = req.query.format as string;
      const grade = req.query.grade as string;
      const dateRange = req.query.dateRange as string;
      
      // In a real implementation, this would generate an actual file
      // based on the requested format
      
      res.json({
        success: true,
        message: `Analytics data exported in ${format.toUpperCase()} format`,
        fileUrl: `/downloads/analytics_${new Date().toISOString().split('T')[0]}.${format}`
      });
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ message: "Failed to export analytics" });
    }
  });

  // Admin: Update user
  app.patch("/api/admin/users/:id", ensureAuthenticated, async (req, res) => {
    if (!req.user!.isAdmin) {
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

  // ==========================
  // AVATAR SYSTEM ROUTES
  // ==========================
  
  // Get all available avatar items
  app.get("/api/avatar/items", ensureAuthenticated, async (req, res) => {
    try {
      const items = await storage.getAvatarItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching avatar items:", error);
      res.status(500).json({ error: "Failed to fetch avatar items" });
    }
  });
  
  // Get items of a specific type
  app.get("/api/avatar/items/:type", ensureAuthenticated, async (req, res) => {
    try {
      const items = await storage.getAvatarItemsByType(req.params.type);
      res.json(items);
    } catch (error) {
      console.error("Error fetching avatar items:", error);
      res.status(500).json({ error: "Failed to fetch avatar items" });
    }
  });
  
  // Get user's current avatar
  // Update user's email
  app.patch("/api/user/email", ensureAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      // Update the user's email
      const updatedUser = await storage.updateUser(req.user!.id, { email });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return the updated user
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating email:", error);
      res.status(500).json({ error: "Failed to update email" });
    }
  });
  
  // Update user's password
  app.patch("/api/user/password", ensureAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }
      
      // Check if the current password is correct
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Verify current password (this would use the comparePasswords function from auth.ts)
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the password
      const updatedUser = await storage.updateUser(req.user!.id, { password: hashedPassword });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "Failed to update password" });
      }
      
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ error: "Failed to update password" });
    }
  });
  
  // Get user's avatar
  app.get("/api/user/avatar", ensureAuthenticated, async (req, res) => {
    try {
      const avatar = await storage.getUserAvatar(req.user!.id);
      const ownedItems = req.user!.avatarItems || [];
      
      res.json({
        avatarItems: avatar,
        ownedItems
      });
    } catch (error) {
      console.error("Error fetching user avatar:", error);
      res.status(500).json({ error: "Failed to fetch user avatar" });
    }
  });
  
  // Update user's avatar
  app.post("/api/user/avatar", ensureAuthenticated, async (req, res) => {
    try {
      const { avatarData } = req.body;
      
      if (!avatarData) {
        return res.status(400).json({ error: "Avatar data is required" });
      }
      
      const user = await storage.updateUserAvatar(req.user!.id, avatarData);
      res.json(user);
    } catch (error) {
      console.error("Error updating avatar:", error);
      res.status(500).json({ error: "Failed to update avatar" });
    }
  });
  
  // Purchase an avatar item
  app.post("/api/avatar/purchase", ensureAuthenticated, async (req, res) => {
    try {
      const { itemId } = req.body;
      
      if (!itemId) {
        return res.status(400).json({ error: "Item ID is required" });
      }
      
      const result = await storage.purchaseAvatarItem(req.user!.id, itemId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({
        success: true,
        message: result.message,
        user: result.user
      });
    } catch (error) {
      console.error("Error purchasing avatar item:", error);
      res.status(500).json({ error: "Failed to purchase item" });
    }
  });
  
  // ==========================
  // DAILY CHALLENGE ROUTES
  // ==========================
  
  // Get current daily challenge
  app.get("/api/daily-challenge/current", ensureAuthenticated, async (req, res) => {
    try {
      const challenge = await storage.getCurrentDailyChallenge();
      
      if (!challenge) {
        return res.status(404).json({ error: "No daily challenge available" });
      }
      
      // Get user's completion status
      const status = await storage.getUserDailyChallengeStatus(req.user!.id);
      
      // If challenge is already completed, don't send questions
      if (status.completed) {
        const { questions, ...challengeWithoutQuestions } = challenge;
        res.json({
          challenge: challengeWithoutQuestions,
          status
        });
      } else {
        res.json({
          challenge,
          status
        });
      }
    } catch (error) {
      console.error("Error fetching daily challenge:", error);
      res.status(500).json({ error: "Failed to fetch daily challenge" });
    }
  });
  
  // Complete a daily challenge
  app.post("/api/daily-challenge/complete", ensureAuthenticated, async (req, res) => {
    try {
      const { challengeId, score } = req.body;
      
      if (!challengeId) {
        return res.status(400).json({ error: "Challenge ID is required" });
      }
      
      const user = await storage.completeDailyChallenge(
        req.user!.id,
        challengeId,
        score || 0
      );
      
      // Calculate token reward
      const streakBonus = Math.min(100, (user.dailyChallengeStreak || 0) * 5);
      const tokensEarned = 20 + streakBonus;
      
      res.json({
        success: true,
        tokensEarned,
        dailyChallengeStreak: user.dailyChallengeStreak
      });
    } catch (error) {
      console.error("Error completing daily challenge:", error);
      res.status(500).json({ error: "Failed to complete challenge" });
    }
  });
  
  // ==========================
  // MATH STORYTELLING ROUTES
  // ==========================
  
  // Get all available math stories
  app.get("/api/stories", ensureAuthenticated, async (req, res) => {
    try {
      const grade = req.query.grade as string;
      const stories = await storage.getMathStories(grade);
      
      // Get user's progress on each story
      const user = await storage.getUser(req.user!.id);
      const progress: Record<number, { completedNodes: number[]; isComplete: boolean }> = {};
      
      if (user && user.storyProgress) {
        for (const story of stories) {
          progress[story.id] = {
            completedNodes: user.storyProgress[story.id]?.completedNodes || [],
            isComplete: (user.storyProgress[story.id]?.completedNodes?.length || 0) >= story.nodeCount
          };
        }
      } else {
        // Initialize empty progress for each story
        for (const story of stories) {
          progress[story.id] = {
            completedNodes: [],
            isComplete: false
          };
        }
      }
      
      res.json({
        stories,
        progress
      });
    } catch (error) {
      console.error("Error fetching math stories:", error);
      res.status(500).json({ error: "Failed to fetch math stories" });
    }
  });
  
  // Get a specific math story with questions
  app.get("/api/stories/:storyId", ensureAuthenticated, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const story = await storage.getMathStoryById(storyId);
      
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      
      // Get user's progress on this story
      const user = await storage.getUser(req.user!.id);
      let completedNodes: number[] = [];
      
      if (user && user.storyProgress && user.storyProgress[storyId]) {
        completedNodes = user.storyProgress[storyId].completedNodes || [];
      }
      
      // Find the current node (first incomplete node)
      let currentNodeId = 1;
      while (completedNodes.includes(currentNodeId) && currentNodeId <= story.nodeCount) {
        currentNodeId++;
      }
      
      // If all nodes are completed, set to the last node
      if (currentNodeId > story.nodeCount) {
        currentNodeId = story.nodeCount;
      }
      
      // Get question for the current node
      const questions = await storage.getStoryQuestions(storyId, currentNodeId);
      const question = questions.length > 0 ? questions[0] : null;
      
      res.json({
        story,
        currentNodeId,
        progress: { completedNodes },
        question
      });
    } catch (error) {
      console.error("Error fetching story:", error);
      res.status(500).json({ error: "Failed to fetch story" });
    }
  });
  
  // Update story progress
  app.post("/api/stories/progress", ensureAuthenticated, async (req, res) => {
    try {
      const { storyId, nodeId, complete } = req.body;
      
      if (!storyId || !nodeId) {
        return res.status(400).json({ error: "Story ID and node ID are required" });
      }
      
      const progress = await storage.updateStoryProgress(
        req.user!.id,
        storyId,
        nodeId,
        complete
      );
      
      // Check if story is now complete
      const story = await storage.getMathStoryById(storyId);
      
      if (story && progress[storyId] && progress[storyId].completedNodes.length >= story.nodeCount) {
        // Award completion tokens
        const user = await storage.getUser(req.user!.id);
        if (user) {
          await storage.updateUser(req.user!.id, {
            tokens: (user.tokens || 0) + (story.completionReward || 50)
          });
        }
      }
      
      res.json({
        success: true,
        progress
      });
    } catch (error) {
      console.error("Error updating story progress:", error);
      res.status(500).json({ error: "Failed to update progress" });
    }
  });
  
  // ==========================
  // MULTIPLAYER ROUTES
  // ==========================
  
  // Get all active multiplayer rooms
  app.get("/api/multiplayer/rooms", ensureAuthenticated, async (req, res) => {
    try {
      const grade = req.query.grade as string;
      const rooms = await storage.listActiveMultiplayerRooms(grade);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching multiplayer rooms:", error);
      res.status(500).json({ error: "Failed to fetch multiplayer rooms" });
    }
  });
  
  // Get a specific multiplayer room
  app.get("/api/multiplayer/rooms/:roomId", ensureAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const room = await storage.getMultiplayerRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      // Get player details
      const players = [];
      for (const playerId of room.participants || []) {
        const player = await storage.getUser(playerId);
        if (player) {
          players.push({
            id: player.id,
            username: player.username,
            isHost: player.id === room.hostId,
            grade: player.grade,
            avatar: player.avatarItems
          });
        }
      }
      
      res.json({
        ...room,
        isHost: room.hostId === req.user!.id,
        players
      });
    } catch (error) {
      console.error("Error fetching multiplayer room:", error);
      res.status(500).json({ error: "Failed to fetch multiplayer room" });
    }
  });
  
  // Create a multiplayer room
  app.post("/api/multiplayer/rooms", ensureAuthenticated, async (req, res) => {
    try {
      const {
        name,
        grade,
        category,
        maxPlayers,
        gameType,
        settings
      } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Room name is required" });
      }
      
      const room = await storage.createMultiplayerRoom(req.user!.id, {
        name,
        grade: grade || req.user!.grade,
        category,
        maxParticipants: maxPlayers || 4,
        gameType: gameType || "competitive",
        settings: settings || { questionCount: 10, timeLimit: 30 }
      });
      
      res.json(room);
    } catch (error) {
      console.error("Error creating multiplayer room:", error);
      res.status(500).json({ error: "Failed to create multiplayer room" });
    }
  });
  
  // Join a multiplayer room
  app.post("/api/multiplayer/join", ensureAuthenticated, async (req, res) => {
    try {
      const { roomId, roomCode } = req.body;
      let targetRoom;
      
      if (roomId) {
        targetRoom = await storage.getMultiplayerRoom(roomId);
      } else if (roomCode) {
        targetRoom = await storage.getMultiplayerRoomByCode(roomCode);
      } else {
        return res.status(400).json({ error: "Room ID or room code is required" });
      }
      
      if (!targetRoom) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      // Check if room is full
      if (targetRoom.participants.length >= targetRoom.maxParticipants) {
        return res.status(400).json({ error: "Room is full" });
      }
      
      // Join the room
      const success = await storage.joinMultiplayerRoom(targetRoom.id, req.user!.id);
      
      if (!success) {
        return res.status(400).json({ error: "Failed to join room" });
      }
      
      res.json({
        success: true,
        roomId: targetRoom.id
      });
    } catch (error) {
      console.error("Error joining multiplayer room:", error);
      res.status(500).json({ error: "Failed to join multiplayer room" });
    }
  });
  
  // Leave a multiplayer room
  app.post("/api/multiplayer/leave", ensureAuthenticated, async (req, res) => {
    try {
      const { roomId } = req.body;
      
      if (!roomId) {
        return res.status(400).json({ error: "Room ID is required" });
      }
      
      const success = await storage.leaveMultiplayerRoom(roomId, req.user!.id);
      
      if (!success) {
        return res.status(400).json({ error: "Failed to leave room" });
      }
      
      res.json({
        success: true
      });
    } catch (error) {
      console.error("Error leaving multiplayer room:", error);
      res.status(500).json({ error: "Failed to leave multiplayer room" });
    }
  });
  
  // Update multiplayer room settings
  app.post("/api/multiplayer/settings", ensureAuthenticated, async (req, res) => {
    try {
      const { roomId, settings } = req.body;
      
      if (!roomId || !settings) {
        return res.status(400).json({ error: "Room ID and settings are required" });
      }
      
      // Check if user is the host
      const room = await storage.getMultiplayerRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      if (room.hostId !== req.user!.id) {
        return res.status(403).json({ error: "Only the host can update settings" });
      }
      
      const updatedRoom = await storage.updateMultiplayerRoom(roomId, {
        settings
      });
      
      res.json(updatedRoom);
    } catch (error) {
      console.error("Error updating multiplayer settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  
  // Start a multiplayer game
  app.post("/api/multiplayer/start", ensureAuthenticated, async (req, res) => {
    try {
      const { roomId } = req.body;
      
      if (!roomId) {
        return res.status(400).json({ error: "Room ID is required" });
      }
      
      // Check if user is the host
      const room = await storage.getMultiplayerRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      if (room.hostId !== req.user!.id) {
        return res.status(403).json({ error: "Only the host can start the game" });
      }
      
      // Check if there are at least 2 players
      if (room.participants.length < 2) {
        return res.status(400).json({ error: "At least 2 players are required" });
      }
      
      // Update room status
      const updatedRoom = await storage.updateMultiplayerRoom(roomId, {
        status: "playing",
        gameState: {
          startedAt: new Date(),
          currentQuestionIndex: 0,
          playerAnswers: {},
          questions: []
        }
      });
      
      res.json({
        success: true,
        room: updatedRoom
      });
    } catch (error) {
      console.error("Error starting multiplayer game:", error);
      res.status(500).json({ error: "Failed to start game" });
    }
  });
  
  // Submit an answer in multiplayer
  app.post("/api/multiplayer/answer", ensureAuthenticated, async (req, res) => {
    try {
      const { roomId, answer } = req.body;
      
      if (!roomId || answer === undefined) {
        return res.status(400).json({ error: "Room ID and answer are required" });
      }
      
      // Get the room
      const room = await storage.getMultiplayerRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      // Check if user is a participant
      if (!room.participants.includes(req.user!.id)) {
        return res.status(403).json({ error: "You are not a participant in this room" });
      }
      
      // Check if game is in progress
      if (room.status !== "playing") {
        return res.status(400).json({ error: "Game is not in progress" });
      }
      
      // Process answer (in a real implementation, we would check the answer against the current question)
      const isCorrect = Math.random() > 0.3; // Placeholder for demonstration
      
      res.json({
        success: true,
        correct: isCorrect
      });
    } catch (error) {
      console.error("Error submitting multiplayer answer:", error);
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });
  
  // ==========================
  // AI ANALYTICS ROUTES
  // ==========================
  
  // Update user learning style
  app.post("/api/analytics/learning-style", ensureAuthenticated, async (req, res) => {
    try {
      const { learningStyle, strengths, weaknesses } = req.body;
      
      if (!learningStyle) {
        return res.status(400).json({ error: "Learning style is required" });
      }
      
      const user = await storage.updateLearningStyle(
        req.user!.id, 
        learningStyle, 
        strengths || [], 
        weaknesses || []
      );
      
      res.json(user);
    } catch (error) {
      console.error("Error updating learning style:", error);
      res.status(500).json({ error: "Failed to update learning style" });
    }
  });
  
  // Get user's AI analytics
  app.get("/api/analytics", ensureAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getUserAnalytics(req.user!.id);
      
      if (!analytics) {
        return res.status(404).json({ error: "No analytics available" });
      }
      
      // Get concept masteries
      const conceptMasteries = await storage.getUserConceptMasteries(req.user!.id);
      
      // Get recent progress (placeholder for demonstration)
      const recentProgress = [
        {
          date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          score: 30,
          questionsAnswered: 10,
          timeSpent: 15
        },
        {
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          score: 40,
          questionsAnswered: 12,
          timeSpent: 20
        },
        {
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          score: 50,
          questionsAnswered: 15,
          timeSpent: 25
        },
        {
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          score: 45,
          questionsAnswered: 14,
          timeSpent: 22
        },
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          score: 60,
          questionsAnswered: 18,
          timeSpent: 30
        },
        {
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          score: 55,
          questionsAnswered: 16,
          timeSpent: 28
        },
        {
          date: new Date().toISOString().split('T')[0],
          score: 65,
          questionsAnswered: 20,
          timeSpent: 35
        }
      ];
      
      res.json({
        analytics,
        conceptMasteries,
        recentProgress
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });
  
  // Generate new AI analytics
  app.post("/api/analytics/generate", ensureAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.generateUserAnalytics(req.user!.id);
      
      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error("Error generating analytics:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });
  
  // ==========================
  // AI-POWERED ENHANCEMENTS
  // ==========================
  
  // Generate adaptive question based on student profile
  app.get("/api/ai/adaptive-question", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get student's concept masteries to determine strengths and weaknesses
      const conceptMasteries = await storage.getUserConceptMasteries(userId);
      const strengths = conceptMasteries
        .filter(cm => cm.masteryLevel > 0.7)
        .sort((a, b) => b.masteryLevel - a.masteryLevel)
        .slice(0, 5)
        .map(cm => cm.concept);
      
      const weaknesses = conceptMasteries
        .filter(cm => cm.masteryLevel < 0.5)
        .sort((a, b) => a.masteryLevel - b.masteryLevel)
        .slice(0, 5)
        .map(cm => cm.concept);
      
      // Get student's recently practiced concepts
      const recentConcepts = conceptMasteries
        .sort((a, b) => new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime())
        .slice(0, 5)
        .map(cm => cm.concept);
      
      // Get student interests (if any)
      const interests = user.interests || [];
      
      // Generate a personalized question
      const { generateAdaptiveQuestion } = await import('./openai');
      const question = await generateAdaptiveQuestion({
        grade: user.grade || 'K',
        interests,
        recentConcepts,
        strengths,
        weaknesses,
        learningStyle: user.learningStyle
      });
      
      res.json(question);
    } catch (error) {
      console.error("Error generating adaptive question:", error);
      res.status(500).json({ error: "Failed to generate adaptive question" });
    }
  });
  
  // Get performance predictions for a student
  app.get("/api/ai/predict-performance", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get concept masteries and progress data
      const conceptMasteries = await storage.getUserConceptMasteries(userId);
      const progressHistory = await storage.getUserProgress(userId);
      
      // Generate predictions using AI
      const { predictStudentPerformance } = await import('./openai');
      const predictions = await predictStudentPerformance(userId, conceptMasteries, progressHistory);
      
      res.json(predictions);
    } catch (error) {
      console.error("Error predicting performance:", error);
      res.status(500).json({ error: "Failed to predict performance" });
    }
  });
  
  // Generate a concept map for a specific grade and concept
  app.get("/api/ai/concept-map", ensureAuthenticated, async (req, res) => {
    try {
      const grade = req.query.grade as string || req.user!.grade || 'K';
      const centralConcept = req.query.concept as string;
      
      // Generate concept map using AI
      const { generateConceptMap } = await import('./openai');
      const conceptMap = await generateConceptMap(grade, centralConcept);
      
      res.json(conceptMap);
    } catch (error) {
      console.error("Error generating concept map:", error);
      res.status(500).json({ error: "Failed to generate concept map" });
    }
  });
  
  // Generate a math concept timeline
  app.get("/api/ai/math-timeline", ensureAuthenticated, async (req, res) => {
    try {
      const concept = req.query.concept as string;
      const grade = req.query.grade as string || req.user!.grade || 'K';
      
      if (!concept) {
        return res.status(400).json({ error: "Concept parameter is required" });
      }
      
      // Generate math timeline using AI
      const { generateMathTimeline } = await import('./openai');
      const timeline = await generateMathTimeline(concept, grade);
      
      res.json(timeline);
    } catch (error) {
      console.error("Error generating math timeline:", error);
      res.status(500).json({ error: "Failed to generate math timeline" });
    }
  });
  
  // Generate achievements for the gamification system
  app.get("/api/ai/achievements", ensureAuthenticated, async (req, res) => {
    try {
      const grade = req.query.grade as string || req.user!.grade || 'K';
      
      // Get concepts for this grade level
      const conceptMasteries = await storage.getUserConceptMasteries(req.user!.id);
      const concepts = [...new Set(conceptMasteries.map(cm => cm.concept))];
      
      // Generate achievements using AI
      const { generateAchievements } = await import('./openai');
      const achievements = await generateAchievements(grade, concepts);
      
      res.json(achievements);
    } catch (error) {
      console.error("Error generating achievements:", error);
      res.status(500).json({ error: "Failed to generate achievements" });
    }
  });
  


  // AI-powered features
  
  // Generate adaptive questions using GPT-4
  app.post('/api/questions/generate', ensureAuthenticated, async (req, res) => {
    try {
      const { grade, interests, concepts, strengths, weaknesses, learningStyle } = req.body;
      const studentContext = {
        grade: grade || req.user!.grade || 'K',
        interests,
        recentConcepts: concepts,
        strengths,
        weaknesses,
        learningStyle
      };
      
      // Use the OpenAI integration to generate a question
      const generatedQuestion = await generateAdaptiveQuestion(studentContext);
      
      // Return the generated question
      res.json(generatedQuestion);
    } catch (error) {
      console.error('Error generating AI question:', error);
      res.status(500).json({ error: 'Failed to generate question' });
    }
  });
  
  // Generate a math concept map
  app.get('/api/ai/concept-map', ensureAuthenticated, async (req, res) => {
    try {
      const { grade, concept } = req.query;
      if (!grade) {
        return res.status(400).json({ error: 'Grade level is required' });
      }
      
      const conceptMap = await generateConceptMap(grade as string, concept as string);
      res.json(conceptMap);
    } catch (error) {
      console.error('Error generating concept map:', error);
      res.status(500).json({ error: 'Failed to generate concept map' });
    }
  });
  
  // Generate a math timeline for a concept
  app.get('/api/ai/math-timeline', ensureAuthenticated, async (req, res) => {
    try {
      const { concept, grade } = req.query;
      if (!concept || !grade) {
        return res.status(400).json({ error: 'Concept and grade level are required' });
      }
      
      const timeline = await generateMathTimeline(concept as string, grade as string);
      res.json(timeline);
    } catch (error) {
      console.error('Error generating math timeline:', error);
      res.status(500).json({ error: 'Failed to generate math timeline' });
    }
  });
  
  // Generate game achievements for a grade level
  app.get('/api/ai/achievements', ensureAuthenticated, async (req, res) => {
    try {
      const { grade } = req.query;
      const concepts = (req.query.concepts as string || '').split(',').filter(c => c.trim());
      
      if (!grade) {
        return res.status(400).json({ error: 'Grade level is required' });
      }
      
      const achievements = await generateAchievements(grade as string, concepts);
      res.json(achievements);
    } catch (error) {
      console.error('Error generating achievements:', error);
      res.status(500).json({ error: 'Failed to generate achievements' });
    }
  });
  
  // Predict student performance (requires authentication)
  app.get('/api/ai/predict-performance', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get the user's concept mastery data
      const conceptData = await storage.getUserConceptMasteries(userId);
      
      // Get the user's progress data
      const progressData = await storage.getUserProgress(userId);
      
      // Generate performance predictions
      const predictions = await predictStudentPerformance(userId, conceptData, progressData);
      res.json(predictions);
    } catch (error) {
      console.error('Error predicting student performance:', error);
      res.status(500).json({ error: 'Failed to predict performance' });
    }
  });

  // AI Math Tutor endpoints
  app.post('/api/tutor/feedback', async (req, res) => {
    try {
      const { question, studentAnswer, correctAnswer } = req.body;
      
      if (!question || !studentAnswer || !correctAnswer) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const feedback = await analyzeStudentResponse(question, studentAnswer, correctAnswer);
      res.json(feedback);
    } catch (error) {
      console.error('Error generating tutor feedback:', error);
      res.status(500).json({ error: "Failed to generate feedback" });
    }
  });

  app.post('/api/tutor/hint', async (req, res) => {
    try {
      const { question, grade, previousAttempts } = req.body;
      
      if (!question || !grade) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const hint = await generateMathHint(question, grade, previousAttempts || 0);
      res.json({ hint });
    } catch (error) {
      console.error('Error generating hint:', error);
      res.status(500).json({ error: "Failed to generate hint" });
    }
  });

  app.post('/api/tutor/explain', async (req, res) => {
    try {
      const { concept, grade } = req.body;
      
      if (!concept || !grade) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const explanation = await explainMathConcept(concept, grade);
      res.json({ explanation });
    } catch (error) {
      console.error('Error generating explanation:', error);
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });

  return httpServer;
}
