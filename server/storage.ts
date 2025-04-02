import { 
  users, type User, type InsertUser, userProgress, type UserProgress, 
  type Question, type Leaderboard, type ConceptMastery, type Recommendation,
  type AvatarItem, type DailyChallenge, type MathStory, 
  type MultiplayerRoom, type AiAnalytic 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getLeaderboard(): Promise<Array<User & { score: number }>>;
  
  // Question methods
  getQuestion(id: number): Promise<Question | undefined>;
  getQuestionsByGrade(grade: string, category?: string): Promise<Question[]>;
  getQuestionsByConcept(grade: string, concept: string): Promise<Question[]>;
  getAdaptiveQuestion(userId: number, grade: string, forceDynamic?: boolean, category?: string): Promise<Question | undefined>;
  getRecommendedQuestion(userId: number): Promise<Question | undefined>;
  
  // Progress methods
  getUserProgress(userId: number): Promise<UserProgress[]>;
  updateUserProgress(userId: number, category: string, data: Partial<UserProgress>): Promise<UserProgress>;
  
  // Concept mastery methods
  getUserConceptMasteries(userId: number): Promise<ConceptMastery[]>;
  getConceptsForGrade(grade: string): Promise<string[]>;
  updateConceptMastery(userId: number, concept: string, grade: string, isCorrect: boolean): Promise<ConceptMastery>;
  
  // Recommendation methods
  getUserRecommendations(userId: number): Promise<Recommendation | undefined>;
  generateRecommendations(userId: number): Promise<Recommendation>;
  
  // Avatar system methods
  getAvatarItems(): Promise<AvatarItem[]>;
  getAvatarItemsByType(type: string): Promise<AvatarItem[]>;
  getUserAvatar(userId: number): Promise<any>; // Returns the user's avatar configuration
  updateUserAvatar(userId: number, avatarData: any): Promise<User>;
  purchaseAvatarItem(userId: number, itemId: number): Promise<{success: boolean, message: string, user?: User}>;
  
  // Daily challenge methods
  getCurrentDailyChallenge(): Promise<DailyChallenge | undefined>;
  getUserDailyChallengeStatus(userId: number): Promise<{completed: boolean, currentStreak: number}>;
  completeDailyChallenge(userId: number, challengeId: number, score: number): Promise<User>;
  
  // Math storytelling methods
  getMathStories(grade?: string): Promise<MathStory[]>;
  getMathStoryById(storyId: number): Promise<MathStory | undefined>;
  getStoryQuestions(storyId: number, nodeId?: number): Promise<Question[]>;
  updateStoryProgress(userId: number, storyId: number, nodeId: number, complete: boolean): Promise<any>;
  
  // Multiplayer methods
  createMultiplayerRoom(hostId: number, roomData: Partial<MultiplayerRoom>): Promise<MultiplayerRoom>;
  getMultiplayerRoom(roomId: number): Promise<MultiplayerRoom | undefined>;
  getMultiplayerRoomByCode(roomCode: string): Promise<MultiplayerRoom | undefined>;
  listActiveMultiplayerRooms(grade?: string): Promise<MultiplayerRoom[]>;
  joinMultiplayerRoom(roomId: number, userId: number): Promise<boolean>;
  leaveMultiplayerRoom(roomId: number, userId: number): Promise<boolean>;
  updateMultiplayerRoom(roomId: number, data: Partial<MultiplayerRoom>): Promise<MultiplayerRoom | undefined>;
  
  // AI analytics methods
  generateUserAnalytics(userId: number): Promise<AiAnalytic>;
  getUserAnalytics(userId: number): Promise<AiAnalytic | undefined>;
  updateLearningStyle(userId: number, learningStyle: string, strengths: string[], weaknesses: string[]): Promise<User>;
  
  // Session store
  sessionStore: any; // Using any for sessionStore to avoid type issues
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private questions: Map<number, Question>;
  private progress: Map<number, UserProgress>;
  private leaderboard: Map<number, Leaderboard>;
  private conceptMasteries: Map<number, ConceptMastery>;
  private recommendations: Map<number, Recommendation>;
  private avatarItems: Map<number, AvatarItem>;
  private dailyChallenges: Map<number, DailyChallenge>;
  private mathStories: Map<number, MathStory>;
  private multiplayerRooms: Map<number, MultiplayerRoom>;
  private aiAnalytics: Map<number, AiAnalytic>;
  sessionStore: any; // Using any type to avoid issues
  currentId: number;
  currentQuestionId: number;
  currentProgressId: number;
  currentLeaderboardId: number;
  currentConceptMasteryId: number;
  currentRecommendationId: number;
  currentAvatarItemId: number;
  currentDailyChallengeId: number;
  currentMathStoryId: number;
  currentMultiplayerRoomId: number;
  currentAiAnalyticId: number;

  constructor() {
    this.users = new Map();
    this.questions = new Map();
    this.progress = new Map();
    this.leaderboard = new Map();
    this.conceptMasteries = new Map();
    this.recommendations = new Map();
    this.avatarItems = new Map();
    this.dailyChallenges = new Map();
    this.mathStories = new Map();
    this.multiplayerRooms = new Map();
    this.aiAnalytics = new Map();
    
    this.currentId = 1;
    this.currentQuestionId = 1;
    this.currentProgressId = 1;
    this.currentLeaderboardId = 1;
    this.currentConceptMasteryId = 1;
    this.currentRecommendationId = 1;
    this.currentAvatarItemId = 1;
    this.currentDailyChallengeId = 1;
    this.currentMathStoryId = 1;
    this.currentMultiplayerRoomId = 1;
    this.currentAiAnalyticId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 1 day
    });
    
    // Add sample math questions for each grade
    this.seedQuestions();
    
    // Seed initial avatar items
    this.seedAvatarItems();
    
    // Seed initial daily challenge
    this.seedDailyChallenges();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id,
      tokens: 0,
      streakDays: 0,
      lastActive: new Date(),
      dailyTokensEarned: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      isAdmin: insertUser.isAdmin ?? false,
      grade: insertUser.grade ?? null,
      displayName: insertUser.displayName ?? null,
      initials: insertUser.initials ?? "AAA",
      dailyEngagementMinutes: 0,
      // Default avatar items
      avatarItems: {
        hair: "default",
        face: "default",
        outfit: "default",
        accessories: [],
        background: "default",
        unlocks: ["default"]
      },
      lastDailyChallenge: null,
      dailyChallengeStreak: 0,
      completedChallenges: [],
      learningStyle: null,
      strengthConcepts: [],
      weaknessConcepts: []
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getLeaderboard(): Promise<Array<User & { score: number }>> {
    // Combine users with their total tokens to create a leaderboard
    const leaderboardEntries = Array.from(this.users.values())
      .filter(user => !user.isAdmin)
      .map(user => ({
        ...user,
        score: user.tokens
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Get top 20 users
    
    return leaderboardEntries;
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async getQuestionsByGrade(grade: string, category?: string): Promise<Question[]> {
    const questions = Array.from(this.questions.values())
      .filter(q => q.grade === grade && (!category || q.category === category));
    
    return questions;
  }
  
  async getQuestionsByConcept(grade: string, concept: string): Promise<Question[]> {
    // Filter questions by grade and concept
    const questions = Array.from(this.questions.values())
      .filter(q => q.grade === grade && q.concepts?.includes(concept));
    
    return questions;
  }

  async getAdaptiveQuestion(userId: number, grade: string, forceDynamic: boolean = false, category?: string): Promise<Question | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Get user progress to determine difficulty
    const userProgressEntries = await this.getUserProgress(userId);
    
    // Calculate appropriate difficulty (1-5) based on correct answer rate
    const correctRate = user.questionsAnswered > 0 ? 
      user.correctAnswers / user.questionsAnswered : 0;
    
    // Adaptive difficulty: 
    // - If doing well (>80% correct), increase difficulty
    // - If struggling (<50% correct), decrease difficulty
    let targetDifficulty = 1;
    if (correctRate > 0.8) targetDifficulty = Math.min(5, Math.ceil(correctRate * 5));
    else if (correctRate < 0.5) targetDifficulty = Math.max(1, Math.floor(correctRate * 5));
    else targetDifficulty = 3; // Medium difficulty
    
    // Generate a new dynamic question if forced or randomly decided 
    if (forceDynamic || Math.random() < 0.7) { 
      // Generate a new dynamic question with unique visuals and content
      // Pass the category to ensure it's category-specific when selected
      return this.generateDynamicQuestion(grade, targetDifficulty, category);
    }
    
    // Start with questions matching the difficulty and grade
    let filteredQuestions = Array.from(this.questions.values())
      .filter(q => q.grade === grade && Math.abs(q.difficulty - targetDifficulty) <= 1);
    
    // Further filter by category if one is specified
    if (category && category !== 'all') {
      const categoryQuestions = filteredQuestions.filter(q => q.category === category);
      
      // If we have questions in this category, use them
      if (categoryQuestions.length > 0) {
        filteredQuestions = categoryQuestions;
      }
    }
    
    if (filteredQuestions.length === 0) {
      // If no static questions match our criteria, generate a dynamic one
      // with the specified category if possible
      return this.generateDynamicQuestion(grade, targetDifficulty, category);
    }
    
    // Return a random question from the filtered list
    return filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
  }
  
  private generateDynamicQuestion(grade: string, difficulty: number, requestedCategory?: string): Question {
    const id = this.currentQuestionId++;
    const validCategories = ["addition", "subtraction", "multiplication", "division", "fractions", "geometry", "time", "money"];
    
    // Use the requested category if it's provided and valid; otherwise choose randomly
    let category: string;
    if (requestedCategory && validCategories.includes(requestedCategory)) {
      category = requestedCategory;
    } else {
      // For K-1 grades, only use addition and subtraction
      const availableCategories = (grade === "K" || grade === "1") 
        ? ["addition", "subtraction"] 
        : validCategories;
      category = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    }
    
    // Generate question based on grade and difficulty
    let num1, num2, answer, options, question;
    
    switch(category) {
      case "addition":
        // Generate numbers based on grade and difficulty
        if (grade === "K") {
          num1 = Math.floor(Math.random() * 5) + 1;  // 1-5
          num2 = Math.floor(Math.random() * 5) + 1;  // 1-5
        } else if (grade === "1") {
          num1 = Math.floor(Math.random() * 10) + 1; // 1-10
          num2 = Math.floor(Math.random() * 10) + 1; // 1-10
        } else if (grade === "2") {
          num1 = Math.floor(Math.random() * 20) + 1; // 1-20
          num2 = Math.floor(Math.random() * 20) + 1; // 1-20
        } else if (grade === "3") {
          num1 = Math.floor(Math.random() * 50) + 10; // 10-59
          num2 = Math.floor(Math.random() * 50) + 10; // 10-59
        } else if (grade === "4") {
          num1 = Math.floor(Math.random() * 100) + 50; // 50-149
          num2 = Math.floor(Math.random() * 100) + 50; // 50-149
        } else {
          num1 = Math.floor(Math.random() * 500) + 100; // 100-599
          num2 = Math.floor(Math.random() * 500) + 100; // 100-599
        }
        
        answer = (num1 + num2).toString();
        
        // Generate word problem with visual cues
        const objects = ["apples", "bananas", "pencils", "coins", "toys", "books", "markers"];
        const object = objects[Math.floor(Math.random() * objects.length)];
        
        // Add visuals flag to question text for frontend rendering
        question = `[visual:${object}:${num1}] You have ${num1} ${object} and get ${num2} more. How many ${object} do you have in total?`;
        
        // Generate options with answer and close alternatives
        options = [
          answer,
          (num1 + num2 - 1).toString(),
          (num1 + num2 + 1).toString(),
          (num1 + num2 + 2).toString()
        ].sort(() => Math.random() - 0.5);
        break;
        
      case "subtraction":
        // Ensure num1 > num2 for subtraction
        if (grade === "K") {
          num1 = Math.floor(Math.random() * 5) + 3;  // 3-7
          num2 = Math.floor(Math.random() * (num1 - 1)) + 1; // 1 to num1-1
        } else if (grade === "1") {
          num1 = Math.floor(Math.random() * 10) + 5; // 5-14
          num2 = Math.floor(Math.random() * (num1 - 2)) + 1; // 1 to num1-2
        } else if (grade === "2") {
          num1 = Math.floor(Math.random() * 20) + 10; // 10-29
          num2 = Math.floor(Math.random() * 10) + 1; // 1-10
        } else if (grade === "3") {
          num1 = Math.floor(Math.random() * 50) + 20; // 20-69
          num2 = Math.floor(Math.random() * 20) + 1; // 1-20
        } else if (grade === "4") {
          num1 = Math.floor(Math.random() * 100) + 50; // 50-149
          num2 = Math.floor(Math.random() * 50) + 1; // 1-50
        } else {
          num1 = Math.floor(Math.random() * 500) + 100; // 100-599
          num2 = Math.floor(Math.random() * 100) + 1; // 1-100
        }
        
        answer = (num1 - num2).toString();
        
        // Generate word problem with visual cues
        const subObjects = ["apples", "stickers", "marbles", "cards", "blocks", "cookies"];
        const subObject = subObjects[Math.floor(Math.random() * subObjects.length)];
        
        // Add visuals flag to question text for frontend rendering
        question = `[visual:${subObject}:${num1}] You have ${num1} ${subObject} and give away ${num2}. How many ${subObject} do you have left?`;
        
        // Generate options with answer and close alternatives
        options = [
          answer,
          (num1 - num2 - 1).toString(),
          (num1 - num2 + 1).toString(),
          (num1 - num2 + 2).toString()
        ].sort(() => Math.random() - 0.5);
        break;
        
      case "multiplication":
        if (grade === "2") {
          num1 = Math.floor(Math.random() * 5) + 1;  // 1-5
          num2 = Math.floor(Math.random() * 5) + 1;  // 1-5
        } else if (grade === "3") {
          num1 = Math.floor(Math.random() * 10) + 1; // 1-10
          num2 = Math.floor(Math.random() * 5) + 1;  // 1-5
        } else if (grade === "4") {
          num1 = Math.floor(Math.random() * 10) + 1; // 1-10
          num2 = Math.floor(Math.random() * 10) + 1; // 1-10
        } else {
          num1 = Math.floor(Math.random() * 12) + 1; // 1-12
          num2 = Math.floor(Math.random() * 12) + 1; // 1-12
        }
        
        answer = (num1 * num2).toString();
        
        // Generate word problem with visual cues for lower grades
        if (grade === "2" || grade === "3") {
          const multObjects = ["boxes", "groups", "rows", "baskets"];
          const multObject = multObjects[Math.floor(Math.random() * multObjects.length)];
          question = `[visual:grid:${num1}x${num2}] You have ${num1} ${multObject} with ${num2} items in each. How many items do you have in total?`;
        } else {
          question = `${num1} × ${num2} = ?`;
        }
        
        // Generate options with answer and close alternatives
        options = [
          answer,
          (num1 * num2 - num1).toString(),
          (num1 * num2 + num1).toString(),
          (num1 * (num2 + 1)).toString()
        ].sort(() => Math.random() - 0.5);
        break;
        
      case "division":
        if (grade === "3") {
          num2 = Math.floor(Math.random() * 5) + 1;  // 1-5
          num1 = num2 * (Math.floor(Math.random() * 5) + 1); // Multiple of num2 up to 5*num2
        } else if (grade === "4") {
          num2 = Math.floor(Math.random() * 10) + 1; // 1-10
          num1 = num2 * (Math.floor(Math.random() * 10) + 1); // Multiple of num2 up to 10*num2
        } else {
          num2 = Math.floor(Math.random() * 12) + 1; // 1-12
          num1 = num2 * (Math.floor(Math.random() * 12) + 1); // Multiple of num2 up to 12*num2
        }
        
        answer = (num1 / num2).toString();
        
        // Generate word problem with visual cues for lower grades
        if (grade === "3" || grade === "4") {
          const divObjects = ["candies", "stickers", "markers", "toys"];
          const divObject = divObjects[Math.floor(Math.random() * divObjects.length)];
          question = `[visual:division:${num1}:${num2}] You have ${num1} ${divObject} and want to share them equally among ${num2} friends. How many ${divObject} does each friend get?`;
        } else {
          question = `${num1} ÷ ${num2} = ?`;
        }
        
        // Generate options with answer and close alternatives
        options = [
          answer,
          (num1 / num2 - 1).toString(),
          (num1 / num2 + 1).toString(),
          (Math.floor(num1 / (num2 - 1))).toString()
        ].sort(() => Math.random() - 0.5);
        break;
        
      case "geometry":
        // Geometry questions for different grades
        if (grade === "K" || grade === "1") {
          // Simple shape identification
          const shapes = ["circle", "square", "triangle", "rectangle"];
          const shapeIndex = Math.floor(Math.random() * shapes.length);
          const shape = shapes[shapeIndex];
          question = `[visual:shape:${shape}] What shape is this?`;
          answer = shape;
          options = [...shapes].sort(() => Math.random() - 0.5);
        } else if (grade === "2" || grade === "3") {
          // Count sides of shapes
          const shapes: Record<string, number> = {
            "triangle": 3,
            "square": 4,
            "pentagon": 5,
            "hexagon": 6
          };
          const shapeNames = Object.keys(shapes);
          const shapeIndex = Math.floor(Math.random() * shapeNames.length);
          const shape = shapeNames[shapeIndex];
          question = `[visual:shape:${shape}] How many sides does a ${shape} have?`;
          answer = shapes[shape].toString();
          options = [
            answer,
            Math.max(1, shapes[shape] - 1).toString(),
            (shapes[shape] + 1).toString(),
            (shapes[shape] + 2).toString()
          ].sort(() => Math.random() - 0.5);
        } else {
          // Area and perimeter problems
          num1 = Math.floor(Math.random() * 8) + 3; // Side length between 3-10
          num2 = Math.floor(Math.random() * 8) + 3; // Other side length between 3-10
          
          if (Math.random() < 0.5) {
            // Perimeter of rectangle
            question = `[visual:rectangle:${num1}x${num2}] What is the perimeter of a rectangle with length ${num1} units and width ${num2} units?`;
            answer = (2 * (num1 + num2)).toString();
            options = [
              answer,
              (2 * (num1 + num2) - 2).toString(),
              (2 * (num1 + num2) + 2).toString(),
              (num1 * num2).toString() // Area instead of perimeter
            ].sort(() => Math.random() - 0.5);
          } else {
            // Area of rectangle
            question = `[visual:rectangle:${num1}x${num2}] What is the area of a rectangle with length ${num1} units and width ${num2} units?`;
            answer = (num1 * num2).toString();
            options = [
              answer,
              ((num1 - 1) * num2).toString(),
              (num1 * (num2 + 1)).toString(),
              (2 * (num1 + num2)).toString() // Perimeter instead of area
            ].sort(() => Math.random() - 0.5);
          }
        }
        break;
        
      case "time":
        // Time-telling questions for different grades
        if (grade === "K" || grade === "1") {
          // Hour-only times
          const hour = Math.floor(Math.random() * 12) + 1; // 1-12
          question = `[visual:clock:${hour}:00] What time is shown on the clock?`;
          answer = `${hour}:00`;
          
          const hour1 = (hour === 12) ? 1 : hour + 1;
          const hour2 = (hour === 1) ? 12 : hour - 1;
          
          options = [
            answer,
            `${hour1}:00`,
            `${hour2}:00`,
            `${hour}:30`
          ].sort(() => Math.random() - 0.5);
        } else if (grade === "2" || grade === "3") {
          // Hour and half-hour times
          const hour = Math.floor(Math.random() * 12) + 1; // 1-12
          const isHalf = Math.random() < 0.5;
          const minutes = isHalf ? "30" : "00";
          
          question = `[visual:clock:${hour}:${minutes}] What time is shown on the clock?`;
          answer = `${hour}:${minutes}`;
          
          const hour1 = (hour === 12) ? 1 : hour + 1;
          const hour2 = (hour === 1) ? 12 : hour - 1;
          
          options = [
            answer,
            `${hour1}:${minutes}`,
            `${hour2}:${minutes}`,
            `${hour}:${isHalf ? "00" : "30"}`
          ].sort(() => Math.random() - 0.5);
        } else {
          // Time addition/subtraction problems
          const hour1 = Math.floor(Math.random() * 12) + 1; // 1-12
          const minute1 = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
          
          // Hours and minutes to add/subtract
          const addHours = Math.floor(Math.random() * 3) + 1; // 1-3
          const addMinutes = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
          
          const totalMinutes1 = hour1 * 60 + minute1;
          const operation = Math.random() < 0.7 ? "add" : "subtract"; // More addition than subtraction
          
          // Calculate result time
          let resultMinutes;
          if (operation === "add") {
            resultMinutes = totalMinutes1 + (addHours * 60 + addMinutes);
            question = `If the time is ${hour1}:${minute1.toString().padStart(2, '0')}, what time will it be ${addHours} hour${addHours !== 1 ? 's' : ''} and ${addMinutes} minute${addMinutes !== 1 ? 's' : ''} later?`;
          } else {
            resultMinutes = totalMinutes1 - (addHours * 60 + addMinutes);
            if (resultMinutes < 0) resultMinutes += 12 * 60; // Keep time positive, wrap around 12-hour clock
            question = `If the time is ${hour1}:${minute1.toString().padStart(2, '0')}, what time was it ${addHours} hour${addHours !== 1 ? 's' : ''} and ${addMinutes} minute${addMinutes !== 1 ? 's' : ''} ago?`;
          }
          
          // Convert back to hours and minutes
          const resultHour = Math.floor(resultMinutes / 60) % 12 || 12; // Keep in 12-hour format
          const resultMinute = resultMinutes % 60;
          
          answer = `${resultHour}:${resultMinute.toString().padStart(2, '0')}`;
          
          // Generate wrong options with realistic errors
          const wrongHour1 = ((resultHour + 1) % 12) || 12;
          const wrongHour2 = ((resultHour - 1 + 12) % 12) || 12;
          const wrongMinute = (resultMinute + 15) % 60;
          
          options = [
            answer,
            `${wrongHour1}:${resultMinute.toString().padStart(2, '0')}`,
            `${wrongHour2}:${resultMinute.toString().padStart(2, '0')}`,
            `${resultHour}:${wrongMinute.toString().padStart(2, '0')}`
          ].sort(() => Math.random() - 0.5);
        }
        break;
        
      case "money":
        // Money problems for different grades
        if (grade === "K" || grade === "1") {
          // Simple coin identification
          const coins: Record<string, number> = {
            "penny": 1,
            "nickel": 5,
            "dime": 10,
            "quarter": 25
          };
          const coinNames = Object.keys(coins);
          const coinIndex = Math.floor(Math.random() * coinNames.length);
          const coin = coinNames[coinIndex];
          
          question = `[visual:coin:${coin}] How many cents is a ${coin} worth?`;
          answer = coins[coin].toString();
          
          const otherValues = Object.values(coins).filter(val => val !== coins[coin]);
          options = [
            answer,
            otherValues[0].toString(),
            otherValues[1].toString(),
            otherValues[2].toString()
          ].sort(() => Math.random() - 0.5);
          
        } else if (grade === "2" || grade === "3") {
          // Counting coins
          const coinTypes = ["penny", "nickel", "dime", "quarter"];
          const coinValues = [1, 5, 10, 25];
          
          // Randomly select 2-3 types of coins
          const numCoinTypes = Math.floor(Math.random() * 2) + 2; // 2-3
          const selectedIndices: number[] = [];
          let totalCents = 0;
          let questionText = "[visual:money] You have ";
          
          for (let i = 0; i < numCoinTypes; i++) {
            let nextIndex;
            do {
              nextIndex = Math.floor(Math.random() * coinTypes.length);
            } while (selectedIndices.includes(nextIndex));
            
            selectedIndices.push(nextIndex);
            const numCoins = Math.floor(Math.random() * 3) + 1; // 1-3 coins of each type
            totalCents += numCoins * coinValues[nextIndex];
            
            questionText += `${numCoins} ${coinTypes[nextIndex]}${numCoins !== 1 ? 's' : ''}`;
            
            if (i === numCoinTypes - 2) {
              questionText += " and ";
            } else if (i < numCoinTypes - 2) {
              questionText += ", ";
            }
          }
          
          questionText += ". How many cents do you have in total?";
          question = questionText;
          answer = totalCents.toString();
          
          options = [
            answer,
            (totalCents - coinValues[0]).toString(),
            (totalCents + coinValues[0]).toString(),
            (totalCents + 3).toString()
          ].sort(() => Math.random() - 0.5);
          
        } else {
          // Making change problems
          const priceInCents = Math.floor(Math.random() * 90) + 10; // 10-99 cents
          const givenInCents = 100; // $1.00
          const changeInCents = givenInCents - priceInCents;
          
          question = `[visual:money:change] If something costs ${priceInCents} cents and you pay with $1.00, how much change should you receive?`;
          answer = changeInCents.toString();
          
          options = [
            answer,
            (changeInCents - 5).toString(),
            (changeInCents + 5).toString(),
            (givenInCents - (priceInCents + 10)).toString()
          ].sort(() => Math.random() - 0.5);
        }
        break;
        
      case "fractions":
        // Fraction problems
        if (grade === "3") {
          // Basic fraction identification
          const denominators = [2, 3, 4];
          const denominator = denominators[Math.floor(Math.random() * denominators.length)];
          const numerator = Math.floor(Math.random() * denominator) + 1;
          
          question = `[visual:fraction:${numerator}/${denominator}] What fraction of the shape is shaded?`;
          answer = `${numerator}/${denominator}`;
          
          // Generate incorrect options with common errors
          options = [
            answer,
            `${denominator}/${numerator}`, // Reversed fraction
            `${numerator + 1}/${denominator}`, // Numerator +1
            `${numerator}/${denominator + 1}` // Denominator +1
          ].sort(() => Math.random() - 0.5);
          
        } else if (grade === "4" || grade === "5") {
          // Adding/subtracting fractions with the same denominator
          const denominators = [2, 3, 4, 5, 6, 8, 10];
          const denominator = denominators[Math.floor(Math.random() * denominators.length)];
          
          let numerator1 = Math.floor(Math.random() * (denominator - 1)) + 1;
          let numerator2 = Math.floor(Math.random() * (denominator - 1)) + 1;
          
          // Ensure the result is a proper fraction and not too trivial
          if (numerator1 + numerator2 > denominator) {
            numerator2 = denominator - numerator1;
          }
          
          const operation = Math.random() < 0.7 ? "+" : "-";
          
          if (operation === "-" && numerator1 < numerator2) {
            // Swap to ensure we don't get negative fractions
            [numerator1, numerator2] = [numerator2, numerator1];
          }
          
          let resultNumerator;
          if (operation === "+") {
            resultNumerator = numerator1 + numerator2;
            question = `What is ${numerator1}/${denominator} + ${numerator2}/${denominator}?`;
          } else {
            resultNumerator = numerator1 - numerator2;
            question = `What is ${numerator1}/${denominator} - ${numerator2}/${denominator}?`;
          }
          
          // Simplify fraction if possible
          const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
          const divisor = gcd(resultNumerator, denominator);
          
          if (divisor > 1) {
            answer = `${resultNumerator/divisor}/${denominator/divisor}`;
          } else {
            answer = `${resultNumerator}/${denominator}`;
          }
          
          // Common mistakes for fractions
          const wrongAnswer1 = operation === "+" 
            ? `${numerator1 + numerator2}/${denominator + denominator}` // Adding denominators
            : `${numerator1 - numerator2}/${denominator - denominator}`; // Subtracting denominators
            
          const wrongAnswer2 = `${operation === "+" ? numerator1 * numerator2 : numerator1 / numerator2}/${denominator}`; // Multiplying/dividing instead
          
          const wrongAnswer3 = `${resultNumerator + 1}/${denominator}`; // Off by one error
          
          options = [
            answer,
            wrongAnswer1,
            wrongAnswer2,
            wrongAnswer3
          ].sort(() => Math.random() - 0.5);
          
        } else {
          // Comparing fractions
          const denominators = [2, 3, 4, 5, 6, 8, 10, 12];
          const denominator1 = denominators[Math.floor(Math.random() * denominators.length)];
          const denominator2 = denominators[Math.floor(Math.random() * denominators.length)];
          
          const numerator1 = Math.floor(Math.random() * (denominator1 - 1)) + 1;
          const numerator2 = Math.floor(Math.random() * (denominator2 - 1)) + 1;
          
          const fraction1 = `${numerator1}/${denominator1}`;
          const fraction2 = `${numerator2}/${denominator2}`;
          
          // Convert to decimal for comparison
          const decimal1 = numerator1 / denominator1;
          const decimal2 = numerator2 / denominator2;
          
          question = `Which fraction is larger: ${fraction1} or ${fraction2}?`;
          
          if (decimal1 > decimal2) {
            answer = fraction1;
          } else if (decimal2 > decimal1) {
            answer = fraction2;
          } else {
            // They're equal, so choose a different denominator
            answer = fraction1;
            question = `Which fraction is equivalent to ${fraction1}?`;
            
            // Find an equivalent fraction
            const multiplier = Math.floor(Math.random() * 3) + 2; // 2-4
            const equivNumerator = numerator1 * multiplier;
            const equivDenominator = denominator1 * multiplier;
            
            options = [
              `${equivNumerator}/${equivDenominator}`, // Correct equivalent
              `${numerator1 + 1}/${denominator1}`, // Numerator +1
              `${numerator1}/${denominator1 + 1}`, // Denominator +1
              `${denominator1}/${numerator1}` // Reversed fraction
            ].sort(() => Math.random() - 0.5);
            break;
          }
          
          // For comparison questions
          options = [
            fraction1,
            fraction2,
            `They are equal`,
            `Cannot be determined`
          ];
        }
        break;
        
      case "algebra":
        // Simple algebra problems
        if (grade === "4" || grade === "5") {
          // Find the missing number
          num1 = Math.floor(Math.random() * 10) + 1; // 1-10
          num2 = Math.floor(Math.random() * 10) + 1; // 1-10
          
          // For 4-5th grade, keep it simple with one operation
          const operations = ["+", "-", "×"];
          const operation = operations[Math.floor(Math.random() * operations.length)];
          
          let result: number;
          switch (operation) {
            case "+": result = num1 + num2; break;
            case "-": 
              // Ensure positive result by swapping if needed
              if (num1 < num2) [num1, num2] = [num2, num1];
              result = num1 - num2; 
              break;
            case "×": result = num1 * num2; break;
            default: result = num1 + num2;
          }
          
          // Randomly choose which number to make unknown (x)
          const unknownPosition = Math.floor(Math.random() * 3); // 0, 1, 2
          
          if (unknownPosition === 0) {
            question = `What value of x makes this equation true? x ${operation} ${num2} = ${result}`;
            answer = num1.toString();
            
            options = [
              answer,
              (num1 + 1).toString(),
              (num1 - 1).toString(),
              (operation === "+" ? result - num2 : 
                operation === "-" ? result + num2 : 
                operation === "×" ? Math.round(result / num2) : num1).toString()
            ].sort(() => Math.random() - 0.5);
            
          } else if (unknownPosition === 1) {
            question = `What value of x makes this equation true? ${num1} ${operation} x = ${result}`;
            answer = num2.toString();
            
            options = [
              answer,
              (num2 + 1).toString(),
              (num2 - 1).toString(),
              (operation === "+" ? result - num1 : 
                operation === "-" ? num1 - result : 
                operation === "×" ? Math.round(result / num1) : num2).toString()
            ].sort(() => Math.random() - 0.5);
            
          } else {
            question = `What value of x makes this equation true? ${num1} ${operation} ${num2} = x`;
            answer = result.toString();
            
            options = [
              answer,
              (result + 1).toString(),
              (result - 1).toString(),
              (operation === "+" ? num1 - num2 : 
                operation === "-" ? num1 + num2 : 
                operation === "×" ? num1 / num2 : result).toString()
            ].sort(() => Math.random() - 0.5);
          }
          
        } else {
          // More complex equations for grade 6
          // Two-step equations like 2x + 3 = 11
          const coefficient = Math.floor(Math.random() * 5) + 2; // 2-6
          const constant = Math.floor(Math.random() * 10) + 1; // 1-10
          
          // Make the answer a nice whole number
          const answer_val = Math.floor(Math.random() * 5) + 1; // 1-5
          const result = coefficient * answer_val + constant;
          
          question = `What value of x makes this equation true? ${coefficient}x + ${constant} = ${result}`;
          answer = answer_val.toString();
          
          options = [
            answer,
            (answer_val + 1).toString(),
            (answer_val - 1).toString(),
            (result - constant).toString() // Forgot to divide by coefficient
          ].sort(() => Math.random() - 0.5);
        }
        break;
        
      case "mixed":
        // Random mixture of all categories based on grade level
        const mixedCategories = ["addition", "subtraction"];
        
        // Add more categories based on grade level
        if (grade !== "K" && grade !== "1") {
          mixedCategories.push("multiplication", "division");
        }
        
        if (grade !== "K" && grade !== "1" && grade !== "2") {
          mixedCategories.push("geometry", "time", "money");
        }
        
        if (grade !== "K" && grade !== "1" && grade !== "2" && grade !== "3") {
          mixedCategories.push("fractions");
        }
        
        if (grade === "5" || grade === "6") {
          mixedCategories.push("algebra");
        }
        
        // Randomly select a category for this mixed question
        const randomCategory = mixedCategories[Math.floor(Math.random() * mixedCategories.length)];
        return this.generateDynamicQuestion(grade, difficulty, randomCategory);
        
      default:
        // Default to simple addition if something goes wrong
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = (num1 + num2).toString();
        question = `${num1} + ${num2} = ?`;
        options = [
          answer,
          (num1 + num2 - 1).toString(),
          (num1 + num2 + 1).toString(),
          (num1 + num2 + 2).toString()
        ].sort(() => Math.random() - 0.5);
    }
    
    // Determine concepts covered in this question
    let concepts: string[] = [];
    switch(category) {
      case "addition":
        concepts = ["addition", "sum", "counting", "total"];
        // For higher grades, add place value concept
        if (grade !== "K" && grade !== "1") {
          concepts.push("place value");
        }
        break;
      case "subtraction":
        concepts = ["subtraction", "difference", "comparison"];
        if (grade !== "K" && grade !== "1") {
          concepts.push("negative numbers");
        }
        break;
      case "multiplication":
        concepts = ["multiplication", "repeated addition", "arrays"];
        if (grade !== "2") {
          concepts.push("factors");
        }
        break;
      case "division":
        concepts = ["division", "equal groups", "sharing"];
        if (grade !== "3") {
          concepts.push("remainders");
        }
        break;
      case "fractions":
        concepts = ["fractions", "parts of a whole", "numerator", "denominator"];
        break;
      case "geometry":
        if (grade === "K" || grade === "1") {
          concepts = ["shapes", "identification", "geometry"];
        } else if (grade === "2" || grade === "3") {
          concepts = ["shapes", "sides", "vertices", "properties"];
        } else {
          concepts = ["area", "perimeter", "measurement", "formulas"];
        }
        break;
      case "time":
        if (grade === "K" || grade === "1") {
          concepts = ["time", "hours", "clock reading"];
        } else if (grade === "2" || grade === "3") {
          concepts = ["time", "hours", "minutes", "clock reading"];
        } else {
          concepts = ["time", "elapsed time", "time calculation"];
        }
        break;
      case "money":
        if (grade === "K" || grade === "1") {
          concepts = ["money", "coins", "values"];
        } else if (grade === "2" || grade === "3") {
          concepts = ["money", "counting money", "currency"];
        } else {
          concepts = ["money", "making change", "decimal values"];
        }
        break;
    }
    
    // Create and return the question
    const generatedQuestion: Question = {
      id,
      category,
      grade,
      difficulty: Math.max(1, Math.min(5, difficulty)), // Ensure difficulty is between 1-5
      question,
      answer,
      options,
      concepts,
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    };
    
    // Add to questions map
    this.questions.set(id, generatedQuestion);
    
    return generatedQuestion;
  }

  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return Array.from(this.progress.values())
      .filter(progress => progress.userId === userId);
  }

  async updateUserProgress(userId: number, category: string, data: Partial<UserProgress>): Promise<UserProgress> {
    // Find existing progress or create new
    const existingProgress = Array.from(this.progress.values())
      .find(p => p.userId === userId && p.category === category);
    
    if (existingProgress) {
      const updatedProgress = { ...existingProgress, ...data };
      this.progress.set(existingProgress.id, updatedProgress);
      return updatedProgress;
    } else {
      // Create new progress entry
      const id = this.currentProgressId++;
      const newProgress: UserProgress = {
        id,
        userId,
        category,
        level: 1,
        score: 0,
        completedQuestions: 0,
        ...data
      };
      this.progress.set(id, newProgress);
      return newProgress;
    }
  }
  
  async getUserConceptMasteries(userId: number): Promise<ConceptMastery[]> {
    // Return all concept mastery entries for this user
    const masteries = Array.from(this.conceptMasteries.values())
      .filter(mastery => mastery.userId === userId);
    
    return masteries;
  }
  
  // Get all unique concepts for a specific grade level
  async getConceptsForGrade(grade: string): Promise<string[]> {
    // First look for concepts in our questions
    const questions = Array.from(this.questions.values())
      .filter(q => q.grade === grade && q.concepts && q.concepts.length > 0);
    
    // Extract unique concepts from questions
    const concepts = new Set<string>();
    questions.forEach(q => {
      if (q.concepts) {
        q.concepts.forEach(c => concepts.add(c));
      }
    });
    
    // If we don't have any concepts yet, return a default set
    if (concepts.size === 0) {
      // Default concepts by grade level
      const defaultConcepts: Record<string, string[]> = {
        'K': ['Counting', 'Number Recognition', 'Basic Shapes', 'Comparing Sizes'],
        '1': ['Addition to 20', 'Subtraction to 20', 'Place Value', 'Measurement'],
        '2': ['Addition to 100', 'Subtraction to 100', 'Time', 'Money', 'Basic Fractions'],
        '3': ['Multiplication', 'Division', 'Fractions', 'Area', 'Perimeter'],
        '4': ['Multi-digit Multiplication', 'Long Division', 'Decimals', 'Angles', 'Symmetry'],
        '5': ['Operations with Fractions', 'Decimal Operations', 'Volume', 'Coordinate Grid', 'Order of Operations'],
        '6': ['Ratios', 'Proportions', 'Negative Numbers', 'Equations', 'Statistical Measures']
      };
      
      return defaultConcepts[grade] || ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Fractions'];
    }
    
    return Array.from(concepts);
  }
  
  async updateConceptMastery(userId: number, concept: string, grade: string, isCorrect: boolean): Promise<ConceptMastery> {
    // Find existing mastery entry for this user and concept
    const existingMastery = Array.from(this.conceptMasteries.values())
      .find(m => m.userId === userId && m.concept === concept && m.grade === grade);
    
    if (existingMastery) {
      // Update existing mastery entry
      existingMastery.totalAttempts += 1;
      existingMastery.correctAttempts += isCorrect ? 1 : 0;
      existingMastery.lastPracticed = new Date();
      
      // Calculate mastery level (0-100) based on correct ratio with recent bias
      const correctRatio = existingMastery.correctAttempts / existingMastery.totalAttempts;
      
      // Adjust mastery level: 
      // - Increase if correct, decrease if incorrect
      // - More dramatic shifts at the beginning, smaller adjustments as practice count increases
      if (isCorrect) {
        existingMastery.masteryLevel = Math.min(
          100, 
          existingMastery.masteryLevel + Math.max(5, 20 / Math.sqrt(existingMastery.totalAttempts))
        );
      } else {
        existingMastery.masteryLevel = Math.max(
          0, 
          existingMastery.masteryLevel - Math.max(5, 15 / Math.sqrt(existingMastery.totalAttempts))
        );
      }
      
      // Flag for review if recent performance is poor
      existingMastery.needsReview = existingMastery.masteryLevel < 60 || !isCorrect;
      
      this.conceptMasteries.set(existingMastery.id, existingMastery);
      return existingMastery;
    } else {
      // Create new mastery entry
      const id = this.currentConceptMasteryId++;
      const newMastery: ConceptMastery = {
        id,
        userId,
        concept,
        grade,
        totalAttempts: 1,
        correctAttempts: isCorrect ? 1 : 0,
        lastPracticed: new Date(),
        masteryLevel: isCorrect ? 60 : 30, // Initial mastery level
        needsReview: !isCorrect
      };
      
      this.conceptMasteries.set(id, newMastery);
      return newMastery;
    }
  }
  
  async getUserRecommendations(userId: number): Promise<Recommendation | undefined> {
    // Find recommendation for this user
    const recommendations = Array.from(this.recommendations.values())
      .filter(rec => rec.userId === userId)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    
    return recommendations.length > 0 ? recommendations[0] : undefined;
  }
  
  async generateRecommendations(userId: number): Promise<Recommendation> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Get user's concept masteries to identify strengths and weaknesses
    const masteries = await this.getUserConceptMasteries(userId);
    
    // Get user progress to identify overall performance by category
    const progress = await this.getUserProgress(userId);
    
    // Create recommendation object
    const id = this.currentRecommendationId++;
    
    // Calculate correct rate for progress items
    const progressWithCorrectRate = progress.map(p => {
      // Assuming we track correctAnswers vs totalAnswers elsewhere
      // For now, we'll set a default correctRate value
      const correctRate = p.score > 0 && p.completedQuestions > 0 
        ? p.score / (p.completedQuestions * 10) // Assuming max score per question is 10
        : 0;
      return { ...p, correctRate };
    });
    
    // Identify concepts that need review (low mastery or marked for review)
    const conceptsToReview = masteries
      .filter(m => m.needsReview || m.masteryLevel < 60)
      .sort((a, b) => a.masteryLevel - b.masteryLevel) // Sort by mastery level, lowest first
      .slice(0, 3) // Take up to 3 concepts to review
      .map(m => m.concept);
    
    // Identify strengths (high mastery concepts)
    const conceptsToLearn = masteries
      .filter(m => m.masteryLevel >= 80)
      .sort((a, b) => b.masteryLevel - a.masteryLevel) // Sort by mastery level, highest first
      .slice(0, 3) // Take up to 3 strengths
      .map(m => m.concept);
    
    // Identify categories where user has low activity or performance
    const suggestedCategories = progressWithCorrectRate
      .filter(p => p.completedQuestions < 5) // Categories with few attempts
      .map(p => p.category);
    
    // Store detailed recommendation data in JSON format
    const recommendationData = {
      conceptReviews: masteries
        .filter(m => m.needsReview || m.masteryLevel < 60)
        .map(m => ({
          concept: m.concept,
          grade: m.grade,
          masteryLevel: m.masteryLevel,
          recommendationType: 'review'
        })),
      strengths: masteries
        .filter(m => m.masteryLevel >= 80)
        .map(m => ({
          concept: m.concept,
          grade: m.grade,
          masteryLevel: m.masteryLevel,
          recommendationType: 'strength'
        })),
      categoryRecommendations: [
        ...progressWithCorrectRate
          .filter(p => p.completedQuestions < 5)
          .map(p => ({
            category: p.category,
            recommendationType: 'explore'
          })),
        ...progressWithCorrectRate
          .filter(p => p.correctRate >= 0.7 && p.completedQuestions >= 5)
          .map(p => ({
            category: p.category,
            recommendationType: 'challenge'
          }))
      ]
    };
    
    // Calculate appropriate difficulty level based on user performance
    const averageMastery = masteries.length > 0 
      ? masteries.reduce((sum, m) => sum + m.masteryLevel, 0) / masteries.length
      : 50; // default to middle difficulty
    
    // Scale 0-100 mastery to 1-5 difficulty
    const difficultyLevel = Math.max(1, Math.min(5, 6 - Math.floor(averageMastery / 20)));
    
    const recommendation: Recommendation = {
      id,
      userId,
      conceptsToReview,
      conceptsToLearn,
      suggestedCategories,
      difficultyLevel,
      generatedAt: new Date(),
      recommendationData,
      aiInsights: "Based on your recent performance, we recommend focusing on the concepts you're struggling with.",
      learningStyleSuggestions: null
    };
    
    this.recommendations.set(id, recommendation);
    return recommendation;
  }
  
  async getRecommendedQuestion(userId: number): Promise<Question | undefined> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Get concept masteries to identify what concepts need work
    const masteries = await this.getUserConceptMasteries(userId);
    
    // Find concepts that need review, ordered by priority
    const conceptsToReview = masteries
      .filter(m => m.needsReview || m.masteryLevel < 60)
      .sort((a, b) => {
        // Order by: 1) needs review flag, 2) mastery level, 3) last practiced (oldest first)
        if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1;
        if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
        return new Date(a.lastPracticed).getTime() - new Date(b.lastPracticed).getTime();
      });
    
    if (conceptsToReview.length > 0) {
      // Select a concept to focus on
      const targetConcept = conceptsToReview[0];
      
      // Try to get a question for this concept and grade
      const questions = await this.getQuestionsByConcept(targetConcept.grade, targetConcept.concept);
      
      if (questions.length > 0) {
        // Return a random question from matching questions
        return questions[Math.floor(Math.random() * questions.length)];
      }
    }
    
    // Fallback to adaptive question selection if no concept-specific questions found
    return this.getAdaptiveQuestion(userId, user.grade || "K", false);
  }

  // Avatar system methods
  async getAvatarItems(): Promise<AvatarItem[]> {
    return Array.from(this.avatarItems.values());
  }
  
  async getAvatarItemsByType(type: string): Promise<AvatarItem[]> {
    return Array.from(this.avatarItems.values())
      .filter(item => item.type === type);
  }
  
  async getUserAvatar(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) return null;
    
    // Return the user's avatar configuration
    // Make sure we return both the selected avatar items and the owned items list
    const defaultAvatarItems = {
      hair: 1, // Default hair
      face: 4, // Default face
      outfit: 7, // Default outfit
      background: 13, // Default background
      accessory: null
    };
    
    // Convert any string IDs to numbers for consistency
    let userAvatarItems = user.avatarItems || defaultAvatarItems;
    if (typeof userAvatarItems === 'object') {
      Object.keys(userAvatarItems).forEach(key => {
        if (key !== 'accessory' && userAvatarItems[key] !== null) {
          if (typeof userAvatarItems[key] === 'string' && userAvatarItems[key] !== 'default') {
            userAvatarItems[key] = parseInt(userAvatarItems[key], 10);
          } else if (userAvatarItems[key] === 'default') {
            // Map default string values to their corresponding IDs
            if (key === 'hair') userAvatarItems[key] = 1;
            if (key === 'face') userAvatarItems[key] = 4;
            if (key === 'outfit') userAvatarItems[key] = 7;
            if (key === 'background') userAvatarItems[key] = 13;
          }
        }
      });
    }
    
    // Ensure ownedItems exists and includes default items
    const defaultOwnedItems = [1, 4, 7, 13]; // Default items are free
    const ownedItems = user.ownedAvatarItems 
      ? [...new Set([...user.ownedAvatarItems, ...defaultOwnedItems])] 
      : defaultOwnedItems;
    
    return {
      avatarItems: userAvatarItems,
      ownedItems: ownedItems
    };
  }
  
  async updateUserAvatar(userId: number, avatarData: any): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, avatarItems: avatarData };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async purchaseAvatarItem(userId: number, itemId: number): Promise<{success: boolean, message: string, user?: User}> {
    const user = await this.getUser(userId);
    if (!user) return { success: false, message: "User not found" };
    
    const item = this.avatarItems.get(itemId);
    if (!item) return { success: false, message: "Item not found" };
    
    // Check if user has enough tokens
    if (user.tokens < item.price) {
      return { success: false, message: "Not enough tokens" };
    }
    
    // Check if user already owns this item
    // Get owned items from avatarItems.unlocks array or create new array with default items
    let avatarItemsObj = user.avatarItems || {};
    if (typeof avatarItemsObj !== 'object') {
      avatarItemsObj = {};
    }
    
    // Initialize unlocks array if it doesn't exist
    if (!avatarItemsObj.unlocks) {
      avatarItemsObj.unlocks = ['default'];
    }
    
    const unlocks = Array.isArray(avatarItemsObj.unlocks) ? 
      avatarItemsObj.unlocks : ['default'];
    
    // Check if user already owns this item (either as a string or number)
    if (unlocks.includes(itemId) || unlocks.includes(itemId.toString())) {
      return { success: false, message: "Item already owned" };
    }
    
    // Update user tokens and add item to their owned items
    const updatedAvatarItems = {
      ...avatarItemsObj,
      unlocks: [...unlocks, itemId]
    };
    
    const updatedUser = { 
      ...user, 
      tokens: user.tokens - item.price,
      avatarItems: updatedAvatarItems
    };
    
    this.users.set(userId, updatedUser);
    return { success: true, message: "Item purchased successfully", user: updatedUser };
  }
  
  // Daily challenge methods
  async getCurrentDailyChallenge(): Promise<DailyChallenge | undefined> {
    // Get today's challenge or create a new one if none exists
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day
    
    // Find a challenge for today
    let challenge = Array.from(this.dailyChallenges.values())
      .find(c => c.date.getTime() === today.getTime());
    
    if (!challenge) {
      // Create a new challenge for today
      challenge = this.createDailyChallenge(today);
      
      // Make sure to properly seed the challenge - ensure we actually store it
      this.dailyChallenges.set(challenge.id, challenge);
      
      console.log(`Created new daily challenge with ID ${challenge.id} with ${challenge.questions?.length || 0} questions`);
    }
    
    return challenge;
  }
  
  async getUserDailyChallengeStatus(userId: number): Promise<{completed: boolean, currentStreak: number}> {
    const user = await this.getUser(userId);
    if (!user) return { completed: false, currentStreak: 0 };
    
    const challenge = await this.getCurrentDailyChallenge();
    if (!challenge) return { completed: false, currentStreak: 0 };
    
    // Check if user has completed today's challenge
    const completed = user.lastDailyChallenge ? 
      new Date(user.lastDailyChallenge).toDateString() === new Date().toDateString() : 
      false;
    
    return {
      completed,
      currentStreak: user.dailyChallengeStreak || 0
    };
  }
  
  async completeDailyChallenge(userId: number, challengeId: number, score: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const challenge = this.dailyChallenges.get(challengeId);
    if (!challenge) throw new Error("Challenge not found");
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if this is a streak continuation
    const lastCompletionDate = user.lastDailyChallenge ? new Date(user.lastDailyChallenge) : null;
    let newStreak = user.dailyChallengeStreak || 0;
    
    if (lastCompletionDate) {
      // If last completion was yesterday, increment streak
      if (lastCompletionDate.toDateString() === yesterday.toDateString()) {
        newStreak += 1;
      }
      // If last completion was before yesterday, reset streak
      else if (lastCompletionDate < yesterday) {
        newStreak = 1;
      }
      // If already completed today, keep streak the same
    } else {
      // First time completing a challenge
      newStreak = 1;
    }
    
    // Calculate token reward (base + streak bonus)
    const baseReward = 20;
    const streakBonus = Math.min(100, newStreak * 5); // Cap at 100 extra tokens
    const tokenReward = baseReward + streakBonus;
    
    // Update user
    const updatedUser = {
      ...user,
      lastDailyChallenge: today,
      dailyChallengeStreak: newStreak,
      tokens: (user.tokens || 0) + tokenReward
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Math storytelling methods
  async getMathStories(grade?: string): Promise<MathStory[]> {
    let stories = Array.from(this.mathStories.values());
    
    if (grade) {
      stories = stories.filter(story => story.grade === grade);
    }
    
    return stories;
  }
  
  async getMathStoryById(storyId: number): Promise<MathStory | undefined> {
    return this.mathStories.get(storyId);
  }
  
  async getStoryQuestions(storyId: number, nodeId?: number): Promise<Question[]> {
    const questions = Array.from(this.questions.values())
      .filter(q => q.storyId === storyId && (!nodeId || q.storyNode === nodeId));
    
    return questions;
  }
  
  async updateStoryProgress(userId: number, storyId: number, nodeId: number, complete: boolean): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    // Initialize story progress if it doesn't exist
    if (!user.storyProgress) user.storyProgress = {};
    
    // Update the progress for this story
    const storyProgress = user.storyProgress[storyId] || { completedNodes: [] };
    
    if (complete && !storyProgress.completedNodes.includes(nodeId)) {
      storyProgress.completedNodes.push(nodeId);
    }
    
    // Update user record
    const updatedUser = {
      ...user,
      storyProgress: {
        ...user.storyProgress,
        [storyId]: storyProgress
      }
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser.storyProgress;
  }
  
  // Multiplayer methods
  async createMultiplayerRoom(hostId: number, roomData: Partial<MultiplayerRoom>): Promise<MultiplayerRoom> {
    const roomId = this.currentMultiplayerRoomId++;
    
    // Generate a random 6-character room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const room: MultiplayerRoom = {
      id: roomId,
      hostId,
      roomCode,
      participants: [hostId],
      maxParticipants: roomData.maxParticipants || 4,
      status: 'waiting',
      grade: roomData.grade || null,
      category: roomData.category || 'all',
      createdAt: new Date(),
      endedAt: null,
      settings: roomData.settings || { questionCount: 5, timeLimit: 60 }
    };
    
    this.multiplayerRooms.set(roomId, room);
    return room;
  }
  
  async getMultiplayerRoom(roomId: number): Promise<MultiplayerRoom | undefined> {
    return this.multiplayerRooms.get(roomId);
  }
  
  async getMultiplayerRoomByCode(roomCode: string): Promise<MultiplayerRoom | undefined> {
    return Array.from(this.multiplayerRooms.values())
      .find(room => room.roomCode === roomCode);
  }
  
  async listActiveMultiplayerRooms(grade?: string): Promise<MultiplayerRoom[]> {
    return Array.from(this.multiplayerRooms.values())
      .filter(room => 
        room.status === 'waiting' && 
        room.participants.length < room.maxParticipants &&
        (!grade || room.grade === grade)
      );
  }
  
  async joinMultiplayerRoom(roomId: number, userId: number): Promise<boolean> {
    const room = this.multiplayerRooms.get(roomId);
    if (!room) return false;
    
    // Check if room is in waiting state and not full
    if (room.status !== 'waiting' || room.participants.length >= room.maxParticipants) {
      return false;
    }
    
    // Add user to participants if not already in
    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
    }
    
    this.multiplayerRooms.set(roomId, room);
    return true;
  }
  
  async leaveMultiplayerRoom(roomId: number, userId: number): Promise<boolean> {
    const room = this.multiplayerRooms.get(roomId);
    if (!room) return false;
    
    // Remove user from participants
    const index = room.participants.indexOf(userId);
    if (index !== -1) {
      room.participants.splice(index, 1);
    }
    
    // If host leaves, assign a new host or close the room
    if (userId === room.hostId) {
      if (room.participants.length > 0) {
        room.hostId = room.participants[0];
      } else {
        // No more participants, close the room
        room.status = 'closed';
        room.endedAt = new Date();
      }
    }
    
    this.multiplayerRooms.set(roomId, room);
    return true;
  }
  
  async updateMultiplayerRoom(roomId: number, data: Partial<MultiplayerRoom>): Promise<MultiplayerRoom | undefined> {
    const room = this.multiplayerRooms.get(roomId);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...data };
    this.multiplayerRooms.set(roomId, updatedRoom);
    return updatedRoom;
  }
  
  // AI analytics methods
  async generateUserAnalytics(userId: number): Promise<AiAnalytic> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const conceptMasteries = await this.getUserConceptMasteries(userId);
    const userProgress = await this.getUserProgress(userId);
    
    // Generate analytics based on user's performance
    const strengths = conceptMasteries
      .filter(cm => cm.masteryLevel >= 0.8)
      .map(cm => cm.concept);
      
    const weaknesses = conceptMasteries
      .filter(cm => cm.masteryLevel <= 0.4)
      .map(cm => cm.concept);
    
    // Determine learning style based on performance patterns
    let learningStyle = "Visual";
    if (user.fastestCategory === "wordProblems") {
      learningStyle = "Verbal";
    } else if (user.highestScoreCategory === "multiplechoice") {
      learningStyle = "Analytical";
    }
    
    // Create AI analytics record
    const analytic: AiAnalytic = {
      id: this.currentAiAnalyticId++,
      userId,
      generatedAt: new Date(),
      learningStyle,
      strengthConcepts: strengths,
      weaknessConcepts: weaknesses,
      recommendedActivities: ["flashcards", "wordProblems", "gameBasedLearning"],
      insightSummary: `Student shows proficiency in ${strengths.join(", ")} but needs more practice in ${weaknesses.join(", ")}. Recommended approach: ${learningStyle} learning activities.`,
      progressAnalysis: {
        overallProgress: userProgress.length > 0 ? "Steady improvement seen over time" : "Not enough data",
        improvementRate: user.questionsAnswered > 0 ? (user.correctAnswers / user.questionsAnswered * 100) : 0
      }
    };
    
    this.aiAnalytics.set(analytic.id, analytic);
    
    // Update user's learning style
    const updatedUser = {
      ...user,
      learningStyle,
      strengthConcepts: strengths,
      weaknessConcepts: weaknesses
    };
    
    this.users.set(userId, updatedUser);
    
    return analytic;
  }
  
  async getUserAnalytics(userId: number): Promise<AiAnalytic | undefined> {
    return Array.from(this.aiAnalytics.values())
      .find(analytics => analytics.userId === userId);
  }
  
  async updateLearningStyle(userId: number, learningStyle: string, strengths: string[], weaknesses: string[]): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = {
      ...user,
      learningStyle,
      strengthConcepts: strengths,
      weaknessConcepts: weaknesses
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Helper methods
  private createDailyChallenge(date: Date): DailyChallenge {
    const id = this.currentDailyChallengeId++;
    
    // Generate 5 random questions for the daily challenge
    const questions: Question[] = [];
    const questionIds: number[] = [];
    
    // Generate questions for different grade levels and difficulty
    for (let i = 0; i < 5; i++) {
      // Randomize grade level and difficulty to create variety
      const gradeOptions = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];
      const randomGradeIndex = Math.floor(Math.random() * gradeOptions.length);
      const grade = gradeOptions[randomGradeIndex];
      
      // Create a dynamic question for this slot
      const difficulty = Math.floor(Math.random() * 5) + 1; // 1-5 scale
      const question = this.generateDynamicQuestion(grade, difficulty);
      
      questions.push(question);
      questionIds.push(question.id);
    }
    
    // Generate random grade-appropriate questions for each grade level
    const challenge: DailyChallenge = {
      id,
      date,
      title: `Daily Math Challenge - ${date.toLocaleDateString()}`,
      description: "Complete these challenging questions to earn extra tokens and keep your streak going!",
      questionCount: 5,
      tokenReward: 20,
      streakBonus: true,
      questions: questions, // Add questions array
      questionIds: questionIds // Add question IDs array
    };
    
    this.dailyChallenges.set(id, challenge);
    return challenge;
  }
  
  // Seed methods
  private seedAvatarItems() {
    const avatarItems: AvatarItem[] = [
      // Hair items
      {
        id: this.currentAvatarItemId++,
        name: "Default Hair",
        description: "Basic hair style",
        type: "hair",
        price: 0,
        rarity: "common",
        imageUrl: null
      },
      {
        id: this.currentAvatarItemId++,
        name: "Curly Hair",
        description: "Curly hair style",
        type: "hair",
        price: 50,
        rarity: "common",
        imageUrl: null
      },
      {
        id: this.currentAvatarItemId++,
        name: "Math Genius",
        description: "Einstein-inspired hair",
        type: "hair",
        price: 150,
        rarity: "rare",
        imageUrl: null
      },
      
      // Face items
      {
        id: this.currentAvatarItemId++,
        name: "Default Face",
        description: "Standard happy face",
        type: "face",
        price: 0,
        rarity: "common",
        imageUrl: null
      },
      {
        id: this.currentAvatarItemId++,
        name: "Smiling Face",
        description: "Big smile expression",
        type: "face",
        price: 50,
        rarity: "common",
        imageUrl: null
      },
      {
        id: this.currentAvatarItemId++,
        name: "Thinking Face",
        description: "Deep in mathematical thought",
        type: "face",
        price: 100,
        rarity: "uncommon",
        imageUrl: null
      },
      
      // Outfit items
      {
        id: this.currentAvatarItemId++,
        name: "Default Outfit",
        description: "Basic student outfit",
        type: "outfit",
        price: 0,
        rarity: "common",
        imageUrl: null
      },
      {
        id: this.currentAvatarItemId++,
        name: "Math Wizard Robe",
        description: "Show off your math skills with this wizard robe",
        type: "outfit",
        price: 150,
        rarity: "rare",
        imageUrl: null
      },
      {
        id: this.currentAvatarItemId++,
        name: "Number Superhero",
        description: "Superhero outfit with math symbols",
        type: "outfit",
        price: 200,
        rarity: "epic",
        imageUrl: null
      },
      
      // Accessory items
      {
        id: this.currentAvatarItemId++,
        name: "Math Glasses",
        description: "Glasses with number patterns",
        type: "accessory",
        price: 75,
        rarity: "uncommon",
        imageUrl: null
      },
      {
        id: this.currentAvatarItemId++,
        name: "Calculator Watch",
        description: "A watch with calculator functionality",
        type: "accessory",
        price: 100,
        rarity: "uncommon",
        imageUrl: null
      },
      {
        id: this.currentAvatarItemId++,
        name: "Number Crown",
        description: "A crown made of numbers",
        type: "accessory",
        price: 300,
        rarity: "legendary",
        imageUrl: null
      },
      
      // Background items
      {
        id: this.currentAvatarItemId++,
        name: "Default Background",
        description: "Simple gradient background",
        type: "background",
        price: 0,
        rarity: "common",
        imageUrl: null
      },
      {
        id: this.currentAvatarItemId++,
        name: "Math Chalkboard",
        description: "Background with math equations",
        type: "background",
        price: 100,
        rarity: "uncommon",
        imageUrl: null
      },
      {
        id: this.currentAvatarItemId++,
        name: "Universe of Numbers",
        description: "Space background with floating math symbols",
        type: "background",
        price: 250,
        rarity: "epic",
        imageUrl: null
      }
    ];
    
    // Add items to the storage
    avatarItems.forEach(item => {
      this.avatarItems.set(item.id, item);
    });
  }
  
  private seedDailyChallenges() {
    // Create a challenge for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.createDailyChallenge(today);
    
    // Create one for yesterday to test streaks
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    this.createDailyChallenge(yesterday);
  }

  private seedQuestions() {
    // Import expanded question set with 50 varied questions
    const { defaultQuestions } = require('./data/questions');
    
    // Add all default questions to the map
    for (const question of defaultQuestions) {
      this.questions.set(question.id, question);
    }
    
    // Keep the original questions for backward compatibility
    // Addition - Grade K-2
    const additionK2 = [
      {
        category: "addition",
        grade: "K",
        difficulty: 1,
        question: "1 + 1 = ?",
        answer: "2",
        options: ["1", "2", "3", "4"],
        concepts: ["addition", "counting", "sum"]
      },
      {
        category: "addition",
        grade: "K",
        difficulty: 1,
        question: "2 + 1 = ?",
        answer: "3",
        options: ["2", "3", "4", "5"]
      },
      {
        category: "addition",
        grade: "1",
        difficulty: 2,
        question: "3 + 5 = ?",
        answer: "8",
        options: ["7", "8", "9", "10"]
      },
      {
        category: "addition",
        grade: "1",
        difficulty: 2,
        question: "4 + 2 = ?",
        answer: "6",
        options: ["5", "6", "7", "8"]
      },
      {
        category: "addition",
        grade: "2",
        difficulty: 3,
        question: "7 + 5 = ?",
        answer: "12",
        options: ["10", "11", "12", "13"]
      },
      {
        category: "addition",
        grade: "2",
        difficulty: 3,
        question: "8 + 6 = ?",
        answer: "14",
        options: ["12", "13", "14", "15"]
      }
    ];
    
    // Subtraction - Grade K-2
    const subtractionK2 = [
      {
        category: "subtraction",
        grade: "K",
        difficulty: 1,
        question: "2 - 1 = ?",
        answer: "1",
        options: ["0", "1", "2", "3"]
      },
      {
        category: "subtraction",
        grade: "K",
        difficulty: 1,
        question: "3 - 1 = ?",
        answer: "2",
        options: ["1", "2", "3", "4"]
      },
      {
        category: "subtraction",
        grade: "1",
        difficulty: 2,
        question: "5 - 2 = ?",
        answer: "3",
        options: ["2", "3", "4", "5"]
      },
      {
        category: "subtraction",
        grade: "1",
        difficulty: 2,
        question: "7 - 4 = ?",
        answer: "3",
        options: ["2", "3", "4", "5"]
      },
      {
        category: "subtraction",
        grade: "2",
        difficulty: 3,
        question: "12 - 5 = ?",
        answer: "7",
        options: ["6", "7", "8", "9"]
      },
      {
        category: "subtraction",
        grade: "2",
        difficulty: 3,
        question: "14 - 6 = ?",
        answer: "8",
        options: ["7", "8", "9", "10"]
      }
    ];
    
    // Addition & Subtraction - Grade 3-4
    const mathGrade34 = [
      {
        category: "addition",
        grade: "3",
        difficulty: 3,
        question: "15 + 26 = ?",
        answer: "41",
        options: ["39", "40", "41", "42"]
      },
      {
        category: "subtraction",
        grade: "3",
        difficulty: 3,
        question: "45 - 17 = ?",
        answer: "28",
        options: ["27", "28", "29", "30"]
      },
      {
        category: "multiplication",
        grade: "3",
        difficulty: 3,
        question: "3 × 4 = ?",
        answer: "12",
        options: ["10", "11", "12", "15"]
      },
      {
        category: "addition",
        grade: "4",
        difficulty: 4,
        question: "125 + 136 = ?",
        answer: "261",
        options: ["251", "261", "271", "361"]
      },
      {
        category: "subtraction",
        grade: "4",
        difficulty: 4,
        question: "245 - 128 = ?",
        answer: "117",
        options: ["107", "117", "127", "137"]
      },
      {
        category: "multiplication",
        grade: "4",
        difficulty: 4,
        question: "7 × 8 = ?",
        answer: "56",
        options: ["42", "48", "54", "56"]
      }
    ];
    
    // Math - Grade 5-6
    const mathGrade56 = [
      {
        category: "multiplication",
        grade: "5",
        difficulty: 4,
        question: "12 × 11 = ?",
        answer: "132",
        options: ["121", "122", "132", "144"]
      },
      {
        category: "division",
        grade: "5",
        difficulty: 4,
        question: "72 ÷ 9 = ?",
        answer: "8",
        options: ["7", "8", "9", "10"]
      },
      {
        category: "fractions",
        grade: "5",
        difficulty: 5,
        question: "1/4 + 1/2 = ?",
        answer: "3/4",
        options: ["2/6", "3/4", "5/8", "2/4"]
      },
      {
        category: "multiplication",
        grade: "6",
        difficulty: 5,
        question: "25 × 24 = ?",
        answer: "600",
        options: ["580", "600", "624", "650"]
      },
      {
        category: "division",
        grade: "6",
        difficulty: 5,
        question: "144 ÷ 12 = ?",
        answer: "12",
        options: ["10", "11", "12", "14"]
      },
      {
        category: "fractions",
        grade: "6",
        difficulty: 5,
        question: "2/3 + 1/6 = ?",
        answer: "5/6",
        options: ["3/6", "3/9", "5/6", "3/4"]
      }
    ];
    
    // Add all questions to storage
    const allQuestions = [...additionK2, ...subtractionK2, ...mathGrade34, ...mathGrade56];
    
    allQuestions.forEach(q => {
      const id = this.currentQuestionId++;
      // Add concepts based on category if not specified
      let concepts: string[] = q.concepts || [];
      if (concepts.length === 0) {
        switch (q.category) {
          case "addition":
            concepts = ["addition", "sum", "counting"];
            break;
          case "subtraction":
            concepts = ["subtraction", "difference"];
            break;
          case "multiplication":
            concepts = ["multiplication", "repeated addition"];
            break;
          case "division":
            concepts = ["division", "equal groups"];
            break;
          case "fractions":
            concepts = ["fractions", "parts of a whole"];
            break;
          case "geometry":
            concepts = ["shapes", "geometry"];
            break;
          case "time":
            concepts = ["time", "clock reading"];
            break;
          case "money":
            concepts = ["money", "coins"];
            break;
        }
      }
      this.questions.set(id, { ...q, id, concepts });
    });
  }
}

// Import the DatabaseStorage implementation
import { DatabaseStorage } from './database-storage';

// Since we can't use dynamic imports easily with the circular dependency,
// let's just export both implementations and let the consumer decide which to use

// Use PostgreSQL database storage for persistence instead of in-memory storage
export const storage = new DatabaseStorage();
