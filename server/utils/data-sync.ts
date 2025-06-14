import { storage } from '../storage';
import { User } from '@shared/schema';

export async function syncUserProgressData(userId: number): Promise<void> {
  const user = await storage.getUser(userId);
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
  
  // Update both table fields AND JSON global_stats
  const updatedGlobalStats = {
    ...hiddenGradeAsset.global_stats,
    total_tokens_earned: totalTokens,
    total_questions_answered: totalQuestions,
    total_correct_answers: totalCorrect,
    last_sync: new Date().toISOString()
  };
  
  await storage.updateUser(userId, {
    tokens: totalTokens,
    questionsAnswered: totalQuestions,
    correctAnswers: totalCorrect,
    hiddenGradeAsset: {
      ...hiddenGradeAsset,
      global_stats: updatedGlobalStats
    }
  });
}

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

export function calculateModuleCompletion(moduleProgress: any): number {
  let completionPercentage = 0;
  
  if (moduleProgress.sessions_completed) {
    completionPercentage = Math.min(100, (moduleProgress.sessions_completed * 20)); // 5 sessions = 100%
  }
  
  if (moduleProgress.mastery_level) {
    completionPercentage = Math.max(completionPercentage, 80); // Mastery gives at least 80%
  }
  
  return Math.round(completionPercentage);
}

export function calculateModuleAccuracy(moduleProgress: any): number {
  const questions = moduleProgress.total_questions_answered || 0;
  const correct = moduleProgress.correct_answers || 0;
  
  return questions > 0 ? Math.round((correct / questions) * 100) : 0;
}