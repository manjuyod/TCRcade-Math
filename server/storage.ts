import { users, type User, type InsertUser, userProgress, type UserProgress, type Question, type Leaderboard } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getLeaderboard(): Promise<Array<User & { score: number }>>;
  
  // Question methods
  getQuestionsByGrade(grade: string, category?: string): Promise<Question[]>;
  getAdaptiveQuestion(userId: number, grade: string): Promise<Question | undefined>;
  
  // Progress methods
  getUserProgress(userId: number): Promise<UserProgress[]>;
  updateUserProgress(userId: number, category: string, data: Partial<UserProgress>): Promise<UserProgress>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private questions: Map<number, Question>;
  private progress: Map<number, UserProgress>;
  private leaderboard: Map<number, Leaderboard>;
  sessionStore: session.SessionStore;
  currentId: number;
  currentQuestionId: number;
  currentProgressId: number;
  currentLeaderboardId: number;

  constructor() {
    this.users = new Map();
    this.questions = new Map();
    this.progress = new Map();
    this.leaderboard = new Map();
    this.currentId = 1;
    this.currentQuestionId = 1;
    this.currentProgressId = 1;
    this.currentLeaderboardId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 1 day
    });
    
    // Add sample math questions for each grade
    this.seedQuestions();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
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
      correctAnswers: 0
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

  async getQuestionsByGrade(grade: string, category?: string): Promise<Question[]> {
    const questions = Array.from(this.questions.values())
      .filter(q => q.grade === grade && (!category || q.category === category));
    
    return questions;
  }

  async getAdaptiveQuestion(userId: number, grade: string): Promise<Question | undefined> {
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
    
    // Get questions matching the difficulty and grade
    const questions = Array.from(this.questions.values())
      .filter(q => q.grade === grade && Math.abs(q.difficulty - targetDifficulty) <= 1);
    
    if (questions.length === 0) {
      // Fallback to any questions of the right grade
      return Array.from(this.questions.values())
        .filter(q => q.grade === grade)
        .sort(() => Math.random() - 0.5)[0];
    }
    
    // Return a random question from the filtered list
    return questions[Math.floor(Math.random() * questions.length)];
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

  private seedQuestions() {
    // Addition - Grade K-2
    const additionK2 = [
      {
        category: "addition",
        grade: "K",
        difficulty: 1,
        question: "1 + 1 = ?",
        answer: "2",
        options: ["1", "2", "3", "4"]
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
      this.questions.set(id, { ...q, id });
    });
  }
}

export const storage = new MemStorage();
