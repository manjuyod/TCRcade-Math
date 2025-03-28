import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { analyzeStudentResponse } from "./openai";
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

  // Get a question appropriate for the user (alternative endpoint with more features)
  app.get("/api/questions/next", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const category = req.query.category as string;
      const forceDynamic = req.query.forceDynamic === "true";
      
      let question;
      if (req.query.adaptive === "true") {
        // Get a question using the adaptive algorithm
        question = await storage.getAdaptiveQuestion(
          userId, 
          req.user!.grade || "K", 
          forceDynamic,
          category
        );
      } else if (req.query.recommended === "true") {
        // Get a recommended question based on learning needs
        const { getRecommendedQuestion } = await import('./recommendation-engine');
        question = await getRecommendedQuestion(userId);
      } else {
        // Get a random question for the user's grade and category
        const questions = await storage.getQuestionsByGrade(
          req.user!.grade || "K",
          category
        );
        question = questions[Math.floor(Math.random() * questions.length)];
      }
      
      if (!question) {
        return res.status(404).json({ error: "No suitable questions found" });
      }
      
      res.json({ question });
    } catch (error) {
      console.error("Error fetching question:", error);
      res.status(500).json({ error: "Failed to fetch question" });
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
  
  // Update user's learning style
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
      
      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error("Error updating learning style:", error);
      res.status(500).json({ error: "Failed to update learning style" });
    }
  });

  return httpServer;
}
