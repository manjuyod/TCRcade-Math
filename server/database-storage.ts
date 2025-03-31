import { 
  users, type User, type InsertUser, 
  questions, type Question,
  userProgress, type UserProgress,
  conceptMastery, type ConceptMastery,
  recommendations, type Recommendation,
  avatarItems, type AvatarItem,
  dailyChallenges, type DailyChallenge,
  mathStories, type MathStory,
  multiplayerRooms, type MultiplayerRoom,
  aiAnalytics, type AiAnalytic,
  leaderboard, type Leaderboard
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, like, asc, isNull, or, inArray } from "drizzle-orm";
import { sessionStore } from "./session";
// Use type import to avoid circular dependencies
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = sessionStore;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const defaultAvatarItems = {
      hair: "default",
      face: "default",
      outfit: "default",
      accessories: [],
      background: "default",
      unlocks: ["default"]
    };

    const [user] = await db.insert(users)
      .values({
        ...insertUser,
        avatarItems: defaultAvatarItems,
        tokens: 0,
        streakDays: 0,
        lastActive: new Date(),
        dailyTokensEarned: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        dailyEngagementMinutes: 0
      })
      .returning();
    
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async getLeaderboard(): Promise<Array<User & { score: number }>> {
    const leaderboardUsers = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, false))
      .orderBy(desc(users.tokens))
      .limit(20);
    
    return leaderboardUsers.map(user => ({
      ...user,
      score: user.tokens
    }));
  }

  // Question methods
  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id));
    
    return question;
  }

  async getQuestionsByGrade(grade: string, category?: string): Promise<Question[]> {
    let query = db
      .select()
      .from(questions)
      .where(eq(questions.grade, grade));
    
    if (category && category !== 'all') {
      query = query.where(eq(questions.category, category));
    }
    
    return query;
  }

  async getQuestionsByConcept(grade: string, concept: string): Promise<Question[]> {
    // Need to query for questions with the concept in their concepts array
    const questionsWithConcept = await db
      .select()
      .from(questions)
      .where(and(
        eq(questions.grade, grade),
        inArray(concept, questions.concepts)
      ));
    
    return questionsWithConcept;
  }

  // We'll implement some basic utility methods first, and add the more complex ones later
  // Progress methods
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    const progress = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    
    return progress;
  }

  async updateUserProgress(userId: number, category: string, data: Partial<UserProgress>): Promise<UserProgress> {
    // First check if progress entry exists
    const [existingProgress] = await db
      .select()
      .from(userProgress)
      .where(and(
        eq(userProgress.userId, userId),
        eq(userProgress.category, category)
      ));
    
    if (existingProgress) {
      // Update existing progress
      const [updatedProgress] = await db
        .update(userProgress)
        .set(data)
        .where(eq(userProgress.id, existingProgress.id))
        .returning();
      
      return updatedProgress;
    } else {
      // Create new progress
      const [newProgress] = await db
        .insert(userProgress)
        .values({
          userId,
          category,
          level: data.level || 1,
          score: data.score || 0,
          completedQuestions: data.completedQuestions || 0
        })
        .returning();
      
      return newProgress;
    }
  }

  // Concept mastery methods
  async getUserConceptMasteries(userId: number): Promise<ConceptMastery[]> {
    const masteries = await db
      .select()
      .from(conceptMastery)
      .where(eq(conceptMastery.userId, userId));
    
    return masteries;
  }

  async getConceptsForGrade(grade: string): Promise<string[]> {
    // Get all unique concepts from questions for this grade
    const allQuestions = await db
      .select({
        concepts: questions.concepts
      })
      .from(questions)
      .where(eq(questions.grade, grade));
    
    // Extract unique concepts
    const conceptSet = new Set<string>();
    allQuestions.forEach(q => {
      if (q.concepts) {
        q.concepts.forEach(c => conceptSet.add(c));
      }
    });
    
    return Array.from(conceptSet);
  }

  async updateConceptMastery(userId: number, concept: string, grade: string, isCorrect: boolean): Promise<ConceptMastery> {
    // Check if entry exists
    const [existingMastery] = await db
      .select()
      .from(conceptMastery)
      .where(and(
        eq(conceptMastery.userId, userId),
        eq(conceptMastery.concept, concept),
        eq(conceptMastery.grade, grade)
      ));
    
    if (existingMastery) {
      // Update existing mastery
      const totalAttempts = existingMastery.totalAttempts + 1;
      const correctAttempts = existingMastery.correctAttempts + (isCorrect ? 1 : 0);
      const masteryLevel = Math.round((correctAttempts / totalAttempts) * 100);
      
      const [updatedMastery] = await db
        .update(conceptMastery)
        .set({
          totalAttempts,
          correctAttempts,
          lastPracticed: new Date(),
          masteryLevel,
          needsReview: masteryLevel < 70 // Flag for review if mastery below 70%
        })
        .where(eq(conceptMastery.id, existingMastery.id))
        .returning();
      
      return updatedMastery;
    } else {
      // Create new mastery entry
      const [newMastery] = await db
        .insert(conceptMastery)
        .values({
          userId,
          concept,
          grade,
          totalAttempts: 1,
          correctAttempts: isCorrect ? 1 : 0,
          lastPracticed: new Date(),
          masteryLevel: isCorrect ? 100 : 0,
          needsReview: !isCorrect
        })
        .returning();
      
      return newMastery;
    }
  }

  // Avatar system methods
  async getAvatarItems(): Promise<AvatarItem[]> {
    return db.select().from(avatarItems);
  }

  async getAvatarItemsByType(type: string): Promise<AvatarItem[]> {
    return db
      .select()
      .from(avatarItems)
      .where(eq(avatarItems.type, type));
  }

  async getUserAvatar(userId: number): Promise<any> {
    const [user] = await db
      .select({
        avatarItems: users.avatarItems
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) return null;
    return user.avatarItems;
  }

  async updateUserAvatar(userId: number, avatarData: any): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        avatarItems: avatarData
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async purchaseAvatarItem(userId: number, itemId: number): Promise<{success: boolean, message: string, user?: User}> {
    // Get the user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return { success: false, message: "User not found" };
    }
    
    // Get the avatar item
    const [item] = await db
      .select()
      .from(avatarItems)
      .where(eq(avatarItems.id, itemId));
    
    if (!item) {
      return { success: false, message: "Item not found" };
    }
    
    // Check if user already owns the item
    // Need to check in the unlocks array in the avatarItems JSON field
    const avatarItemsData = user.avatarItems as any;
    if (avatarItemsData.unlocks && avatarItemsData.unlocks.includes(item.id.toString())) {
      return { success: false, message: "You already own this item" };
    }
    
    // Check if user has enough tokens
    if (user.tokens < item.price) {
      return { success: false, message: `Not enough tokens. You need ${item.price} tokens.` };
    }
    
    // Update user tokens and add item to unlocks
    const unlocks = [...(avatarItemsData.unlocks || []), item.id.toString()];
    const newAvatarItems = {
      ...avatarItemsData,
      unlocks
    };
    
    const [updatedUser] = await db
      .update(users)
      .set({
        tokens: user.tokens - item.price,
        avatarItems: newAvatarItems
      })
      .where(eq(users.id, userId))
      .returning();
    
    return {
      success: true,
      message: `Successfully purchased ${item.name}!`,
      user: updatedUser
    };
  }

  // Daily challenge methods
  async getCurrentDailyChallenge(): Promise<DailyChallenge | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [challenge] = await db
      .select()
      .from(dailyChallenges)
      .where(eq(dailyChallenges.date, today));
    
    return challenge;
  }

  async getUserDailyChallengeStatus(userId: number): Promise<{completed: boolean, currentStreak: number}> {
    const [user] = await db
      .select({
        lastDailyChallenge: users.lastDailyChallenge,
        dailyChallengeStreak: users.dailyChallengeStreak
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return { completed: false, currentStreak: 0 };
    }
    
    const today = new Date().toISOString().split('T')[0];
    return {
      completed: user.lastDailyChallenge === today,
      currentStreak: user.dailyChallengeStreak
    };
  }

  async completeDailyChallenge(userId: number, challengeId: number, score: number): Promise<User> {
    // Get user and challenge data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const [challenge] = await db
      .select()
      .from(dailyChallenges)
      .where(eq(dailyChallenges.id, challengeId));
    
    if (!challenge) {
      throw new Error("Challenge not found");
    }
    
    // Calculate streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let newStreak = user.dailyChallengeStreak;
    // If already completed today, don't update
    if (user.lastDailyChallenge === today) {
      return user;
    }
    
    // If completed yesterday, increase streak
    if (user.lastDailyChallenge === yesterdayStr) {
      newStreak += 1;
    } else {
      // Otherwise reset streak
      newStreak = 1;
    }
    
    const tokensEarned = challenge.tokenReward * (challenge.difficultyBonus || 1);
    
    // Update user data
    const [updatedUser] = await db
      .update(users)
      .set({
        tokens: user.tokens + tokensEarned,
        lastDailyChallenge: today,
        dailyChallengeStreak: newStreak,
        completedChallenges: [...(user.completedChallenges || []), challenge.id.toString()]
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // Math storytelling methods
  async getMathStories(grade?: string): Promise<MathStory[]> {
    let query = db.select().from(mathStories);
    
    if (grade) {
      query = query.where(eq(mathStories.grade, grade));
    }
    
    return query;
  }

  async getMathStoryById(storyId: number): Promise<MathStory | undefined> {
    const [story] = await db
      .select()
      .from(mathStories)
      .where(eq(mathStories.id, storyId));
    
    return story;
  }

  async getStoryQuestions(storyId: number, nodeId?: number): Promise<Question[]> {
    let query = db
      .select()
      .from(questions)
      .where(eq(questions.storyId, storyId));
    
    if (nodeId !== undefined) {
      query = query.where(eq(questions.storyNode, nodeId));
    }
    
    return query;
  }

  async updateStoryProgress(userId: number, storyId: number, nodeId: number, complete: boolean): Promise<any> {
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Update story progress in user's storyProgress JSON field
    const storyProgress = user.storyProgress as any || {};
    if (!storyProgress[storyId]) {
      storyProgress[storyId] = { completedNodes: [], currentNode: 1, complete: false };
    }
    
    if (complete) {
      // Mark the node as completed if not already
      if (!storyProgress[storyId].completedNodes.includes(nodeId)) {
        storyProgress[storyId].completedNodes.push(nodeId);
      }
      
      // Update current node if higher
      if (nodeId >= storyProgress[storyId].currentNode) {
        storyProgress[storyId].currentNode = nodeId + 1;
      }
      
      // Check if story is complete
      const [story] = await db
        .select()
        .from(mathStories)
        .where(eq(mathStories.id, storyId));
      
      if (story && storyProgress[storyId].currentNode > story.nodeCount) {
        storyProgress[storyId].complete = true;
        
        // Award completion tokens
        const [updatedUser] = await db
          .update(users)
          .set({
            tokens: user.tokens + story.completionReward,
            storyProgress
          })
          .where(eq(users.id, userId))
          .returning();
        
        return storyProgress;
      }
    }
    
    // Update user with new story progress
    const [updatedUser] = await db
      .update(users)
      .set({ storyProgress })
      .where(eq(users.id, userId))
      .returning();
    
    return storyProgress;
  }

  // Multiplayer methods
  async createMultiplayerRoom(hostId: number, roomData: Partial<MultiplayerRoom>): Promise<MultiplayerRoom> {
    // Generate a unique 6-character room code
    const generateRoomCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding confusing characters
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    const roomCode = generateRoomCode();
    
    // Create the room
    const [room] = await db
      .insert(multiplayerRooms)
      .values({
        ...roomData,
        hostId,
        roomCode,
        participants: [hostId],
        isActive: true,
        createdAt: new Date()
      })
      .returning();
    
    return room;
  }

  async getMultiplayerRoom(roomId: number): Promise<MultiplayerRoom | undefined> {
    const [room] = await db
      .select()
      .from(multiplayerRooms)
      .where(eq(multiplayerRooms.id, roomId));
    
    return room;
  }

  async getMultiplayerRoomByCode(roomCode: string): Promise<MultiplayerRoom | undefined> {
    const [room] = await db
      .select()
      .from(multiplayerRooms)
      .where(eq(multiplayerRooms.roomCode, roomCode));
    
    return room;
  }

  async listActiveMultiplayerRooms(grade?: string): Promise<MultiplayerRoom[]> {
    let query = db
      .select()
      .from(multiplayerRooms)
      .where(eq(multiplayerRooms.isActive, true));
    
    if (grade) {
      query = query.where(or(
        eq(multiplayerRooms.grade, grade),
        isNull(multiplayerRooms.grade)
      ));
    }
    
    // Make sure we don't include games that are full
    const rooms = await query;
    return rooms.filter(room => {
      if (!room.participants || !room.maxParticipants) return true;
      return room.participants.length < room.maxParticipants;
    });
  }

  async joinMultiplayerRoom(roomId: number, userId: number): Promise<boolean> {
    const [room] = await db
      .select()
      .from(multiplayerRooms)
      .where(eq(multiplayerRooms.id, roomId));
    
    if (!room) {
      throw new Error("Room not found");
    }
    
    // Check if room is full
    if (room.participants && room.maxParticipants && 
        room.participants.length >= room.maxParticipants) {
      return false;
    }
    
    // Check if user is already in room
    if (room.participants && room.participants.includes(userId)) {
      return true;
    }
    
    // Add user to room
    const newParticipants = [...(room.participants || []), userId];
    await db
      .update(multiplayerRooms)
      .set({ participants: newParticipants })
      .where(eq(multiplayerRooms.id, roomId));
    
    return true;
  }

  async leaveMultiplayerRoom(roomId: number, userId: number): Promise<boolean> {
    const [room] = await db
      .select()
      .from(multiplayerRooms)
      .where(eq(multiplayerRooms.id, roomId));
    
    if (!room || !room.participants) {
      return false;
    }
    
    // Remove user from participants
    const newParticipants = room.participants.filter(id => id !== userId);
    
    // If host leaves and others remain, assign new host
    let updates: Partial<MultiplayerRoom> = { participants: newParticipants };
    
    if (room.hostId === userId && newParticipants.length > 0) {
      updates.hostId = newParticipants[0];
    }
    
    // If room is empty, mark as inactive
    if (newParticipants.length === 0) {
      updates.isActive = false;
      updates.endedAt = new Date();
    }
    
    await db
      .update(multiplayerRooms)
      .set(updates)
      .where(eq(multiplayerRooms.id, roomId));
    
    return true;
  }

  async updateMultiplayerRoom(roomId: number, data: Partial<MultiplayerRoom>): Promise<MultiplayerRoom | undefined> {
    const [updatedRoom] = await db
      .update(multiplayerRooms)
      .set(data)
      .where(eq(multiplayerRooms.id, roomId))
      .returning();
    
    return updatedRoom;
  }

  // AI analytics methods
  async generateUserAnalytics(userId: number): Promise<AiAnalytic> {
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Get user's concept masteries
    const conceptMasteries = await db
      .select()
      .from(conceptMastery)
      .where(eq(conceptMastery.userId, userId));
    
    // Identify strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    conceptMasteries.forEach(cm => {
      if (cm.masteryLevel >= 80) {
        strengths.push(cm.concept);
      } else if (cm.masteryLevel <= 50) {
        weaknesses.push(cm.concept);
      }
    });
    
    // Get progress data
    const progress = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    
    // Create a simple analysis based on available data
    const strongCategories = progress
      .filter(p => p.score > 100)
      .map(p => p.category);
    
    const recommendedActivities = [
      ...weaknesses.map(w => `Practice ${w}`),
      "Try a daily challenge",
      "Participate in a multiplayer game"
    ];
    
    // Create a new analytics entry
    const [analytic] = await db
      .insert(aiAnalytics)
      .values({
        userId,
        analysisDate: new Date(),
        learningPatterns: {
          correctAnswerRate: user.questionsAnswered > 0 
            ? user.correctAnswers / user.questionsAnswered 
            : 0,
          averageTimePerQuestion: 0, // This would need to be calculated from actual data
          preferredCategories: strongCategories
        },
        strengths: strengths.slice(0, 5),
        areasForImprovement: weaknesses.slice(0, 5),
        engagementAnalysis: {
          totalSessionTime: user.dailyEngagementMinutes,
          activityBreakdown: {}
        },
        suggestedActivities: recommendedActivities,
        recommendedActivities,
        strengthConcepts: strengths,
        weaknessConcepts: weaknesses
      })
      .returning();
    
    return analytic;
  }

  async getUserAnalytics(userId: number): Promise<AiAnalytic | undefined> {
    // Get the most recent analytics for the user
    const [analytic] = await db
      .select()
      .from(aiAnalytics)
      .where(eq(aiAnalytics.userId, userId))
      .orderBy(desc(aiAnalytics.analysisDate))
      .limit(1);
    
    return analytic;
  }

  async updateLearningStyle(userId: number, learningStyle: string, strengths: string[], weaknesses: string[]): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        learningStyle,
        strengthConcepts: strengths,
        weaknessConcepts: weaknesses
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // Recommendation methods
  async getUserRecommendations(userId: number): Promise<Recommendation | undefined> {
    const [recommendation] = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.userId, userId))
      .orderBy(desc(recommendations.generatedAt))
      .limit(1);
    
    return recommendation;
  }

  async generateRecommendations(userId: number): Promise<Recommendation> {
    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Get concept masteries
    const masteries = await db
      .select()
      .from(conceptMastery)
      .where(eq(conceptMastery.userId, userId));
    
    // Identify concepts that need review
    const conceptsToReview = masteries
      .filter(m => m.masteryLevel < 70)
      .map(m => m.concept);
    
    // Get all concepts for the user's grade
    const allConcepts = await this.getConceptsForGrade(user.grade || 'K');
    
    // Identify concepts the user hasn't seen yet
    const seenConcepts = masteries.map(m => m.concept);
    const conceptsToLearn = allConcepts.filter(c => !seenConcepts.includes(c));
    
    // Recommend categories based on user's progress
    const progress = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    
    const categoryCounts = progress.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Categories with less activity should be recommended
    const allCategories = ["addition", "subtraction", "multiplication", "division", "fractions", "geometry", "time", "money"];
    const suggestedCategories = allCategories
      .filter(c => !categoryCounts[c] || categoryCounts[c] < 3)
      .slice(0, 3);
    
    // Calculate appropriate difficulty level
    const avgMasteryLevel = masteries.length > 0
      ? masteries.reduce((sum, m) => sum + m.masteryLevel, 0) / masteries.length
      : 50;
    
    const difficultyLevel = Math.min(5, Math.max(1, Math.ceil(avgMasteryLevel / 20)));
    
    // Create recommendation
    const [recommendation] = await db
      .insert(recommendations)
      .values({
        userId,
        conceptsToReview,
        conceptsToLearn: conceptsToLearn.slice(0, 5),
        suggestedCategories,
        difficultyLevel,
        generatedAt: new Date(),
        recommendationData: {
          recentProgress: progress.slice(0, 5).map(p => p.category),
          masteryLevels: masteries.map(m => ({ concept: m.concept, level: m.masteryLevel }))
        },
        aiInsights: conceptsToReview.length > 0
          ? `Focus on improving your understanding of ${conceptsToReview.join(', ')}.`
          : "Continue exploring new mathematical concepts!",
        learningStyleSuggestions: {
          recommendedFormat: user.learningStyle || 'visual',
          paceRecommendation: 'moderate'
        }
      })
      .returning();
    
    return recommendation;
  }

  // Additional method for adaptive questions that's directly referenced in the routes
  async getAdaptiveQuestion(userId: number, grade: string, forceDynamic: boolean = false, category?: string): Promise<Question | undefined> {
    try {
      // Get user data to determine appropriate difficulty
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        return undefined;
      }
      
      // Determine difficulty based on user's correct answer rate
      const correctRate = user.questionsAnswered > 0 
        ? user.correctAnswers / user.questionsAnswered
        : 0.5;
      
      let targetDifficulty = 3; // Default medium difficulty
      
      if (correctRate > 0.8) {
        targetDifficulty = Math.min(5, Math.ceil(correctRate * 5));
      } else if (correctRate < 0.5) {
        targetDifficulty = Math.max(1, Math.floor(correctRate * 5));
      }
      
      // Find questions matching the criteria
      let query = db
        .select()
        .from(questions)
        .where(eq(questions.grade, grade));
      
      if (category && category !== 'all') {
        query = query.where(eq(questions.category, category));
      }
      
      // Filter by difficulty
      const allQuestions = await query;
      const matchingQuestions = allQuestions.filter(q => 
        Math.abs(q.difficulty - targetDifficulty) <= 1
      );
      
      if (matchingQuestions.length > 0) {
        // Return a random question from matching ones
        return matchingQuestions[Math.floor(Math.random() * matchingQuestions.length)];
      }
      
      // If no matching questions or forceDynamic is true, we should return a dynamic question
      // However, the implementation would depend on how your system generates dynamic questions
      // For now, return any question with closest difficulty
      if (allQuestions.length > 0) {
        allQuestions.sort((a, b) => 
          Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty)
        );
        return allQuestions[0];
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting adaptive question:', error);
      return undefined;
    }
  }

  // Additional method for recommended questions
  async getRecommendedQuestion(userId: number): Promise<Question | undefined> {
    try {
      // Get user data
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user || !user.grade) {
        return undefined;
      }
      
      // Get user's concept masteries to find concepts that need practice
      const masteries = await db
        .select()
        .from(conceptMastery)
        .where(eq(conceptMastery.userId, userId))
        .orderBy(asc(conceptMastery.masteryLevel));
      
      let conceptsToFocus: string[] = [];
      
      if (masteries.length > 0) {
        // Focus on concepts with lower mastery levels
        conceptsToFocus = masteries
          .filter(m => m.masteryLevel < 70)
          .map(m => m.concept);
      }
      
      if (conceptsToFocus.length > 0) {
        // Get questions for these concepts
        for (const concept of conceptsToFocus) {
          const conceptQuestions = await this.getQuestionsByConcept(user.grade, concept);
          if (conceptQuestions.length > 0) {
            return conceptQuestions[Math.floor(Math.random() * conceptQuestions.length)];
          }
        }
      }
      
      // If no specific concepts to focus on, get a random question for the user's grade
      const gradeQuestions = await this.getQuestionsByGrade(user.grade);
      if (gradeQuestions.length > 0) {
        return gradeQuestions[Math.floor(Math.random() * gradeQuestions.length)];
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting recommended question:', error);
      return undefined;
    }
  }
}