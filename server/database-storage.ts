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
  leaderboard, type Leaderboard,
  subjectMastery, type SubjectMastery,
  subjectDifficultyHistory, type SubjectDifficultyHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, like, asc, isNull, or, inArray, not } from "drizzle-orm";
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

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Check if user exists first
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      
      if (!user) {
        return false;
      }

      // Delete the user
      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });
      
      return !!deletedUser;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      return false;
    }
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
    // Build filters first to make sure they're all applied correctly
    const filters = [eq(questions.grade, grade)];
    
    // CRITICAL FIX: Properly handle category filtering with improved logic
    // This fixes incorrect category filtering that caused wrong question types to appear
    if (category && category !== 'all') {
      // MAJOR CHANGE: Use single category filter without additional AND conditions
      // Previous implementation had a bug that caused weird SQL query generation
      console.log(`Applying exact category match for '${category}'`);
      filters.push(eq(questions.category, category));
      
      // Additional post-query filtering will handle any other exclusions
    }
    
    // Apply all filters at once
    const result = await db
      .select()
      .from(questions)
      .where(and(...filters));
    
    // Additional post-filter for image-based questions
    // We want to remove any question with image references, per user requirements
    const filteredResults = result.filter(q => {
      // CRITICAL FIX: Only remove questions with explicit image references
      // Don't filter out fractions questions that don't involve visual elements
      const hasImageReference = 
        q.question.toLowerCase().includes('image') || 
        q.question.toLowerCase().includes('picture') ||
        q.question.toLowerCase().includes('shown') ||
        q.question.toLowerCase().includes('diagram') ||
        q.question.toLowerCase().includes('circle is shaded') ||
        (q.question.toLowerCase().includes('fraction') && 
         (q.question.toLowerCase().includes('shown') || 
          q.question.toLowerCase().includes('visual') || 
          q.question.toLowerCase().includes('represent') ||
          q.question.toLowerCase().includes('shaded')));
        
      // If it has any image reference, log and exclude
      if (hasImageReference) {
        console.log(`REMOVING image-based question: ${q.id} - ${q.question.substring(0, 30)}...`);
        return false;
      }
      
      // Special handling for multiplication category to prevent division/fractions
      if (q.category === 'multiplication' && 
         (q.question.toLowerCase().includes('÷') || 
          q.question.toLowerCase().includes('divide') ||
          q.category === 'fractions' ||
          q.category === 'division')) {
        console.log(`REMOVING incorrectly categorized question from multiplication: ${q.id} - ${q.question.substring(0, 30)}...`);
        return false;
      }
      
      return true;
    });
    
    console.log(`getQuestionsByGrade: Found ${result.length} questions with grade=${grade}, category=${category || 'all'}`);
    console.log(`After filtering out image questions: ${filteredResults.length} questions remain`);
    return filteredResults;
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
    
    // First, try to find an existing challenge for today
    const [challenge] = await db
      .select()
      .from(dailyChallenges)
      .where(eq(dailyChallenges.date, today));
    
    // If we found a challenge, return it
    if (challenge) {
      console.log(`Found existing daily challenge for ${today.toLocaleDateString()}`, challenge);
      return challenge;
    }
    
    // No challenge found, create a new one
    console.log(`Creating new daily challenge for ${today.toLocaleDateString()}`);
    
    // Generate 5 random questions for the daily challenge
    const questionIds: number[] = [];
    const questions: any[] = [];
    
    // Get 5 random questions from the database (one for each K-4 grade)
    const randomQuestions = await db
      .select()
      .from(questions)
      .limit(5);
    
    if (randomQuestions.length > 0) {
      randomQuestions.forEach(q => {
        questionIds.push(q.id);
        questions.push(q);
      });
    } else {
      // If no questions found, generate some hardcoded basic questions
      // This is a fallback to ensure we always have questions
      const fallbackQuestions = [
        {
          id: 1001,
          question: "What is 2 + 2?",
          answer: "4",
          options: ["2", "3", "4", "5"],
          category: "addition",
          difficulty: 1,
          grade: "K"
        },
        {
          id: 1002,
          question: "What is 5 - 3?",
          answer: "2",
          options: ["1", "2", "3", "4"],
          category: "subtraction",
          difficulty: 1,
          grade: "1"
        },
        {
          id: 1003,
          question: "What is 3 × 4?",
          answer: "12",
          options: ["10", "11", "12", "13"],
          category: "multiplication",
          difficulty: 2,
          grade: "2"
        },
        {
          id: 1004,
          question: "What is 10 ÷ 2?",
          answer: "5",
          options: ["4", "5", "6", "7"],
          category: "division",
          difficulty: 2,
          grade: "3"
        },
        {
          id: 1005,
          question: "What is 1/2 + 1/4?",
          answer: "3/4",
          options: ["1/4", "2/4", "3/4", "4/4"],
          category: "fractions",
          difficulty: 3,
          grade: "4"
        }
      ];
      
      fallbackQuestions.forEach(q => {
        questionIds.push(q.id);
        questions.push(q);
      });
    }
    
    // Create the new challenge
    const newChallenge = {
      // Don't need to set ID as it's auto-incremented
      date: today,
      title: `Daily Math Challenge - ${today.toLocaleDateString()}`,
      description: "Complete these challenging questions to earn extra tokens and keep your streak going!",
      questions: JSON.stringify(questions), // Convert to JSON string
      questionIds: questionIds,
      difficulty: "medium",
      difficultyBonus: 1,
      tokenReward: 25,
      questionCount: 5
    };
    
    try {
      // Insert the new challenge into the database
      const [insertedChallenge] = await db
        .insert(dailyChallenges)
        .values(newChallenge)
        .returning();
      
      console.log(`Successfully created daily challenge with ID: ${insertedChallenge.id}`);
      return insertedChallenge;
    } catch (error) {
      console.error("Error creating daily challenge:", error);
      
      // Create a fallback in-memory challenge that matches the schema
      const fallbackChallenge = {
        id: Math.floor(Date.now() / 1000), // Use timestamp as ID
        date: today,
        title: `Daily Math Challenge - ${today.toLocaleDateString()}`,
        description: "Complete these challenging questions to earn extra tokens and keep your streak going!",
        questions: questions,
        questionIds: questionIds,
        difficulty: "medium",
        difficultyBonus: 1,
        tokenReward: 25,
        questionCount: 5,
        category: null,
        requiredGrade: null,
        specialReward: null
      };
      
      return fallbackChallenge as DailyChallenge;
    }
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
    
    // Add default concepts for practice if user doesn't have enough weakness data
    // This ensures the "Concepts that need more practice" section is always populated
    if (weaknesses.length < 3) {
      // Get the user's grade to provide grade-appropriate concepts
      const grade = user.grade || '3';
      
      // Generate default concepts based on grade level
      const defaultConcepts: {[key: string]: string[]} = {
        'K': ['counting', 'shapes', 'patterns', 'number recognition', 'sorting'],
        '1': ['addition', 'subtraction', 'place value', 'time', 'measurement'],
        '2': ['skip counting', 'mental math', 'money', 'basic fractions', 'place value'],
        '3': ['multiplication', 'division', 'fractions', 'area', 'perimeter'],
        '4': ['multi-digit multiplication', 'long division', 'decimals', 'angles', 'factors'],
        '5': ['fractions', 'decimals', 'percentages', 'volume', 'coordinate grid'],
        '6': ['ratios', 'rates', 'integers', 'expressions', 'equations']
      };
      
      // Add grade-appropriate default concepts that aren't already in weaknesses
      const gradeSpecificConcepts = defaultConcepts[grade] || defaultConcepts['3'];
      for (const concept of gradeSpecificConcepts) {
        if (!weaknesses.includes(concept) && weaknesses.length < 5) {
          weaknesses.push(concept);
        }
      }
    }
    
    // Get progress data
    const progress = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    
    // Create a simple analysis based on available data
    const strongCategories = progress
      .filter(p => p.score > 100)
      .map(p => p.category);
    
    // Map weaknesses to practice activities but also add common learning activities
    // Explicitly avoiding "daily challenge" and "multiplayer" as per requirements
    const recommendedActivities = [
      ...weaknesses.map(w => `Practice ${w}`),
      'flashcards',
      'wordProblems',
      'conceptMapping',
      'realWorldApplications'
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
    const allCategories = ["addition", "subtraction", "multiplication", "division", "fractions", "time"];
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
  async getAdaptiveQuestion(userId: number, grade: string, forceDynamic: boolean = false, category?: string, excludeIds: number[] = []): Promise<Question | undefined> {
    try {
      console.log(`Getting adaptive question: grade=${grade}, category=${category}, excludeIds=${excludeIds.length}`);
      
      // Enhanced approach: More strict handling of category & ensure returning enough questions
      // First check if we have a valid grade parameter, fallback to user's grade or "K"
      if (!grade) {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        grade = user?.grade || "K";
      }

      let query = db.select().from(questions);
      
      // Build a filter for grade
      const filters = [eq(questions.grade, grade)];
      
      // Add category filter if specified - STRONGLY enforce this to prevent category mismatch
      if (category && category !== 'all') {
        console.log(`Adding strict category filter: ${category}`);
        filters.push(eq(questions.category, category));
      }
      
      // Add exclusion filter if there are IDs to exclude
      if (excludeIds.length > 0) {
        // To avoid issues with possibly empty excludeIds array
        const filteredIds = excludeIds.filter(id => typeof id === 'number');
        if (filteredIds.length > 0) {
          console.log(`Excluding ${filteredIds.length} previously used questions`);
          // Use not(inArray()) instead of notInArray which doesn't exist
          filters.push(not(inArray(questions.id, filteredIds)));
        }
      }
      
      // Apply all filters with AND
      const allQuestions = await query.where(and(...filters));
      
      console.log(`Found ${allQuestions.length} questions matching primary criteria`);
      
      // If we have questions that match the criteria, return a random one
      if (allQuestions.length > 0) {
        const selectedQuestion = allQuestions[Math.floor(Math.random() * allQuestions.length)];
        console.log(`Selected question ${selectedQuestion.id} for category ${category || 'all'}`);
        return selectedQuestion;
      }
      
      // DISABLE dynamic category modification completely - this caused the issues
      // with mixed categories and improper questions 
      if (category && category !== 'all' && forceDynamic) {
        console.log(`No questions found with category ${category}, looking for basic questions...`);
        
        // Instead of modifying categories, let's look for basic questions in the category
        // This involves querying for very common questions and operators
        const basicQuestionPatterns = [
          `%${category}%`, // Look for questions with the category in the question text
          '%multiply%',    // Look for multiplication questions
          '%times%',       // Look for "times" keyword
          '% × %',         // Look for the multiplication symbol
        ];
        
        // We'll make specific queries to find truly matching questions
        let basicQuestions = [];
        for (const pattern of basicQuestionPatterns) {
          const matchingQuestions = await db
            .select()
            .from(questions)
            .where(and(
              eq(questions.grade, grade),
              or(
                like(questions.question, pattern),
                eq(questions.category, category)
              )
            ))
            .limit(5);
          
          basicQuestions.push(...matchingQuestions);
        }
        
        // If we found any basic questions, return one at random
        if (basicQuestions.length > 0) {
          const selectedQuestion = basicQuestions[Math.floor(Math.random() * basicQuestions.length)];
          console.log(`Found basic question ${selectedQuestion.id} with pattern match`);
          
          // Make sure it has the right category but DON'T modify the actual content
          // This preserves the integrity of the question itself
          if (selectedQuestion.category !== category) {
            console.log(`Warning: Selected question ${selectedQuestion.id} has category ${selectedQuestion.category} but requested ${category}`);
          }
          
          return selectedQuestion;
        }
        
        console.log(`No basic questions found for ${category}, will fall back to grade only`);
      }
      
      // If still no questions, fall back to grade only as last resort
      const fallbackQuestions = await db.select().from(questions).where(eq(questions.grade, grade));
      console.log(`Falling back to grade-only filter, found ${fallbackQuestions.length} questions`);
      
      if (fallbackQuestions.length > 0) {
        const selectedQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
        console.log(`Selected fallback question ${selectedQuestion.id}, original category: ${selectedQuestion.category}`);
        return selectedQuestion;
      }
      
      // Absolute last resort: return any question
      const anyQuestions = await db.select().from(questions).limit(10);
      console.log(`Last resort: found ${anyQuestions.length} questions with no filters`);
      
      if (anyQuestions.length > 0) {
        return anyQuestions[Math.floor(Math.random() * anyQuestions.length)];
      }
      
      console.log('No questions found at all, returning undefined');
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
  
  // Subject mastery methods for adaptive grade progression
  async getUserSubjectMasteries(userId: number): Promise<SubjectMastery[]> {
    return db
      .select()
      .from(subjectMastery)
      .where(eq(subjectMastery.userId, userId));
  }
  
  async getUserSubjectMasteriesByGrade(userId: number, grade: string): Promise<SubjectMastery[]> {
    return db
      .select()
      .from(subjectMastery)
      .where(and(
        eq(subjectMastery.userId, userId),
        eq(subjectMastery.grade, grade)
      ));
  }
  
  async getUserSubjectMastery(userId: number, subject: string, grade: string): Promise<SubjectMastery | undefined> {
    const [mastery] = await db
      .select()
      .from(subjectMastery)
      .where(and(
        eq(subjectMastery.userId, userId),
        eq(subjectMastery.subject, subject),
        eq(subjectMastery.grade, grade)
      ));
    
    return mastery;
  }
  
  async updateSubjectMastery(userId: number, subject: string, grade: string, isCorrect: boolean): Promise<SubjectMastery> {
    // Check if entry exists
    const [existingMastery] = await db
      .select()
      .from(subjectMastery)
      .where(and(
        eq(subjectMastery.userId, userId),
        eq(subjectMastery.subject, subject),
        eq(subjectMastery.grade, grade)
      ));
    
    if (existingMastery) {
      // Update existing mastery
      const totalAttempts = existingMastery.totalAttempts + 1;
      const correctAttempts = existingMastery.correctAttempts + (isCorrect ? 1 : 0);
      const masteryLevel = Math.round((correctAttempts / totalAttempts) * 100);
      
      // Check for grade progression criteria (80% mastery with at least 30 attempts)
      const canProgressToNextGrade = masteryLevel >= 80 && totalAttempts >= 30;
      
      // Check for downgrade criteria (less than 50% mastery)
      const shouldDowngrade = masteryLevel < 50 && totalAttempts >= 10;
      
      const [updatedMastery] = await db
        .update(subjectMastery)
        .set({
          totalAttempts,
          correctAttempts,
          lastPracticed: new Date(),
          masteryLevel,
          nextGradeUnlocked: existingMastery.nextGradeUnlocked || canProgressToNextGrade,
          downgraded: shouldDowngrade
        })
        .where(eq(subjectMastery.id, existingMastery.id))
        .returning();
      
      return updatedMastery;
    } else {
      // Create new mastery entry
      const [newMastery] = await db
        .insert(subjectMastery)
        .values({
          userId,
          subject,
          grade,
          totalAttempts: 1,
          correctAttempts: isCorrect ? 1 : 0,
          lastPracticed: new Date(),
          masteryLevel: isCorrect ? 100 : 0,
          isUnlocked: true,
          nextGradeUnlocked: false,
          downgraded: false
        })
        .returning();
      
      return newMastery;
    }
  }
  
  async checkAndProcessGradeProgression(userId: number, subject: string, grade: string): Promise<{
    shouldUpgrade: boolean,
    shouldDowngrade: boolean,
    nextGrade?: string,
    previousGrade?: string
  }> {
    // Get subject mastery for current grade
    const mastery = await this.getUserSubjectMastery(userId, subject, grade);
    
    if (!mastery) {
      return { shouldUpgrade: false, shouldDowngrade: false };
    }
    
    // Determine next and previous grade levels
    const gradeNum = parseInt(grade, 10);
    const nextGrade = (gradeNum + 1).toString();
    const previousGrade = (gradeNum - 1).toString();
    
    // Check if user should upgrade to next grade (80% mastery with at least 30 attempts)
    const shouldUpgrade = mastery.masteryLevel >= 80 && mastery.totalAttempts >= 30;
    
    // Check if user should downgrade to previous grade (less than 50% mastery)
    const shouldDowngrade = mastery.masteryLevel < 50 && mastery.totalAttempts >= 10 && gradeNum > 1;
    
    return {
      shouldUpgrade,
      shouldDowngrade,
      nextGrade: shouldUpgrade ? nextGrade : undefined,
      previousGrade: shouldDowngrade ? previousGrade : undefined
    };
  }
  
  async unlockGradeForSubject(userId: number, subject: string, grade: string): Promise<SubjectMastery> {
    // Check if the subject mastery already exists
    const existingMastery = await this.getUserSubjectMastery(userId, subject, grade);
    
    if (existingMastery) {
      // Update existing mastery to unlock it
      const [updatedMastery] = await db
        .update(subjectMastery)
        .set({
          isUnlocked: true
        })
        .where(eq(subjectMastery.id, existingMastery.id))
        .returning();
      
      return updatedMastery;
    } else {
      // Create new mastery entry with unlocked status
      const [newMastery] = await db
        .insert(subjectMastery)
        .values({
          userId,
          subject,
          grade,
          totalAttempts: 0,
          correctAttempts: 0,
          lastPracticed: new Date(),
          masteryLevel: 0,
          isUnlocked: true,
          nextGradeUnlocked: false,
          downgraded: false
        })
        .returning();
      
      return newMastery;
    }
  }
  
  async getAvailableSubjectsForGrade(userId: number, grade: string): Promise<string[]> {
    // Get all subject masteries for this user and grade that are unlocked
    const userMasteries = await db
      .select()
      .from(subjectMastery)
      .where(and(
        eq(subjectMastery.userId, userId),
        eq(subjectMastery.grade, grade),
        eq(subjectMastery.isUnlocked, true)
      ));
    
    // Return the list of unlocked subjects
    return userMasteries.map(mastery => mastery.subject);
  }
  
  async getQuestionsForUserGradeAndSubject(userId: number, subject: string): Promise<Question[]> {
    // First, get all subject masteries for this user that are unlocked
    const userMasteries = await db
      .select()
      .from(subjectMastery)
      .where(and(
        eq(subjectMastery.userId, userId),
        eq(subjectMastery.subject, subject),
        eq(subjectMastery.isUnlocked, true)
      ));
    
    if (userMasteries.length === 0) {
      // If no masteries found, get the user's default grade
      const user = await this.getUser(userId);
      if (!user || !user.grade) return [];
      
      // Create a default mastery for this subject and grade
      await this.unlockGradeForSubject(userId, subject, user.grade);
      
      // Return questions for the user's default grade and this subject
      return this.getQuestionsByGrade(user.grade, subject);
    }
    
    // Sort masteries by grade, descending order (to prioritize higher grades)
    const sortedMasteries = userMasteries.sort((a, b) => {
      const gradeA = parseInt(a.grade, 10);
      const gradeB = parseInt(b.grade, 10);
      return gradeB - gradeA; // Sort descending
    });
    
    // Check if any mastery has been downgraded - if so, use that grade instead
    const downgradedMastery = sortedMasteries.find(mastery => mastery.downgraded);
    if (downgradedMastery) {
      return this.getQuestionsByGrade(downgradedMastery.grade, subject);
    }
    
    // Otherwise, use the highest unlocked grade
    const highestMastery = sortedMasteries[0];
    return this.getQuestionsByGrade(highestMastery.grade, subject);
  }
}