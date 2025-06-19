import { storage } from '../storage';
import { User } from '@shared/schema';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function syncUserProgressData(userId: number): Promise<void> {
  const user: User | undefined = await storage.getUser(userId);
  if (!user) throw new Error('User not found');

  const hiddenGradeAsset = (user.hiddenGradeAsset as any) || {};
  const modules = hiddenGradeAsset.modules || {};
  
  // Calculate totals from modules
  let totalTokens = 0;
  let totalQuestions = 0;
  let totalCorrect = 0;
  
  Object.values(modules).forEach((moduleData: any) => {
    const progress = moduleData.progress || {};
    totalTokens += progress.tokens_earned || 0;
    totalQuestions += progress.total_questions_answered || 0;
    totalCorrect += progress.correct_answers || 0;
  });

  // Computing how many New tokens to add
  const oldTokens = user.tokens || 0;
  const tokenDelta = totalTokens - oldTokens; // This should fix the token issue

  
  // Update both table fields AND JSON global_stats
  const updatedGlobalStats = {
    ...hiddenGradeAsset.global_stats,
    total_tokens_earned: totalTokens,
    total_questions_answered: totalQuestions,
    total_correct_answers: totalCorrect,
    last_sync: new Date().toISOString()
  };

  
    // 6. Build the update payload—only include tokens if there’s a positive delta
    const updateData: {
      tokens?: { increment: number };
      questionsAnswered: number;
      correctAnswers: number;
      hiddenGradeAsset: any;
    } = {
      questionsAnswered: totalQuestions,
      correctAnswers:    totalCorrect,
      hiddenGradeAsset: {
        ...hiddenGradeAsset,
        global_stats: updatedGlobalStats,
      },
    };
    if (tokenDelta > 0) {
      updateData.tokens = { increment: tokenDelta };
    }

    // 7. Persist to the DB
    await storage.updateUser(userId, updateData);
  
  } // END of syncUserProgressData function

