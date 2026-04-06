import { 
  users, type User, type InsertUser, 
  questions, type Question,
  questionsAddition, questionsMultiplication, questionsAlgebra, questionsMeasurementAndData,
  recommendations, type Recommendation,
  avatarItems, type AvatarItem,
  dailyChallenges, type DailyChallenge,
  mathStories, type MathStory,
  multiplayerRooms, type MultiplayerRoom,
  aiAnalytics, type AiAnalytic,
  leaderboard, type Leaderboard,
  moduleHistory, type ModuleHistory,
  tutorSessions, type TutorSession, type InsertTutorSession,
  tutorChatMessages, type TutorChatMessage, type InsertTutorChatMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, like, asc, isNull, or, inArray, not, sql } from "drizzle-orm";
import { sessionStore } from "./session";
// Use type import to avoid circular dependencies
import type { IStorage } from "./storage";

type IncrementalUpdate<T> = {
  [K in keyof T]?: T[K] | { increment: number };
};

// Helper function to shuffle answer options
function shuffleAnswerOptions(question: Question): Question {
  if (!question.options || question.options.length <= 1) {
    return question;
  }

  // Create a copy of the question to avoid mutating the original
  const shuffledQuestion = { ...question };

  // Use a more robust shuffling algorithm with multiple passes
  let shuffledOptions = [...question.options];

  // Perform multiple shuffle passes for better randomization
  for (let pass = 0; pass < 3; pass++) {
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }
  }

  // Additional randomization: ensure the correct answer isn't always in the same position
  const correctAnswer = question.answer;
  const correctIndex = shuffledOptions.indexOf(correctAnswer);

  // If correct answer is in first position, randomly swap it with another position
  if (correctIndex === 0 && Math.random() < 0.7) {
    const swapIndex = Math.floor(Math.random() * (shuffledOptions.length - 1)) + 1;
    [shuffledOptions[0], shuffledOptions[swapIndex]] = [shuffledOptions[swapIndex], shuffledOptions[0]];
  }

  shuffledQuestion.options = shuffledOptions;
  return shuffledQuestion;
}

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
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      return result[0];
    } catch (error) {
      console.error("Error fetching user by username:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return result[0];
    } catch (error) {
      console.error("Error fetching user by email:", error);
      return undefined;
    }
  }

  async getUsersByEmail(email: string): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .where(eq(users.email, email));
    } catch (error) {
      console.error("Error fetching users by email:", error);
      return [];
    }
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

  
  async updateUser(id: number, data: IncrementalUpdate<User>): Promise<User | undefined> {
    console.log(`DATABASE: Updating user ${id} with data:`, data);

    try {
      // Start a transaction to ensure all updates are atomic
      const [updatedUser] = await db.transaction(async (tx) => {
        // Get current user data first to ensure we have the latest values
        const [currentUser] = await tx
          .select()
          .from(users)
          .where(eq(users.id, id));

        if (!currentUser) {
          throw new Error(`User with ID ${id} not found`);
        }

        // 🔧 Safely calculate incremented fields manually
        const updatedFields: any = {};
        
        // Handle increment fields
        if (typeof data.tokens === 'object' && 'increment' in data.tokens) {
          updatedFields.tokens = (currentUser.tokens || 0) + (data.tokens as any).increment;
        } else if (data.tokens !== undefined) {
          updatedFields.tokens = data.tokens;
        }

        if (typeof data.questionsAnswered === 'object' && 'increment' in data.questionsAnswered) {
          updatedFields.questionsAnswered = (currentUser.questionsAnswered || 0) + (data.questionsAnswered as any).increment;
        } else if (data.questionsAnswered !== undefined) {
          updatedFields.questionsAnswered = data.questionsAnswered;
        }

        if (typeof data.correctAnswers === 'object' && 'increment' in data.correctAnswers) {
          updatedFields.correctAnswers = (currentUser.correctAnswers || 0) + (data.correctAnswers as any).increment;
        } else if (data.correctAnswers !== undefined) {
          updatedFields.correctAnswers = data.correctAnswers;
        }

        // Add other non-increment fields
        Object.keys(data).forEach(key => {
          if (!['tokens', 'questionsAnswered', 'correctAnswers'].includes(key)) {
            updatedFields[key] = (data as any)[key];
          }
        });

        // Check if there are any fields to update
        if (Object.keys(updatedFields).length === 0) {
          throw new Error("No values to set");
        }

        const result = await tx
            .update(users)
            .set(updatedFields)
            .where(eq(users.id, id))
            .returning();

          return result;
        });
      
      console.log(`DATABASE: User ${id} update successful:`, updatedUser?.tokens);
      return updatedUser;
    } catch (error) {
      console.error(`DATABASE ERROR: Failed to update user ${id}:`, error);
      throw error;
    }
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
    try {
      const leaderboardUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.tokens))
        .limit(20);

      // Log for debugging
      console.log(`Leaderboard users found: ${leaderboardUsers.length}`);

      return leaderboardUsers.map(user => ({
        ...user,
        score: user.tokens || 0
      }));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  // Question methods
  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id));

    return question ? shuffleAnswerOptions(question) : question;
  }

  async getQuestions(filters?: { category?: string; difficulty?: number; concepts?: string[] }): Promise<Question[]> {
    console.log('[DatabaseStorage] getQuestions called with filters:', filters);
    
    // Query all 5 question tables in parallel
    const [
      baseQuestions,
      additionRawQuestions,
      multiplicationRawQuestions,
      algebraRawQuestions,
      measurementRawQuestions
    ] = await Promise.all([
      this.getBaseQuestions(filters),
      db.select().from(questionsAddition),
      db.select().from(questionsMultiplication),
      db.select().from(questionsAlgebra),
      db.select().from(questionsMeasurementAndData)
    ]);

    console.log('[DatabaseStorage] Retrieved questions from all tables:', {
      base: baseQuestions.length,
      addition: additionRawQuestions.length,
      multiplication: multiplicationRawQuestions.length,
      algebra: algebraRawQuestions.length,
      measurement: measurementRawQuestions.length
    });

    // Convert questions to proper Question format - different logic for different table structures
    const additionQuestions = this.convertRawToQuestions(additionRawQuestions, 'addition');
    const multiplicationQuestions = this.convertRawToQuestions(multiplicationRawQuestions, 'multiplication');
    const algebraQuestions = this.convertStructuredToQuestions(algebraRawQuestions, 'algebra');
    const measurementQuestions = this.convertStructuredToQuestions(measurementRawQuestions, 'measurement');

    // Combine all questions
    const allQuestions = [
      ...baseQuestions,
      ...additionQuestions,
      ...multiplicationQuestions,
      ...algebraQuestions,
      ...measurementQuestions
    ];

    console.log('[DatabaseStorage] Combined total questions:', allQuestions.length);

    // Apply additional filters if needed
    let filteredQuestions = allQuestions;
    
    if (filters?.category) {
      filteredQuestions = allQuestions.filter(q => q.category === filters.category);
      console.log('[DatabaseStorage] After category filter:', filteredQuestions.length);
    }

    if (filters?.difficulty !== undefined) {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === filters.difficulty);
      console.log('[DatabaseStorage] After difficulty filter:', filteredQuestions.length);
    }

    if (filters?.concepts && filters.concepts.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.concepts && q.concepts.some(concept => filters.concepts!.includes(concept))
      );
      console.log('[DatabaseStorage] After concepts filter:', filteredQuestions.length);
    }

    // Shuffle answer options for each question
    const shuffledResult = filteredQuestions.map(question => shuffleAnswerOptions(question));
    console.log('[DatabaseStorage] Returning', shuffledResult.length, 'shuffled questions');
    
    return shuffledResult;
  }

  private async getBaseQuestions(filters?: { category?: string; difficulty?: number; concepts?: string[] }): Promise<Question[]> {
    let query = db.select().from(questions);

    // Build filters array for base questions table
    const whereConditions = [];

    if (filters?.category) {
      whereConditions.push(eq(questions.category, filters.category));
    }

    if (filters?.difficulty !== undefined) {
      whereConditions.push(eq(questions.difficulty, filters.difficulty));
    }

    if (filters?.concepts && filters.concepts.length > 0) {
      const conceptConditions = filters.concepts.map(concept => 
        sql`${questions.concepts} @> ${JSON.stringify([concept])}`
      );
      whereConditions.push(or(...conceptConditions));
    }

    // Apply filters if any exist
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    return await query;
  }

  private convertRawToQuestions(rawQuestions: any[], category: string): Question[] {
    return rawQuestions.map(raw => {
      const question = this.generateQuestionFromIntegers(raw.int1, raw.int2, raw.int3, category);
      return {
        id: raw.id,
        category: category,
        grade: this.determineGradeLevel(raw.int1, raw.int2, raw.int3, category),
        difficulty: this.determineDifficulty(raw.int1, raw.int2, raw.int3, category),
        question: question.text,
        answer: question.answer,
        options: question.options,
        concepts: question.concepts,
        storyId: null,
        storyNode: null,
        storyText: null,
        storyImage: null
      };
    });
  }

  private convertStructuredToQuestions(structuredQuestions: any[], category: string): Question[] {
    return structuredQuestions.map(structured => {
      // Parse the AnswerBank JSON to extract question and answer data
      let questionText = '';
      let correctAnswer = '';
      let options: string[] = [];
      
      try {
        const answerBank = structured.AnswerBank;
        if (answerBank && answerBank.question) {
          questionText = answerBank.question.text || structured.Title || 'Question';
        } else {
          questionText = structured.Title || 'Question';
        }
        
        // Parse CorrectAnswer - can be JSON array or simple string
        if (structured.CorrectAnswer) {
          try {
            const correctAnswers = JSON.parse(structured.CorrectAnswer);
            if (Array.isArray(correctAnswers) && correctAnswers.length > 0) {
              correctAnswer = correctAnswers[0];
              // Use all correct answers as options and add some distractors
              options = [...correctAnswers];
            } else {
              correctAnswer = structured.CorrectAnswer;
            }
          } catch {
            correctAnswer = structured.CorrectAnswer;
          }
        }
        
        // Generate additional options if we don't have enough
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }
        
      } catch (error) {
        console.error('Error parsing structured question:', error);
        questionText = structured.Title || 'Question';
        correctAnswer = 'Answer';
        options = ['Answer', 'Option 2', 'Option 3', 'Option 4'];
      }

      return {
        id: structured.id,
        category: category,
        grade: structured.GradeLevel?.toString() || '6',
        difficulty: this.mapGradeToDifficulty(structured.GradeLevel || 6),
        question: questionText,
        answer: correctAnswer,
        options: options.slice(0, 4),
        concepts: this.extractConceptsFromStructured(structured, category),
        storyId: null,
        storyNode: null,
        storyText: null,
        storyImage: null
      };
    });
  }

  private mapGradeToDifficulty(gradeLevel: number): number {
    if (gradeLevel <= 1) return 1;
    if (gradeLevel <= 2) return 2;
    if (gradeLevel <= 4) return 3;
    if (gradeLevel <= 5) return 4;
    return 5;
  }

  private extractConceptsFromStructured(structured: any, category: string): string[] {
    const concepts = [category];
    
    if (structured.Title) {
      const title = structured.Title.toLowerCase();
      if (title.includes('equation')) concepts.push('equations');
      if (title.includes('expression')) concepts.push('expressions');
      if (title.includes('variable')) concepts.push('variables');
      if (title.includes('solve')) concepts.push('solving');
      if (title.includes('measurement')) concepts.push('measurement');
      if (title.includes('data')) concepts.push('data_analysis');
    }
    
    if (structured.Section) {
      concepts.push(structured.Section.toLowerCase().replace(/\s+/g, '_'));
    }
    
    return concepts;
  }

  private generateQuestionFromIntegers(int1: number, int2: number, int3: number, category: string): {
    text: string;
    answer: string;
    options: string[];
    concepts: string[];
  } {
    switch (category) {
      case 'addition':
        const addAnswer = int1 + int2;
        return {
          text: `What is ${int1} + ${int2}?`,
          answer: addAnswer.toString(),
          options: this.generateMathOptions(addAnswer),
          concepts: ['addition', int1 > 10 || int2 > 10 ? 'multi_digit_addition' : 'single_digit_addition']
        };

      case 'multiplication':
        const multAnswer = int1 * int2;
        return {
          text: `What is ${int1} × ${int2}?`,
          answer: multAnswer.toString(),
          options: this.generateMathOptions(multAnswer),
          concepts: ['multiplication', 'times_tables']
        };

      case 'algebra':
        // Use int3 as the missing value, int1 and int2 for the equation
        const algebraAnswer = int3;
        return {
          text: `If x + ${int1} = ${int2}, what is x?`,
          answer: (int2 - int1).toString(),
          options: this.generateMathOptions(int2 - int1),
          concepts: ['algebra', 'solving_equations', 'variables']
        };

      case 'measurement':
        // Generate measurement questions using the integers
        const measurementTypes = ['length', 'weight', 'volume'];
        const measurementType = measurementTypes[int1 % 3];
        return {
          text: `A container holds ${int1} liters. If you add ${int2} more liters, how many liters total?`,
          answer: (int1 + int2).toString(),
          options: this.generateMathOptions(int1 + int2),
          concepts: ['measurement', 'volume', 'addition']
        };

      default:
        return {
          text: `What is ${int1} + ${int2}?`,
          answer: (int1 + int2).toString(),
          options: this.generateMathOptions(int1 + int2),
          concepts: ['basic_math']
        };
    }
  }

  private generateMathOptions(correctAnswer: number): string[] {
    const options = [correctAnswer.toString()];
    
    // Generate 3 incorrect options
    const incorrectOptions = [
      (correctAnswer + Math.floor(Math.random() * 5) + 1).toString(),
      (correctAnswer - Math.floor(Math.random() * 5) - 1).toString(),
      (correctAnswer + Math.floor(Math.random() * 10) + 5).toString()
    ];

    // Add incorrect options, ensuring no duplicates
    incorrectOptions.forEach(option => {
      if (!options.includes(option) && parseInt(option) > 0) {
        options.push(option);
      }
    });

    // Ensure we have 4 options
    while (options.length < 4) {
      const randomOption = (correctAnswer + Math.floor(Math.random() * 20) - 10).toString();
      if (!options.includes(randomOption) && parseInt(randomOption) > 0) {
        options.push(randomOption);
      }
    }

    // Shuffle the options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return options.slice(0, 4);
  }

  private determineGradeLevel(int1: number, int2: number, int3: number, category: string): string {
    const maxValue = Math.max(int1, int2, int3);
    
    if (maxValue <= 10) return 'K';
    if (maxValue <= 20) return '1';
    if (maxValue <= 50) return '2';
    if (maxValue <= 100) return '3';
    if (maxValue <= 500) return '4';
    if (maxValue <= 1000) return '5';
    return '6';
  }

  private determineDifficulty(int1: number, int2: number, int3: number, category: string): number {
    const maxValue = Math.max(int1, int2, int3);
    
    if (maxValue <= 10) return 1;
    if (maxValue <= 50) return 2;
    if (maxValue <= 100) return 3;
    if (maxValue <= 500) return 4;
    return 5;
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

    // Shuffle answer options for each question to prevent predictable correct answer positions
    const shuffledResults = filteredResults.map(question => shuffleAnswerOptions(question));

    return shuffledResults;
  }

  async getQuestionsByConcept(grade: string, concept: string): Promise<Question[]> {
    // Need to query for questions with the concept in their concepts array
    const questionsWithConcept = await db
      .select()
      .from(questions)
      .where(and(
        eq(questions.grade, grade),
        sql`${concept} = ANY(${questions.concepts})`
      ));

    // Shuffle answer options for each question to prevent predictable correct answer positions
    const shuffledResults = questionsWithConcept.map(question => shuffleAnswerOptions(question));

    return shuffledResults;
  }

  // Progress methods (now handled via JSON in users table)
  // Progress tracking migrated to hiddenGradeAsset JSON field

  // Concept mastery methods now use JSON data from users table
  async getUserConceptMasteries(userId: number): Promise<any[]> {
    const user = await this.getUser(userId);
    if (!user?.hiddenGradeAsset) return [];

    const hiddenGradeAsset = user.hiddenGradeAsset as any;
    return hiddenGradeAsset.concept_mastery || [];
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

  async updateConceptMastery(userId: number, concept: string, grade: string, isCorrect: boolean, questionDifficulty?: number): Promise<any> {
    // Enhance concept specificity based on grade and difficulty
    let enhancedConcept = concept;

    if (concept === 'addition') {
      if (grade === 'K' || grade === '1' || (questionDifficulty && questionDifficulty <= 2)) {
        enhancedConcept = 'single-digit addition';
      } else {
        enhancedConcept = 'multi-digit addition';
      }
    } else if (concept === 'subtraction') {
      if (grade === 'K' || grade === '1' || (questionDifficulty && questionDifficulty <= 2)) {
        enhancedConcept = 'single-digit subtraction';
      } else {
        enhancedConcept = 'multi-digit subtraction';
      }
    } else if (concept === 'multiplication') {
      if (grade === '2' || grade === '3' || (questionDifficulty && questionDifficulty <= 3)) {
        enhancedConcept = 'basic multiplication facts';
      } else {
        enhancedConcept = 'multi-digit multiplication';
      }
    } else if (concept === 'division') {
      if (grade === '3' || grade === '4' || (questionDifficulty && questionDifficulty <= 3)) {
        enhancedConcept = 'basic division facts';
      } else {
        enhancedConcept = 'long division';
      }
    }

    // Update concept mastery in user's JSON data
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const hiddenGradeAsset = (user.hiddenGradeAsset as any) || {};
    const conceptMasteries = hiddenGradeAsset.concept_mastery || [];

    // Find existing mastery entry
    const existingIndex = conceptMasteries.findIndex((m: any) => 
      m.userId === userId && m.concept === enhancedConcept && m.grade === grade
    );

    if (existingIndex >= 0) {
      // Update existing mastery
      const existing = conceptMasteries[existingIndex];
      const totalAttempts = existing.totalAttempts + 1;
      const correctAttempts = existing.correctAttempts + (isCorrect ? 1 : 0);
      const masteryLevel = Math.round((correctAttempts / totalAttempts) * 100);

      conceptMasteries[existingIndex] = {
        ...existing,
        totalAttempts,
        correctAttempts,
        lastPracticed: new Date(),
        masteryLevel,
        needsReview: masteryLevel < 70
      };
    } else {
      // Create new mastery entry
      conceptMasteries.push({
        id: Date.now(), // Simple ID generation
        userId,
        concept: enhancedConcept,
        grade,
        totalAttempts: 1,
        correctAttempts: isCorrect ? 1 : 0,
        lastPracticed: new Date(),
        masteryLevel: isCorrect ? 100 : 0,
        needsReview: !isCorrect
      });
    }

    // Update user's hiddenGradeAsset
    await this.updateUser(userId, {
      hiddenGradeAsset: {
        ...hiddenGradeAsset,
        concept_mastery: conceptMasteries
      }
    });

    return conceptMasteries[existingIndex >= 0 ? existingIndex : conceptMasteries.length - 1];
  }

  // Automatically generate user analytics if needed
  async autoUpdateAnalytics(userId: number): Promise<void> {
    // Check if analytics have been generated in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [existingAnalytics] = await db
      .select()
      .from(aiAnalytics)
      .where(and(
        eq(aiAnalytics.userId, userId),
        gte(aiAnalytics.analysisDate, twentyFourHoursAgo)
      ))
      .limit(1);

    if (!existingAnalytics) {
      console.log(`No recent analytics found for user ${userId}, generating new analytics...`);
      await this.generateUserAnalytics(userId);
    } else {
      console.log(`Recent analytics found for user ${userId}, skipping analytics generation.`);
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

    // Calculate concept masteries from module data
    const conceptMasteries = await this.calculateConceptMasteries(userId, user);
    
    // Update user's hiddenGradeAsset with the new concept mastery data
    const hiddenGradeAsset = user.hiddenGradeAsset || {};
    hiddenGradeAsset.concept_mastery = conceptMasteries;

    // Identify user's strengths and weaknesses based on weighted scores
    const strengthConcepts = Object.entries(conceptMasteries)
      .filter(([_, mastery]: [string, any]) => mastery.weightedScore >= 80)
      .sort(([_a, a]: [string, any], [_b, b]: [string, any]) => b.weightedScore - a.weightedScore)
      .slice(0, 5)
      .map(([concept, _]) => concept);

    const weaknessConcepts = Object.entries(conceptMasteries)
      .filter(([_, mastery]: [string, any]) => mastery.weightedScore < 60 && !strengthConcepts.includes(_))
      .sort(([_a, a]: [string, any], [_b, b]: [string, any]) => a.weightedScore - b.weightedScore)
      .slice(0, 5)
      .map(([concept, _]) => concept);

    // Get progress data from the updated hiddenGradeAsset
    const progressData = hiddenGradeAsset.user_progress || [];

    // Create a simple analysis based on available data
    const strongCategories = progressData
      .filter((p: any) => p.score > 100)
      .map((p: any) => p.category);

    // Map weaknesses to practice activities but also add common learning activities
    // Explicitly avoiding "daily challenge" and "multiplayer" as per requirements
    const recommendedActivities = [
      ...weaknessConcepts.map(w => `Practice ${w}`),
      'flashcards',
      'wordProblems',
      'conceptMapping',
      'realWorldApplications'
    ];

    // Calculate engagement metrics from module data
    const modules = hiddenGradeAsset.modules || {};
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalSessions = 0;
    let totalTimeSpent = 0;

    Object.values(modules).forEach((module: any) => {
      if (module.progress) {
        totalQuestions += module.progress.total_questions_answered || 0;
        totalCorrect += module.progress.correct_answers || 0;
        totalSessions += module.progress.sessions_completed || 0;
        totalTimeSpent += module.progress.time_spent_total || 0;
      }
    });

    // Create comprehensive analytics data
    const analyticsData = {
      analysis_date: new Date().toISOString(),
      learning_patterns: {
        correctAnswerRate: totalQuestions > 0 ? totalCorrect / totalQuestions : 0,
        questionsPerSession: totalSessions > 0 ? totalQuestions / totalSessions : 0,
        totalSessions,
        averageTimePerQuestion: totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0,
        preferredCategories: strongCategories
      },
      strengths: strengthConcepts.slice(0, 5),
      areas_for_improvement: weaknessConcepts.slice(0, 5),
      engagement_analysis: {
        totalSessionTime: totalTimeSpent,
        dailyEngagementMinutes: user.dailyEngagementMinutes || 0,
        activityBreakdown: {
          totalQuestions,
          totalCorrect,
          totalSessions
        }
      },
      suggested_activities: recommendedActivities,
      weaknesses: weaknessConcepts.slice(0, 5),
      datetime_generated: new Date().toISOString()
    };

    // Update user's hiddenGradeAsset with the new analytics data and concept mastery
    const updatedHiddenGradeAsset = {
      ...hiddenGradeAsset,
      concept_mastery: conceptMasteries,
      ai_analytics: analyticsData
    };

    // Update user in database with new analytics in hiddenGradeAsset
    await db
      .update(users)
      .set({
        hiddenGradeAsset: updatedHiddenGradeAsset,
        strengthConcepts: strengthConcepts,
        weaknessConcepts: weaknessConcepts
      })
      .where(eq(users.id, userId));

    // Also create a new analytics entry in the separate table for historical tracking
    const [analytic] = await db
      .insert(aiAnalytics)
      .values({
        userId,
        analysisDate: new Date(),
        learningPatterns: analyticsData.learning_patterns,
        strengths: strengthConcepts.slice(0, 5),
        areasForImprovement: weaknessConcepts.slice(0, 5),
        engagementAnalysis: analyticsData.engagement_analysis,
        suggestedActivities: recommendedActivities,
        recommendedActivities,
        strengthConcepts: strengthConcepts,
        weaknessConcepts: weaknessConcepts
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

      // SPECIAL HANDLING FOR MEASUREMENT CATEGORY
      if (category === 'measurement') {
        console.log(`Measurement category detected - querying questions_measurementAndData table`);

        try {
          // Import the schema for questions_measurementAndData
          const { questionsMeasurementAndData } = await import("@shared/schema");

          // Build measurement query with grade fallback logic
          // Since measurement questions are only available for certain grades, 
          // map user grades to available measurement content
          let measurementGrade = parseInt(grade);

          // Map all user grades to Grade 2 since that's the only available measurement content
          measurementGrade = 2;

          const measurementQuestions = await db
            .select()
            .from(questionsMeasurementAndData)
            .where(eq(questionsMeasurementAndData.GradeLevel, measurementGrade));

          console.log(`Found ${measurementQuestions.length} measurement questions for mapped grade ${measurementGrade} (user grade: ${grade})`);

          if (measurementQuestions.length > 0) {
            // Filter out excluded IDs if any
            let filteredQuestions = measurementQuestions;
            if (excludeIds.length > 0) {
              filteredQuestions = measurementQuestions.filter(q => !excludeIds.includes(q.id));
              console.log(`After excluding ${excludeIds.length} IDs: ${filteredQuestions.length} questions remain`);
            }

            if (filteredQuestions.length > 0) {
              // Select a random question
              const selectedMeasurement = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];

              // Parse the AnswerBank JSON to extract question and options
              let questionText = selectedMeasurement.Title;
              let options: string[] = [];

              try {
                const answerBank = typeof selectedMeasurement.AnswerBank === 'string' 
                  ? JSON.parse(selectedMeasurement.AnswerBank) 
                  : selectedMeasurement.AnswerBank;

                // Extract question text from AnswerBank if available
                if (answerBank?.question?.text) {
                  questionText = answerBank.question.text;
                }

                // Extract options from AnswerBank
                if (answerBank?.options && Array.isArray(answerBank.options)) {
                  options = answerBank.options
                    .filter(opt => opt.text && opt.text.trim())
                    .map(opt => opt.text);
                }
              } catch (e) {
                console.error('Error parsing AnswerBank:', e);
              }

              // Fallback if no options found
              if (options.length === 0) {
                options = [selectedMeasurement.CorrectAnswer, "Option B", "Option C", "Option D"];
              }

              // Transform to match Question interface
              const transformedQuestion: Question = {
                id: selectedMeasurement.id,
                category: 'measurement',
                grade: grade, // Keep original user grade for consistency
                difficulty: selectedMeasurement.Lesson || 3, // Use Lesson as difficulty level
                question: questionText,
                answer: selectedMeasurement.CorrectAnswer,
                options: options,
                concepts: ['measurement', selectedMeasurement.Section?.toLowerCase() || 'general'],
                storyId: null,
                storyNode: null,
                storyText: null,
                storyImage: null
              };

              console.log(`Found measurement question ${transformedQuestion.id} from dedicated table`);
              return shuffleAnswerOptions(transformedQuestion);
            }
          }

          // If no measurement questions found, log and continue to regular flow
          console.log(`No measurement questions found in dedicated table for grade ${grade}`);
        } catch (error) {
          console.error('Error querying measurement questions:', error);
          // Continue to regular question flow on error
        }
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
          filters.push(not(inArray(questions.id, excludeIds)));
        }
      }

      // Apply all filters with AND
      const allQuestions = await query.where(and(...filters));

      console.log(`Found ${allQuestions.length} questions matching primary criteria`);

      // If we have questions that match the criteria, return a random one
      if (allQuestions.length > 0) {
        const selectedQuestion = allQuestions[Math.floor(Math.random() * allQuestions.length)];
        console.log(`Selected question ${selectedQuestion.id} for category ${category || 'all'}`);
        return shuffleAnswerOptions(selectedQuestion);
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

          // Make sure it has the right category but DON't modify the actual content
          // This preserves the integrity of the question itself
          if (selectedQuestion.category !== category) {
            console.log(`Warning: Selected question ${selectedQuestion.id} has category ${selectedQuestion.category} but requested ${category}`);
          }

          return shuffleAnswerOptions(selectedQuestion);
        }

        console.log(`No basic questions found for ${category}, will fall back to grade only`);
      }

      // If still no questions, fall back to grade only as last resort
      const fallbackQuestions = await db.select().from(questions).where(eq(questions.grade, grade));
      console.log(`Falling back to grade-only filter, found ${fallbackQuestions.length} questions`);

      if (fallbackQuestions.length > 0) {
        const selectedQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
        console.log(`Selected fallback question ${selectedQuestion.id}, original category: ${selectedQuestion.category}`);
        return shuffleAnswerOptions(selectedQuestion);
      }

      // Absolute last resort: return any question
      const anyQuestions = await db.select().from(questions).limit(10);
      console.log(`Last resort: found ${anyQuestions.length} questions with no filters`);

      if (anyQuestions.length > 0) {
        return shuffleAnswerOptions(anyQuestions[Math.floor(Math.random() * anyQuestions.length)]);
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
  async getUserSubjectMasteries(userId: number): Promise<any[]> {
    const user = await this.getUser(userId);
    if (!user?.hiddenGradeAsset) return [];

    const hiddenGradeAsset = user.hiddenGradeAsset as any;
    return hiddenGradeAsset.subject_mastery || [];
  }

  async getUserSubjectMasteriesByGrade(userId: number, grade: string): Promise<any[]> {
    const allMasteries = await this.getUserSubjectMasteries(userId);
    return allMasteries.filter((mastery: any) => mastery.grade === grade);
  }

  async getUserSubjectMastery(userId: number, subject: string, grade: string): Promise<any | undefined> {
    const allMasteries = await this.getUserSubjectMasteries(userId);
    return allMasteries.find((mastery: any) => 
      mastery.subject === subject && mastery.grade === grade
    );
  }

  async updateSubjectMastery(userId: number, subject: string, grade: string, isCorrect: boolean): Promise<any> {
    // Update subject mastery in user's JSON data
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const hiddenGradeAsset = (user.hiddenGradeAsset as any) || {};
    const subjectMasteries = hiddenGradeAsset.subject_mastery || [];

    // Find existing mastery entry
    const existingIndex = subjectMasteries.findIndex((m: any) => 
      m.userId === userId && m.subject === subject && m.grade === grade
    );

    if (existingIndex >= 0) {
      // Update existing mastery
      const existing = subjectMasteries[existingIndex];
      const totalAttempts = existing.totalAttempts + 1;
      const correctAttempts = existing.correctAttempts + (isCorrect ? 1 : 0);
      const masteryLevel = Math.round((correctAttempts / totalAttempts) * 100);

      subjectMasteries[existingIndex] = {
        ...existing,
        totalAttempts,
        correctAttempts,
        lastPracticed: new Date(),
        masteryLevel,
        nextGradeUnlocked: existing.nextGradeUnlocked || (masteryLevel >= 80 && totalAttempts >= 30),
        downgraded: masteryLevel < 50 && totalAttempts >= 10
      };
    } else {
      // Create new mastery entry
      subjectMasteries.push({
        id: Date.now(), // Simple ID generation
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
      });
    }

    // Update user's hiddenGradeAsset
    await this.updateUser(userId, {
      hiddenGradeAsset: {
        ...hiddenGradeAsset,
        subject_mastery: subjectMasteries
      }
    });

    return subjectMasteries[existingIndex >= 0 ? existingIndex : subjectMasteries.length - 1];
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
    // Get subject masteries from user's JSON data
    const user = await this.getUser(userId);
    if (!user?.hiddenGradeAsset) return [];

    const hiddenGradeAsset = user.hiddenGradeAsset as any;
    const subjectMasteries = hiddenGradeAsset.subject_mastery || [];
    const userMasteries = subjectMasteries.filter((mastery: any) => 
      mastery.grade === grade && mastery.isUnlocked
    );

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

  // ADAPTIVE DIFFICULTY METHODS

  /**
   * Track a student's answer to update their difficulty level
   * @param userId User ID
   * @param subject Subject name (e.g., "addition", "subtraction", etc.)
   * @param grade Current grade level
   * @param isCorrect Whether the answer was correct
   * @param questionId Optional ID of the question that was answered
   */
  async trackSubjectDifficulty(
    userId: number, 
    subject: string, 
    grade: string, 
    isCorrect: boolean, 
    questionId?: number
  ): Promise<void> {
    try {
      // 1. Record this attempt in the history table
      await db.insert(subjectDifficultyHistory).values({
        userId,
        subject,
        grade,
        isCorrect,
        difficultyLevel: 1, // Will be updated with actual difficulty level below
        questionId: questionId || null,
        timestamp: new Date()
      });

      // 2. Get or create subject mastery record
      let masterEntry = await this.getUserSubjectMastery(userId, subject, grade);

      if (!masterEntry) {
        // Create a new mastery entry
        masterEntry = await this.unlockGradeForSubject(userId, subject, grade);
      }

      // 3. Update the mastery record with new attempt information
      const totalAttempts = masterEntry.totalAttempts + 1;
      const correctAttempts = masterEntry.correctAttempts + (isCorrect ? 1 : 0);

      // Update recent attempt tracking for adaptive difficulty
      const recent30Attempts = Math.min(masterEntry.recent30Attempts + 1, 30);
      const recent30Correct = isCorrect 
        ? Math.min(masterEntry.recent30Correct + 1, 30) 
        : masterEntry.recent30Correct;

      const recent20Attempts = Math.min(masterEntry.recent20Attempts + 1, 20);
      const recent20Correct = isCorrect 
        ? Math.min(masterEntry.recent20Correct + 1, 20) 
        : masterEntry.recent20Correct;

      // 4. Calculate accuracy for adaptive difficulty thresholds
      const accuracy30 = recent30Attempts > 0 ? recent30Correct / recent30Attempts : 0;
      const accuracy20 = recent20Attempts > 0 ? recent20Correct / recent20Attempts : 0;

      // 5. Determine if difficulty should change
      const upgradeEligible = accuracy30 >= 0.8 && recent30Attempts >= 30;
      const downgradeEligible = accuracy20 <= 0.5 && recent20Attempts >= 20;

      // Get current difficulty level
      let difficultyLevel = masterEntry.difficultyLevel;

      // 6. Adjust difficulty level if thresholds are met
      if (upgradeEligible && difficultyLevel < 5) {
        difficultyLevel += 1;
        console.log(`Upgrading difficulty for userId=${userId}, subject=${subject} to level ${difficultyLevel} due to good performance (${Math.round(accuracy30 * 100)}% over ${recent30Attempts} attempts)`);

        // Reset counters after upgrade
        await db.update(subjectMastery)
          .set({
            difficultyLevel,
            upgradeEligible: false,
            downgradeEligible: false,
            recent30Attempts: 0,
            recent30Correct: 0,
            recent20Attempts: 0,
            recent20Correct: 0,
            totalAttempts,
            correctAttempts,
            lastPracticed: new Date()
          })
          .where(eq(subjectMastery.id, masterEntry.id));
      } 
      else if (downgradeEligible && difficultyLevel > 1) {
        difficultyLevel -= 1;
        console.log(`Downgrading difficulty for userId=${userId}, subject=${subject} to level ${difficultyLevel} due to struggles (${Math.round(accuracy20 * 100)}% over ${recent20Attempts} attempts)`);

        // Reset counters after downgrade
        await db.update(subjectMastery)
          .set({
            difficultyLevel,
            upgradeEligible: false,
            downgradeEligible: false,
            recent30Attempts: 0,
            recent30Correct: 0,
            recent20Attempts: 0,
            recent20Correct: 0,
            totalAttempts,
            correctAttempts,
            lastPracticed: new Date()
          })
          .where(eq(subjectMastery.id, masterEntry.id));
      }
      else {
        // Just update counters
        await db.update(subjectMastery)
          .set({
            upgradeEligible,
            downgradeEligible,
            recent30Attempts,
            recent30Correct,
            recent20Attempts,
            recent20Correct,
            totalAttempts,
            correctAttempts,
            lastPracticed: new Date()
          })
          .where(eq(subjectMastery.id, masterEntry.id));
      }

      // Update the difficulty level in the history record we just created
      await db.update(subjectDifficultyHistory)
        .set({ difficultyLevel })
        .where(and(
          eq(subjectDifficultyHistory.userId, userId),
          eq(subjectDifficultyHistory.subject, subject),
          eq(subjectDifficultyHistory.grade, grade),
          eq(subjectDifficultyHistory.timestamp, new Date())
        ));

    } catch (error) {
      console.error('Error tracking subject difficulty:', error);
    }
  }

  /**
   * Get the current difficulty level for a user in a particular subject and grade
   */
  async getSubjectDifficulty(userId: number, subject: string, grade: string): Promise<number> {
    const mastery = await this.getUserSubjectMastery(userId, subject, grade);

    // Default to difficulty level 1 if no mastery record exists
    if (!mastery) {
      return 1;
    }

    return mastery.difficultyLevel;
  }

  /**
   * Get questions with appropriate difficulty for a user
   */
  async getQuestionsWithAdaptiveDifficulty(userId: number, subject: string, grade: string): Promise<Question[]> {
    // Get user's current difficulty level for this subject
    const difficultyLevel = await this.getSubjectDifficulty(userId, subject, grade);

    // Map the 1-5 difficulty level to a range for the question difficulty field
    // Level 1: difficulty 1-2
    // Level 2: difficulty 2-3
    // Level 3: difficulty 3-4
    // Level 4: difficulty 4-5
    // Level 5: difficulty 5
    const minDifficulty = difficultyLevel;
    const maxDifficulty = Math.min(difficultyLevel + 1, 5);

    // Get questions matching both subject and difficulty range
    const matchingQuestions = await db.select()
      .from(questions)
      .where(and(
        eq(questions.grade, grade),
        eq(questions.category, subject),
        gte(questions.difficulty, minDifficulty),
        lte(questions.difficulty, maxDifficulty)
      ));

    // If no questions found in this difficulty range, fall back to all questions for this subject
    if (matchingQuestions.length === 0) {
      return this.getQuestionsByGrade(grade, subject);
    }

    return matchingQuestions;
  }

  // MODULE HISTORY TRACKING METHODS
  /**
   * Record a completed module run (test or token run)
   */
  async recordModuleHistory(data: {
    userId: number;
    moduleName: string;
    runType: 'test' | 'token_run';
    finalScore: number; // 0-100 integer
    questionsTotal: number;
    questionsCorrect: number;
    timeSpentSeconds: number;
    difficultyLevel?: number;
    gradeLevel?: string;
    tokensEarned: number;
  }): Promise<ModuleHistory> {
    const [moduleHistoryEntry] = await db
      .insert(moduleHistory)
      .values({
        userId: data.userId,
        moduleName: data.moduleName,
        runType: data.runType,
        finalScore: Math.round(Math.max(0, Math.min(100, data.finalScore))), // Ensure 0-100 range
        questionsTotal: data.questionsTotal,
        questionsCorrect: data.questionsCorrect,
        timeSpentSeconds: data.timeSpentSeconds,
        difficultyLevel: data.difficultyLevel || 1,
        gradeLevel: data.gradeLevel,
        tokensEarned: data.tokensEarned,
        completedAt: new Date()
      })
      .returning();

    console.log(`Recorded module history: User ${data.userId} completed ${data.moduleName} (${data.runType}) with score ${data.finalScore}`);
    return moduleHistoryEntry;
  }

  /**
   * Get module history for a specific user
   */
  async getUserModuleHistory(userId: number, limit: number = 50): Promise<ModuleHistory[]> {
    return await db
      .select()
      .from(moduleHistory)
      .where(eq(moduleHistory.userId, userId))
      .orderBy(desc(moduleHistory.completedAt))
      .limit(limit);
  }

  /**
   * Get module history for a specific user and module
   */
  async getUserModuleHistoryByModule(userId: number, moduleName: string, limit: number = 20): Promise<ModuleHistory[]> {
    return await db
      .select()
      .from(moduleHistory)
      .where(and(
        eq(moduleHistory.userId, userId),
        eq(moduleHistory.moduleName, moduleName)
      ))
      .orderBy(desc(moduleHistory.completedAt))
      .limit(limit);
  }

  /**
   * Get module history count for a specific user and module
   */
  async getModuleHistoryCount(userId: number, moduleName: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(moduleHistory)
      .where(and(
        eq(moduleHistory.userId, userId),
        eq(moduleHistory.moduleName, moduleName)
      ));

    return result[0]?.count || 0;
  }

  /**
   * Get module history for analytics and reporting
   */
  async getModuleHistoryAnalytics(userId?: number, days?: number): Promise<ModuleHistory[]> {
    let query = db.select().from(moduleHistory);

    const filters = [];

    if (userId) {
      filters.push(eq(moduleHistory.userId, userId));
    }

    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filters.push(gte(moduleHistory.completedAt, cutoffDate));
    }

    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    return await query
      .orderBy(desc(moduleHistory.completedAt))
      .limit(1000); // Reasonable limit for analytics
  }

  /**
   * Get user progress data for analytics - combines historical and current data
   */
  async getUserProgress(userId: number): Promise<any[]> {
    try {
      // Get historical data from module_history
      const moduleHistoryData = await this.getUserModuleHistory(userId, 50);
      
      // Get current progress from user's hiddenGradeAsset
      const user = await this.getUser(userId);
      const currentProgress = user?.hiddenGradeAsset || {};

      // Transform historical data into progress format
      const progressEntries = moduleHistoryData.map(session => ({
        id: session.id,
        userId: session.userId,
        score: session.finalScore,
        completedQuestions: session.questionsTotal,
        questionsAnswered: session.questionsTotal,
        correctAnswers: session.questionsCorrect,
        timeSpent: session.timeSpentSeconds,
        date: session.completedAt,
        updatedAt: session.completedAt,
        moduleName: session.moduleName,
        difficulty: session.difficultyLevel || 1,
        gradeLevel: session.gradeLevel || user?.grade || 'Unknown'
      }));

      // Add current module progress from hiddenGradeAsset if available
      if (currentProgress.modules) {
        for (const [moduleName, moduleData] of Object.entries(currentProgress.modules)) {
          if (typeof moduleData === 'object' && moduleData !== null) {
            const moduleInfo = moduleData as any;
            if (moduleInfo.progress) {
              progressEntries.push({
                id: `current-${moduleName}`,
                userId,
                score: moduleInfo.progress.currentScore || 0,
                completedQuestions: moduleInfo.progress.questionsAnswered || 0,
                questionsAnswered: moduleInfo.progress.questionsAnswered || 0,
                correctAnswers: moduleInfo.progress.correctAnswers || 0,
                timeSpent: moduleInfo.progress.timeSpent || 0,
                date: new Date(),
                updatedAt: new Date(),
                moduleName,
                difficulty: moduleInfo.progress.currentDifficulty || 1,
                gradeLevel: moduleInfo.progress.currentGrade || user?.grade || 'Unknown'
              });
            }
          }
        }
      }

      return progressEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting user progress:', error);
      return [];
    }
  }

  /**
   * Get user concept masteries from current progress data
   */
  async getUserConceptMasteries(userId: number): Promise<any[]> {
    try {
      const user = await this.getUser(userId);
      const currentProgress = user?.hiddenGradeAsset || {};
      const masteries: any[] = [];

      // Extract concept masteries from module progress
      if (currentProgress.modules) {
        for (const [moduleName, moduleData] of Object.entries(currentProgress.modules)) {
          if (typeof moduleData === 'object' && moduleData !== null) {
            const moduleInfo = moduleData as any;
            if (moduleInfo.progress && moduleInfo.progress.conceptMastery) {
              for (const [concept, masteryData] of Object.entries(moduleInfo.progress.conceptMastery)) {
                if (typeof masteryData === 'object' && masteryData !== null) {
                  const mastery = masteryData as any;
                  masteries.push({
                    id: `${moduleName}-${concept}`,
                    userId,
                    concept,
                    moduleName,
                    masteryLevel: mastery.level || 0,
                    attempts: mastery.attempts || 0,
                    successRate: mastery.successRate || 0,
                    lastAttempt: mastery.lastAttempt ? new Date(mastery.lastAttempt) : new Date(),
                    timeToMastery: mastery.timeToMastery || 0
                  });
                }
              }
            }
          }
        }
      }

      // If no specific concept masteries, create general ones based on module performance
      if (masteries.length === 0) {
        const moduleHistoryData = await this.getUserModuleHistory(userId, 20);
        const moduleGroups = moduleHistoryData.reduce((groups, session) => {
          if (!groups[session.moduleName]) groups[session.moduleName] = [];
          groups[session.moduleName].push(session);
          return groups;
        }, {} as Record<string, ModuleHistory[]>);

        for (const [moduleName, sessions] of Object.entries(moduleGroups)) {
          const avgScore = sessions.reduce((sum, s) => sum + s.finalScore, 0) / sessions.length;
          const totalQuestions = sessions.reduce((sum, s) => sum + s.questionsTotal, 0);
          const totalCorrect = sessions.reduce((sum, s) => sum + s.questionsCorrect, 0);
          const successRate = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

          masteries.push({
            id: `general-${moduleName}`,
            userId,
            concept: this.formatModuleName(moduleName),
            moduleName,
            masteryLevel: Math.min(100, avgScore),
            attempts: sessions.length,
            successRate: successRate * 100,
            lastAttempt: new Date(sessions[0].completedAt),
            timeToMastery: 0
          });
        }
      }

      return masteries;
    } catch (error) {
      console.error('Error getting user concept masteries:', error);
      return [];
    }
  }

  /**
   * Enhanced analytics method that combines historical and current data
   */
  async getEnhancedUserAnalytics(userId: number): Promise<any> {
    try {
      // Get comprehensive data for enhanced analytics
      const moduleHistoryData = await this.getUserModuleHistory(userId, 100);
      const progressData = await this.getUserProgress(userId);
      const conceptMasteries = await this.getUserConceptMasteries(userId);
      const user = await this.getUser(userId);

      // First check if user has ai_analytics in hiddenGradeAsset - this is our primary source
      const hiddenGradeAsset = user?.hiddenGradeAsset || {};
      const aiAnalytics = hiddenGradeAsset.ai_analytics;

      // If no ai_analytics exist, generate them first
      if (!aiAnalytics || !aiAnalytics.datetime_generated) {
        console.log(`No AI analytics found in hiddenGradeAsset for user ${userId}, generating...`);
        await this.generateUserAnalytics(userId);
        
        // Refresh user data to get the newly generated analytics
        const updatedUser = await this.getUser(userId);
        const updatedHiddenGradeAsset = updatedUser?.hiddenGradeAsset || {};
        const updatedAiAnalytics = updatedHiddenGradeAsset.ai_analytics;
        
        if (updatedAiAnalytics) {
          return this.buildEnhancedAnalyticsFromHiddenAsset(updatedUser, updatedAiAnalytics, moduleHistoryData, progressData, conceptMasteries);
        }
      } else {
        // Use existing ai_analytics from hiddenGradeAsset
        return this.buildEnhancedAnalyticsFromHiddenAsset(user, aiAnalytics, moduleHistoryData, progressData, conceptMasteries);
      }

      // Fallback: calculate from scratch if hiddenGradeAsset is unavailable
      const totalSessions = moduleHistoryData.length;
      const overallAccuracy = totalSessions > 0 
        ? (moduleHistoryData.reduce((sum, h) => sum + h.questionsCorrect, 0) / 
           moduleHistoryData.reduce((sum, h) => sum + h.questionsTotal, 0)) * 100
        : 0;

      const questionsPerSession = totalSessions > 0 
        ? moduleHistoryData.reduce((sum, h) => sum + h.questionsTotal, 0) / totalSessions
        : 0;

      // Module performance analysis
      const moduleGroups = moduleHistoryData.reduce((groups, session) => {
        if (!groups[session.moduleName]) groups[session.moduleName] = [];
        groups[session.moduleName].push(session);
        return groups;
      }, {} as Record<string, ModuleHistory[]>);

      const strengths: string[] = [];
      const weaknesses: string[] = [];

      for (const [moduleName, sessions] of Object.entries(moduleGroups)) {
        const avgAccuracy = sessions.reduce((sum, s) => sum + (s.questionsCorrect / Math.max(1, s.questionsTotal)), 0) / sessions.length;
        const avgScore = sessions.reduce((sum, s) => sum + s.finalScore, 0) / sessions.length;
        
        if (avgAccuracy > 0.8 && avgScore > 75) {
          strengths.push(this.formatModuleName(moduleName));
        } else if (avgAccuracy < 0.6 || avgScore < 50) {
          weaknesses.push(this.formatModuleName(moduleName));
        }
      }

      // Enhanced analytics object
      const enhancedAnalytics = {
        id: 0,
        userId,
        analysisDate: new Date(),
        learningPatterns: {
          correctAnswerRate: overallAccuracy / 100,
          averageTimePerQuestion: totalSessions > 0 
            ? moduleHistoryData.reduce((sum, h) => sum + h.timeSpentSeconds, 0) / 
              moduleHistoryData.reduce((sum, h) => sum + h.questionsTotal, 0)
            : 0,
          preferredCategories: Object.keys(moduleGroups).slice(0, 3),
          questionsPerSession,
          totalSessions,
          performanceTrend: this.calculatePerformanceTrend(moduleHistoryData)
        },
        strengths: strengths.slice(0, 5),
        areasForImprovement: weaknesses.slice(0, 5),
        engagementAnalysis: {
          totalSessionTime: moduleHistoryData.reduce((sum, h) => sum + h.timeSpentSeconds, 0),
          averageSessionTime: totalSessions > 0 
            ? moduleHistoryData.reduce((sum, h) => sum + h.timeSpentSeconds, 0) / totalSessions
            : 0,
          activityBreakdown: this.calculateActivityBreakdown(moduleGroups)
        },
        suggestedActivities: this.generateSuggestedActivities(strengths, weaknesses),
        learningStyle: user?.learningStyle || 'Visual',
        strengthConcepts: strengths,
        weaknessConcepts: weaknesses,
        recommendedActivities: this.generateRecommendedActivities(weaknesses),
        generatedAt: new Date(),
        // Enhanced metrics
        performanceMetrics: {
          overallPerformanceScore: totalSessions > 0 
            ? moduleHistoryData.reduce((sum, h) => sum + h.finalScore, 0) / totalSessions
            : 0,
          learningVelocity: questionsPerSession,
          consistencyIndex: this.calculateConsistencyIndex(moduleHistoryData),
          retentionRate: this.calculateRetentionRate(moduleHistoryData)
        },
        modulePerformance: Object.entries(moduleGroups).map(([moduleName, sessions]) => ({
          moduleName,
          averageScore: sessions.reduce((sum, s) => sum + s.finalScore, 0) / sessions.length,
          accuracy: sessions.reduce((sum, s) => sum + (s.questionsCorrect / Math.max(1, s.questionsTotal)), 0) / sessions.length * 100,
          sessionCount: sessions.length,
          lastSession: sessions[0].completedAt,
          trend: this.calculateModuleTrend(sessions)
        }))
      };

      return {
        analytics: enhancedAnalytics,
        conceptMasteries,
        recentProgress: progressData.slice(0, 10),
        moduleHistory: moduleHistoryData.slice(0, 20)
      };

    } catch (error) {
      console.error('Error getting enhanced user analytics:', error);
      return null;
    }
  }

  /**
   * Build enhanced analytics using ai_analytics data from user's hiddenGradeAsset
   */
  private buildEnhancedAnalyticsFromHiddenAsset(user: any, aiAnalytics: any, moduleHistoryData: any[], progressData: any[], conceptMasteries: any[]): any {
    // Use the ai_analytics data from hiddenGradeAsset as primary source
    const learningPatterns = aiAnalytics.learning_patterns || {};
    const engagementAnalysis = aiAnalytics.engagement_analysis || {};
    
    // Build enhanced analytics object that utilizes the populated ai_analytics data
    const enhancedAnalytics = {
      id: 0, // Generated analytics don't have a DB ID
      userId: user.id,
      analysisDate: aiAnalytics.analysis_date ? new Date(aiAnalytics.analysis_date) : new Date(),
      learningPatterns: {
        correctAnswerRate: learningPatterns.correctAnswerRate || 0,
        averageTimePerQuestion: learningPatterns.averageTimePerQuestion || 0,
        preferredCategories: learningPatterns.preferredCategories || [],
        questionsPerSession: learningPatterns.questionsPerSession || 0,
        totalSessions: learningPatterns.totalSessions || 0,
        performanceTrend: 'stable'
      },
      strengths: aiAnalytics.strengths || [],
      areasForImprovement: aiAnalytics.areas_for_improvement || aiAnalytics.weaknesses || [],
      engagementAnalysis: {
        totalSessionTime: engagementAnalysis.totalSessionTime || 0,
        averageSessionTime: engagementAnalysis.dailyEngagementMinutes || 0,
        activityBreakdown: engagementAnalysis.activityBreakdown || {}
      },
      suggestedActivities: aiAnalytics.suggested_activities || [],
      learningStyle: user.learningStyle || 'Visual',
      strengthConcepts: aiAnalytics.strengths || [],
      weaknessConcepts: aiAnalytics.weaknesses || aiAnalytics.areas_for_improvement || [],
      recommendedActivities: aiAnalytics.suggested_activities || [],
      generatedAt: aiAnalytics.datetime_generated ? new Date(aiAnalytics.datetime_generated) : new Date(),
      // Enhanced metrics using real data
      performanceMetrics: {
        overallPerformanceScore: moduleHistoryData.length > 0 
          ? moduleHistoryData.reduce((sum, h) => sum + h.finalScore, 0) / moduleHistoryData.length
          : 0,
        learningVelocity: learningPatterns.questionsPerSession || 0,
        consistencyIndex: this.calculateConsistencyIndex(moduleHistoryData),
        retentionRate: this.calculateRetentionRate(moduleHistoryData)
      },
      modulePerformance: this.buildModulePerformanceFromHistory(moduleHistoryData)
    };

    return {
      analytics: enhancedAnalytics,
      conceptMasteries,
      recentProgress: progressData.slice(0, 10),
      moduleHistory: moduleHistoryData.slice(0, 20)
    };
  }

  /**
   * Build module performance data from historical data
   */
  private buildModulePerformanceFromHistory(moduleHistoryData: any[]): any[] {
    const moduleGroups = moduleHistoryData.reduce((groups, session) => {
      if (!groups[session.moduleName]) groups[session.moduleName] = [];
      groups[session.moduleName].push(session);
      return groups;
    }, {} as Record<string, any[]>);

    return Object.entries(moduleGroups).map(([moduleName, sessions]) => ({
      moduleName,
      averageScore: sessions.reduce((sum: number, s: any) => sum + s.finalScore, 0) / sessions.length,
      accuracy: sessions.reduce((sum: number, s: any) => sum + (s.questionsCorrect / Math.max(1, s.questionsTotal)), 0) / sessions.length * 100,
      sessionCount: sessions.length,
      lastSession: sessions[0].completedAt,
      trend: this.calculateModuleTrend(sessions as any[])
    }));
  }

  // Helper methods for analytics calculations
  private formatModuleName(moduleName: string): string {
    return moduleName
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Math Facts', 'Math Facts:')
      .replace('_', ' ');
  }

  private calculatePerformanceTrend(sessions: ModuleHistory[]): string {
    if (sessions.length < 4) return 'stable';
    
    const recentSessions = sessions.slice(0, Math.floor(sessions.length / 2));
    const olderSessions = sessions.slice(Math.floor(sessions.length / 2));
    
    const recentAvg = recentSessions.reduce((sum, s) => sum + s.finalScore, 0) / recentSessions.length;
    const olderAvg = olderSessions.reduce((sum, s) => sum + s.finalScore, 0) / olderSessions.length;
    
    return recentAvg > olderAvg + 5 ? 'improving' : 
           recentAvg < olderAvg - 5 ? 'declining' : 'stable';
  }

  private calculateActivityBreakdown(moduleGroups: Record<string, ModuleHistory[]>): Record<string, number> {
    const breakdown: Record<string, number> = {};
    let totalTime = 0;
    
    for (const [moduleName, sessions] of Object.entries(moduleGroups)) {
      const moduleTime = sessions.reduce((sum, s) => sum + s.timeSpentSeconds, 0);
      breakdown[moduleName] = moduleTime;
      totalTime += moduleTime;
    }
    
    // Convert to percentages
    for (const moduleName in breakdown) {
      breakdown[moduleName] = totalTime > 0 ? (breakdown[moduleName] / totalTime) * 100 : 0;
    }
    
    return breakdown;
  }

  private generateSuggestedActivities(strengths: string[], weaknesses: string[]): string[] {
    const activities: string[] = [];
    
    weaknesses.forEach(weakness => {
      activities.push(`Practice ${weakness.toLowerCase()}`);
    });
    
    activities.push('flashcards', 'wordProblems', 'conceptMapping', 'realWorldApplications');
    
    return activities.slice(0, 6);
  }

  private generateRecommendedActivities(weaknesses: string[]): string[] {
    return weaknesses.map(w => `Review ${w.toLowerCase()} fundamentals`);
  }

  private calculateConsistencyIndex(sessions: ModuleHistory[]): number {
    if (sessions.length < 2) return 100;
    
    const scores = sessions.map(s => s.finalScore);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    return Math.max(0, 100 - standardDeviation);
  }

  private calculateRetentionRate(sessions: ModuleHistory[]): number {
    if (sessions.length < 2) return 100;
    
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    
    let retentionSum = 0;
    let comparisons = 0;
    
    for (let i = 1; i < sortedSessions.length; i++) {
      const current = sortedSessions[i];
      const previous = sortedSessions[i - 1];
      const daysBetween = (new Date(current.completedAt).getTime() - new Date(previous.completedAt).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysBetween > 1) {
        const retention = Math.min(100, (current.finalScore / Math.max(1, previous.finalScore)) * 100);
        retentionSum += retention;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? retentionSum / comparisons : 100;
  }

  private calculateModuleTrend(sessions: ModuleHistory[]): string {
    if (sessions.length < 3) return 'stable';
    
    const recentAvg = sessions.slice(0, Math.floor(sessions.length / 2))
      .reduce((sum, s) => sum + s.finalScore, 0) / Math.floor(sessions.length / 2);
    const olderAvg = sessions.slice(Math.floor(sessions.length / 2))
      .reduce((sum, s) => sum + s.finalScore, 0) / Math.ceil(sessions.length / 2);
    
    return recentAvg > olderAvg + 10 ? 'improving' : 
           recentAvg < olderAvg - 10 ? 'declining' : 'stable';
  }

  /**
   * Calculate concept masteries from module data with weighted scoring
   * Formula: accuracy (40%) + consistency (30%) + practice volume (20%) + mastery flag (10%)
   */
  async calculateConceptMasteries(userId: number, user: any): Promise<Record<string, any>> {
    const hiddenGradeAsset = user.hiddenGradeAsset || {};
    const modules = hiddenGradeAsset.modules || {};
    
    // Get all users for practice volume comparison
    const allUsers = await db.select().from(users);
    const totalQuestionsByUser = allUsers.map(u => {
      const userModules = (u.hiddenGradeAsset as any)?.modules || {};
      return Object.values(userModules).reduce((sum: number, mod: any) => 
        sum + (mod?.progress?.total_questions_answered || 0), 0);
    });
    const avgTotalQuestions = totalQuestionsByUser.length > 0 
      ? totalQuestionsByUser.reduce((a, b) => a + b, 0) / totalQuestionsByUser.length 
      : 1;

    // Extract and aggregate concept data
    const conceptData: Record<string, {
      modules: string[];
      totalQuestions: number;
      correctAnswers: number;
      scores: number[];
      masteryFlags: boolean[];
    }> = {};

    Object.entries(modules).forEach(([moduleName, moduleData]: [string, any]) => {
      const progress = moduleData?.progress || {};
      const concepts = progress.concepts || [];
      
      concepts.forEach((concept: string) => {
        if (!conceptData[concept]) {
          conceptData[concept] = {
            modules: [],
            totalQuestions: 0,
            correctAnswers: 0,
            scores: [],
            masteryFlags: []
          };
        }
        
        conceptData[concept].modules.push(moduleName);
        conceptData[concept].totalQuestions += progress.total_questions_answered || 0;
        conceptData[concept].correctAnswers += progress.correct_answers || 0;
        
        // Calculate module score for consistency tracking
        const moduleScore = progress.total_questions_answered > 0 
          ? (progress.correct_answers / progress.total_questions_answered) * 100
          : 0;
        conceptData[concept].scores.push(moduleScore);
        conceptData[concept].masteryFlags.push(progress.mastery_level || false);
      });
    });

    // Calculate weighted scores for each concept
    const conceptMasteries: Record<string, any> = {};
    
    Object.entries(conceptData).forEach(([concept, data]) => {
      // 1. Accuracy (40%)
      const accuracy = data.totalQuestions > 0 
        ? (data.correctAnswers / data.totalQuestions) * 100
        : 0;
      const accuracyScore = (accuracy / 100) * 40;
      
      // 2. Consistency (30%) - lower standard deviation = higher consistency
      const consistency = data.scores.length > 1 
        ? this.calculateConsistencyScore(data.scores) 
        : accuracy; // Use accuracy if only one score
      const consistencyScore = (consistency / 100) * 30;
      
      // 3. Practice Volume (20%) - relative to average user
      const practiceVolumeRatio = Math.min(data.totalQuestions / avgTotalQuestions, 2); // Cap at 200%
      const practiceVolumeScore = (practiceVolumeRatio / 2) * 20;
      
      // 4. Mastery Flag (10%) - if any module has mastery, award points
      const hasMastery = data.masteryFlags.some(flag => flag);
      const masteryFlagScore = hasMastery ? 10 : 0;
      
      // Calculate final weighted score
      const weightedScore = accuracyScore + consistencyScore + practiceVolumeScore + masteryFlagScore;
      
      conceptMasteries[concept] = {
        weightedScore: Math.round(weightedScore * 100) / 100,
        accuracy: Math.round(accuracy * 100) / 100,
        consistency: Math.round(consistency * 100) / 100,
        practiceVolume: data.totalQuestions,
        practiceVolumeRatio: Math.round(practiceVolumeRatio * 100) / 100,
        hasMastery,
        modules: data.modules,
        breakdown: {
          accuracyScore: Math.round(accuracyScore * 100) / 100,
          consistencyScore: Math.round(consistencyScore * 100) / 100,
          practiceVolumeScore: Math.round(practiceVolumeScore * 100) / 100,
          masteryFlagScore
        }
      };
    });

    return conceptMasteries;
  }

  /**
   * Calculate consistency score based on standard deviation of scores
   * Lower SD = higher consistency
   */
  private calculateConsistencyScore(scores: number[]): number {
    if (scores.length <= 1) return scores[0] || 0;
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert SD to consistency score (lower SD = higher consistency)
    // Normalize SD: assume max reasonable SD is 30 (very inconsistent)
    const normalizedSD = Math.min(standardDeviation / 30, 1);
    const consistencyScore = (1 - normalizedSD) * mean; // High consistency * performance level
    
    return Math.max(0, Math.min(100, consistencyScore));
  }

  // AI Tutor Session Methods
  async createTutorSession(data: InsertTutorSession): Promise<TutorSession> {
    const [session] = await db.insert(tutorSessions).values(data).returning();
    return session;
  }

  async getTutorSession(sessionId: number): Promise<TutorSession | undefined> {
    const [session] = await db.select().from(tutorSessions).where(eq(tutorSessions.id, sessionId));
    return session;
  }

  async updateTutorSession(sessionId: number, data: Partial<TutorSession>): Promise<TutorSession | undefined> {
    const [session] = await db.update(tutorSessions)
      .set(data)
      .where(eq(tutorSessions.id, sessionId))
      .returning();
    return session;
  }

  async endTutorSession(sessionId: number, ratings?: {
    helpfulness: number;
    clarity: number;
    difficulty: number;
    engagement: number;
    overallSatisfaction: number;
    feedback?: string;
  }): Promise<TutorSession | undefined> {
    const updateData: any = {
      sessionEnd: new Date(),
      completionStatus: 'completed'
    };

    if (ratings) {
      updateData.helpfulnessRating = ratings.helpfulness;
      updateData.clarityRating = ratings.clarity;
      updateData.difficultyRating = ratings.difficulty;
      updateData.engagementRating = ratings.engagement;
      updateData.sessionQualityRating = ratings.overallSatisfaction;
      updateData.sessionFeedback = ratings.feedback;

      // Calculate session weight based on ratings
      const averageRating = (
        ratings.helpfulness + 
        ratings.clarity + 
        ratings.difficulty + 
        ratings.engagement + 
        ratings.overallSatisfaction
      ) / 5;
      updateData.sessionWeight = Math.max(10, Math.round(averageRating * 10));
    }

    const [session] = await db.update(tutorSessions)
      .set(updateData)
      .where(eq(tutorSessions.id, sessionId))
      .returning();
    return session;
  }

  async getUserActiveTutorSession(userId: number): Promise<TutorSession | undefined> {
    const [session] = await db.select().from(tutorSessions)
      .where(and(
        eq(tutorSessions.userId, userId),
        eq(tutorSessions.completionStatus, 'in_progress')
      ))
      .orderBy(desc(tutorSessions.sessionStart))
      .limit(1);
    return session;
  }

  async getUserTutorSessions(userId: number, limit: number = 10): Promise<TutorSession[]> {
    const sessions = await db.select().from(tutorSessions)
      .where(eq(tutorSessions.userId, userId))
      .orderBy(desc(tutorSessions.sessionStart))
      .limit(limit);
    return sessions;
  }

  async addTutorChatMessage(data: InsertTutorChatMessage): Promise<TutorChatMessage> {
    const [message] = await db.insert(tutorChatMessages).values(data).returning();
    return message;
  }

  async getTutorChatMessages(sessionId: number): Promise<TutorChatMessage[]> {
    const messages = await db.select().from(tutorChatMessages)
      .where(eq(tutorChatMessages.sessionId, sessionId))
      .orderBy(asc(tutorChatMessages.timestamp));
    return messages;
  }
}