export async function syncAllUsers(): Promise<number> {
  const users = await storage.getAllUsers();
  let syncedCount = 0;
  
  for (const user of users) {
    try {
      await syncUserProgressData(user.id);
      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync user ${user.id}:`, error);
    }
  }
  
  return syncedCount;
}

export async function calculateTokenPercentile(userTokens: number): Promise<number> {
  const users = await storage.getAllUsers();
  if (users.length === 0) return 50;
  
  const allTokens = users.map(u => u.tokens || 0).sort((a, b) => a - b);
  const rank = allTokens.filter(tokens => tokens < userTokens).length;
  return (rank / allTokens.length) * 100;
}

export async function calculateAccuracyPercentile(userAccuracy: number): Promise<number> {
  const users = await storage.getAllUsers();
  if (users.length === 0) return 50;
  
  const allAccuracies = users.map(u => {
    const questions = u.questionsAnswered || 0;
    const correct = u.correctAnswers || 0;
    return questions > 0 ? (correct / questions) * 100 : 0;
  }).sort((a, b) => a - b);
  
  const rank = allAccuracies.filter(accuracy => accuracy < userAccuracy).length;
  return (rank / allAccuracies.length) * 100;
}

export function getCategoryLabel(moduleKey: string): string {
  const categoryLabels: { [key: string]: string } = {
    'addition': 'Addition',
    'subtraction': 'Subtraction', 
    'multiplication': 'Multiplication',
    'division': 'Division',
    'fractions': 'Fractions',
    'decimals': 'Decimals',
    'geometry': 'Geometry',
    'measurement': 'Measurement',
    'algebra': 'Pre-Algebra',
    'ratios': 'Ratios & Proportions',
    'statistics': 'Statistics & Data',
    'puzzle': 'Math Puzzles',
    'math_rush': 'Math Rush',
    'word_race': 'Word Race',
    'decimal_defender': 'Decimal Defender',
    'fractions_puzzle': 'Fractions Puzzle',
    'addition_facts': 'Addition Facts',
    'subtraction_facts': 'Subtraction Facts',
    'multiplication_facts': 'Multiplication Facts',
    'division_facts': 'Division Facts',
    'ratios_proportions': 'Ratios & Proportions'
  };
  
  return categoryLabels[moduleKey] || moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1);
}

// Cache for lesson progression data to improve performance
const lessonProgressionCache = new Map<string, any[]>();

async function getLessonProgression(tableName: string): Promise<any[]> {
  if (lessonProgressionCache.has(tableName)) {
    return lessonProgressionCache.get(tableName)!;
  }
  
  try {
    const result = await db.execute(sql`
      SELECT DISTINCT "GradeLevel", "Lesson"
      FROM ${sql.identifier(tableName)}
      ORDER BY "GradeLevel" ASC, "Lesson" ASC
    `);
    
    const progression = result.rows;
    lessonProgressionCache.set(tableName, progression);
    return progression;
  } catch (error) {
    console.warn(`Failed to get lesson progression for ${tableName}:`, error);
    return [];
  }
}

async function calculateLessonBasedCompletion(tableName: string, moduleProgress: any): Promise<number> {
  try {
    const progression = await getLessonProgression(tableName);
    if (progression.length === 0) {
      return calculateSessionBasedCompletion(moduleProgress); // Fallback to session-based
    }
    
    const userGradeLevel = moduleProgress.grade_level || 0;
    const userLesson = moduleProgress.lesson || 0;
    
    if (userGradeLevel === 0 || userLesson === 0) {
      return 0; // User hasn't started
    }
    
    // Find user's current position in the progression
    let userPosition = 0;
    let foundPosition = false;
    
    for (let i = 0; i < progression.length; i++) {
      const item = progression[i];
      const itemGradeLevel = parseInt(item.GradeLevel);
      const itemLesson = parseInt(item.Lesson);
      
      if (itemGradeLevel < userGradeLevel || 
          (itemGradeLevel === userGradeLevel && itemLesson <= userLesson)) {
        userPosition = i + 1;
        foundPosition = true;
      }
    }
    
    // If user hasn't reached any lesson yet, check if they're at the beginning
    if (!foundPosition && userGradeLevel > 0 && userLesson > 0) {
      // User is potentially beyond the available progression or at the start
      const firstItem = progression[0];
      const firstGradeLevel = parseInt(firstItem.GradeLevel);
      const firstLesson = parseInt(firstItem.Lesson);
      
      if (userGradeLevel < firstGradeLevel || 
          (userGradeLevel === firstGradeLevel && userLesson < firstLesson)) {
        return 5; // Give 5% for being in progress but before first tracked lesson
      }
      
      // User is beyond all tracked lessons
      userPosition = progression.length;
    }
    
    const completionPercentage = Math.min(100, (userPosition / progression.length) * 100);
    return Math.round(completionPercentage);
  } catch (error) {
    console.warn(`Error calculating lesson-based completion for ${tableName}:`, error);
    return calculateSessionBasedCompletion(moduleProgress); // Fallback
  }
}

function calculateGradeLevelCompletion(moduleProgress: any): number {
  const userGradeLevel = moduleProgress.grade_level || 0;
  const maxGradeLevel = 12; // Maximum grade level representing 100% completion
  
  if (userGradeLevel <= 0) {
    return 0;
  }
  
  const completionPercentage = (userGradeLevel / maxGradeLevel) * 100;
  return Math.round(Math.min(100, completionPercentage));
}

function calculateSessionBasedCompletion(moduleProgress: any): number {
  let completionPercentage = 0;
  
  if (moduleProgress.sessions_completed) {
    completionPercentage = Math.min(100, (moduleProgress.sessions_completed * 20)); // 5 sessions = 100%
  }
  
  if (moduleProgress.mastery_level) {
    completionPercentage = Math.max(completionPercentage, 80); // Mastery gives at least 80%
  }
  
  return Math.round(completionPercentage);
}

export async function calculateModuleCompletion(moduleKey: string, moduleProgress: any): Promise<number> {
  switch (moduleKey) {
    case 'measurement':
      return await calculateLessonBasedCompletion('questions_measurementAndData', moduleProgress);
    
    case 'algebra':
      return await calculateLessonBasedCompletion('questions_algebra', moduleProgress);
    
    case 'addition_facts':
    case 'subtraction_facts':
    case 'multiplication_facts':
    case 'division_facts':
      return calculateGradeLevelCompletion(moduleProgress);
    
    case 'ratios_proportions':
    case 'fractions_puzzle':
    case 'decimal_defender':
    case 'math_rush':
    case 'word_race':
    default:
      return calculateSessionBasedCompletion(moduleProgress); // Keep existing logic
  }
}

export function calculateModuleAccuracy(moduleProgress: any): number {
  const questions = moduleProgress.total_questions_answered || 0;
  const correct = moduleProgress.correct_answers || 0;
  
  return questions > 0 ? Math.round((correct / questions) * 100) : 0;
}