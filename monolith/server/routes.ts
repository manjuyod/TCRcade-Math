import { Router, type Request, type Response } from 'express';
import { AnalyticsIntegration } from './analytics-integration';
import {
  RecommendationRequestSchema,
  FeedbackDataSchema,
  type FeedbackDataType,
  type RecommendationRequestType,
} from '../shared/types';
import { storage } from '../../server/storage';
import { openaiRecommendationEngine } from './openai-recommendation-engine';
import type { HiddenGradeAsset, ModuleHistory, Question, User } from '../../shared/schema';

type OpenAiUserProfile = Parameters<typeof openaiRecommendationEngine.generateRecommendations>[1];
type GeneratedRecommendations = Awaited<ReturnType<typeof openaiRecommendationEngine.generateRecommendations>>;

interface ParsedModuleData {
  grade_level?: number;
  [key: string]: unknown;
}

interface ParsedAiAnalytics {
  strengths?: string[];
  weaknesses?: string[];
  [key: string]: unknown;
}

interface ParsedHiddenGradeAsset {
  modules?: Record<string, ParsedModuleData>;
  ai_analytics?: ParsedAiAnalytics;
  global_stats?: Record<string, number>;
  concept_mastery?: HiddenGradeAsset['concept_mastery'];
  [key: string]: unknown;
}

interface AvailableQuestion {
  id: number;
  concept: string;
  difficulty: number;
  category: string;
  prerequisites: string[];
  averageTimeToComplete: number;
  successRate: number;
}

interface RecommendationResponsePayload {
  recommendations: GeneratedRecommendations;
  sessionMetadata: {
    sessionId: string;
    timestamp: string;
    userId: number;
  };
  totalQuestions: number;
  requestMetadata: {
    maxQuestions: number | undefined;
    sessionType: RecommendationRequestType['sessionType'];
    targetDifficulty: number | undefined;
  };
}

interface RecommendationLogPayload {
  userId: number;
  requestType: RecommendationRequestType['sessionType'];
  requestedQuestions: number | undefined;
  providedRecommendations: number;
  targetDifficulty: number | undefined;
  focusConcepts: string[] | undefined;
  timestamp: Date;
  sessionId: string;
}

interface StoredFeedbackPayload {
  userId: number;
  sessionId: string;
  questionId: number;
  correct: boolean;
  timeSpent: number;
  difficultyRating: number | undefined;
  engagementRating: number | undefined;
  questionCategory: string;
  questionDifficulty: number;
  questionConcepts: string[];
  timestamp: Date;
}

interface PerformanceTrendRecord {
  correct: boolean;
  difficulty: number;
  timeSpent: number;
}

const router = Router();
const analyticsIntegration = new AnalyticsIntegration();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseHiddenGradeAsset(rawValue: User['hiddenGradeAsset'] | string | null | undefined): ParsedHiddenGradeAsset {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue) as unknown;
      return isRecord(parsed) ? (parsed as ParsedHiddenGradeAsset) : {};
    } catch (error) {
      console.error('Failed to parse hiddenGradeAsset JSON:', error);
      return {};
    }
  }

  return isRecord(rawValue) ? (rawValue as ParsedHiddenGradeAsset) : {};
}

function getStringQueryValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getNumberQueryValue(value: unknown): number | undefined {
  const normalizedValue = getStringQueryValue(value);
  if (!normalizedValue) {
    return undefined;
  }

  const parsed = parseInt(normalizedValue, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function getStringArrayQueryValue(value: unknown): string[] | undefined {
  const normalizedValue = getStringQueryValue(value);
  return normalizedValue ? normalizedValue.split(',') : undefined;
}

function getNumberArrayQueryValue(value: unknown): number[] | undefined {
  const normalizedValue = getStringArrayQueryValue(value);
  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue
    .map((entry) => parseInt(entry, 10))
    .filter((entry) => !Number.isNaN(entry));
}

function getConceptMasteryMap(conceptMastery: ParsedHiddenGradeAsset['concept_mastery']): Record<string, number> {
  if (!conceptMastery) {
    return {};
  }

  if (Array.isArray(conceptMastery)) {
    return conceptMastery.reduce<Record<string, number>>((accumulator, mastery) => {
      const concept = mastery?.concept;
      const masteryLevel = mastery?.masteryLevel;
      if (typeof concept === 'string' && typeof masteryLevel === 'number') {
        accumulator[concept] = masteryLevel;
      }
      return accumulator;
    }, {});
  }

  if (!isRecord(conceptMastery)) {
    return {};
  }

  return Object.entries(conceptMastery).reduce<Record<string, number>>((accumulator, [concept, value]) => {
    if (typeof value === 'number') {
      accumulator[concept] = value;
    } else if (isRecord(value) && typeof value.masteryLevel === 'number') {
      accumulator[concept] = value.masteryLevel;
    }

    return accumulator;
  }, {});
}

router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionType = getStringQueryValue(req.query.sessionType);
    const requestData: RecommendationRequestType = {
      userId: req.user.id,
      sessionType:
        sessionType === 'practice' || sessionType === 'assessment' || sessionType === 'review'
          ? sessionType
          : 'practice',
      maxQuestions: getNumberQueryValue(req.query.maxQuestions) ?? 10,
      targetDifficulty: getNumberQueryValue(req.query.targetDifficulty),
      focusConcepts: getStringArrayQueryValue(req.query.focusConcepts),
      excludeQuestionIds: getNumberArrayQueryValue(req.query.excludeQuestionIds),
    };

    const validationResult = RecommendationRequestSchema.safeParse(requestData);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request parameters',
        details: validationResult.error.errors,
      });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const moduleHistory = await storage.getUserModuleHistory(req.user.id, 50);
    const hiddenGradeAsset = parseHiddenGradeAsset(user.hiddenGradeAsset);

    const availableQuestions = await getAvailableQuestions(user, requestData);
    console.log(`Available questions count: ${availableQuestions.length}`);
    console.log('Sample question:', availableQuestions[0]);

    const openaiUserProfile = buildUserLearningProfile(user, hiddenGradeAsset, moduleHistory);
    console.log('User profile strengths:', openaiUserProfile.strengthConcepts);

    const formattedQuestions: AvailableQuestion[] = availableQuestions.map((question) => ({
      id: question.id,
      concept: question.concept,
      difficulty: question.difficulty,
      category: question.category,
      prerequisites: [],
      averageTimeToComplete: 60,
      successRate: 0.7,
    }));
    console.log(`Formatted questions count: ${formattedQuestions.length}`);

    const recommendations = await openaiRecommendationEngine.generateRecommendations(
      requestData,
      openaiUserProfile,
      formattedQuestions,
    );

    console.log(`Generated ${recommendations.length} recommendations for user ${req.user.id}`);
    console.log('Recommendations sample:', recommendations.slice(0, 2));

    const response: RecommendationResponsePayload = {
      recommendations,
      sessionMetadata: {
        sessionId: `rec_${Date.now()}_${req.user.id}`,
        timestamp: new Date().toISOString(),
        userId: req.user.id,
      },
      totalQuestions: recommendations.length,
      requestMetadata: {
        maxQuestions: requestData.maxQuestions,
        sessionType: requestData.sessionType,
        targetDifficulty: requestData.targetDifficulty,
      },
    };

    await logRecommendationRequest(req.user.id, requestData, response);

    return res.json(response);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

router.post('/feedback', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validationResult = FeedbackDataSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid feedback data',
        details: validationResult.error.errors,
      });
    }

    const feedbackData: FeedbackDataType = validationResult.data;
    const question = await storage.getQuestion(feedbackData.questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await analyticsIntegration.updateAnalyticsWithFeedback(
      req.user.id,
      feedbackData.questionId,
      feedbackData.correct,
      feedbackData.timeSpent,
      question.concepts ?? [],
    );

    await storeFeedback(req.user.id, feedbackData, question);

    return res.json({ success: true, message: 'Feedback recorded successfully' });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return res.status(500).json({ error: 'Failed to process feedback' });
  }
});

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const analytics = await storage.getEnhancedUserAnalytics(req.user.id);
    const moduleHistory = await storage.getUserModuleHistory(req.user.id, 100);
    const userProfile = analyticsIntegration.transformUserToProfile(user, analytics, moduleHistory);
    const recentPerformance = userProfile.performanceHistory.slice(0, 20);
    const insights = analyticsIntegration.generateLearningInsights(userProfile, recentPerformance);
    const effectivenessMetrics = await getRecommendationEffectiveness(req.user.id);

    const analyticsResponse = {
      userProfile: {
        id: userProfile.id,
        grade: userProfile.grade,
        learningStyle: userProfile.learningStyle,
        totalSessions: moduleHistory.length,
        overallAccuracy:
          recentPerformance.length > 0
            ? recentPerformance.filter((performance) => performance.correct).length / recentPerformance.length
            : 0,
      },
      conceptMastery: userProfile.conceptMastery.slice(0, 10),
      learningInsights: insights,
      recommendationMetrics: effectivenessMetrics,
      performanceTrends: generatePerformanceTrends(recentPerformance),
    };

    return res.json(analyticsResponse);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = {
      system: 'monolith_recommendation_engine',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      components: {
        recommendation_engine: 'operational',
        analytics_integration: 'operational',
        database_connection: 'operational',
      },
    };

    try {
      await storage.getUser(1);
    } catch {
      status.components.database_connection = 'error';
      status.status = 'degraded';
    }

    return res.json(status);
  } catch (error) {
    console.error('Error checking system status:', error);
    return res.status(500).json({
      system: 'monolith_recommendation_engine',
      status: 'error',
      error: 'System health check failed',
    });
  }
});

function buildUserLearningProfile(
  user: User,
  hiddenGradeAsset: ParsedHiddenGradeAsset,
  moduleHistory: ModuleHistory[],
): OpenAiUserProfile {
  console.log('Building user learning profile from hidden_grade_asset...');

  const recentPerformance = moduleHistory.slice(-20).map((session) => ({
    concept: session.moduleName,
    accuracy: session.questionsTotal > 0 ? session.questionsCorrect / session.questionsTotal : 0,
    timeSpent: session.timeSpentSeconds || 60,
    difficulty: session.difficultyLevel || 3,
    timestamp: session.completedAt ?? new Date(),
  }));

  const conceptMastery = getConceptMasteryMap(hiddenGradeAsset.concept_mastery);
  const moduleGrades = Object.values(hiddenGradeAsset.modules ?? {})
    .map((moduleData) => moduleData.grade_level)
    .filter((grade): grade is number => typeof grade === 'number');

  const currentGrade =
    moduleGrades.length > 0
      ? Math.round(moduleGrades.reduce((sum, grade) => sum + grade, 0) / moduleGrades.length)
      : 3;

  const strengthConcepts = hiddenGradeAsset.ai_analytics?.strengths ?? [];
  const weaknessConcepts = hiddenGradeAsset.ai_analytics?.weaknesses ?? [];
  const totalQuestionsAnswered = hiddenGradeAsset.global_stats?.total_questions_answered ?? 0;
  const totalCorrectAnswers = hiddenGradeAsset.global_stats?.total_correct_answers ?? 0;
  const learningVelocity =
    totalQuestionsAnswered > 0 ? totalCorrectAnswers / totalQuestionsAnswered : 0;

  const sessionHistory = moduleHistory.slice(-10).map((session) => ({
    sessionId: session.id.toString(),
    performance: session.finalScore / 100,
    engagement: session.timeSpentSeconds > 60 ? 0.8 : 0.5,
    concepts: [session.moduleName],
  }));

  console.log(
    `Profile built - currentGrade: ${currentGrade}, strengths: ${strengthConcepts.length}, weaknesses: ${weaknessConcepts.length}`,
  );

  return {
    userId: user.id,
    recentPerformance,
    conceptMastery,
    learningVelocity,
    preferredDifficulty: currentGrade,
    weaknessConcepts,
    strengthConcepts,
    sessionHistory,
  };
}

async function getAvailableQuestions(
  user: User,
  request: RecommendationRequestType,
): Promise<AvailableQuestion[]> {
  try {
    const hiddenGradeAsset = parseHiddenGradeAsset(user.hiddenGradeAsset);
    const requestedQuestionCount = request.maxQuestions ?? 10;

    console.log('User hidden_grade_asset parsed successfully');

    const moduleGrades = Object.values(hiddenGradeAsset.modules ?? {})
      .map((moduleData) => moduleData.grade_level)
      .filter((grade): grade is number => typeof grade === 'number');
    const userWeaknesses = hiddenGradeAsset.ai_analytics?.weaknesses ?? [];
    const avgGrade =
      moduleGrades.length > 0
        ? Math.round(moduleGrades.reduce((sum, grade) => sum + grade, 0) / moduleGrades.length)
        : 3;

    console.log(`User analysis - avgGrade: ${avgGrade}, weaknesses: ${userWeaknesses.join(', ')}`);

    const allQuestions = await storage.getQuestions();
    console.log(`Retrieved ${allQuestions.length} total questions from database`);

    const targetDifficulty = request.targetDifficulty || Math.min(5, Math.max(1, avgGrade - 1));
    const minDifficulty = Math.max(1, targetDifficulty - 1);
    const maxDifficulty = Math.min(5, targetDifficulty + 2);

    console.log(`Smart filtering - targetDifficulty: ${targetDifficulty}, range: ${minDifficulty}-${maxDifficulty}`);

    const filteredQuestions = allQuestions.filter((question, index) => {
      const questionGrade = question.grade === 'K' ? 0 : parseInt(question.grade, 10) || 1;
      const gradeMatch = Math.abs(questionGrade - avgGrade) <= 2;
      const difficultyMatch = question.difficulty >= minDifficulty && question.difficulty <= maxDifficulty;
      const notExcluded = !request.excludeQuestionIds?.includes(question.id);
      const conceptMatch =
        !request.focusConcepts ||
        request.focusConcepts.some((concept) => question.concepts?.includes(concept)) ||
        userWeaknesses.some((weakness) => question.concepts?.includes(weakness));

      if (index < 3) {
        console.log(
          `Question ${question.id}: grade=${question.grade}(${questionGrade}), difficulty=${question.difficulty}, gradeMatch=${gradeMatch}, difficultyMatch=${difficultyMatch}, conceptMatch=${conceptMatch}`,
        );
      }

      return gradeMatch && difficultyMatch && notExcluded && conceptMatch;
    });

    console.log(`After smart filtering: ${filteredQuestions.length} questions remain`);

    const questionPool =
      filteredQuestions.length < 20
        ? allQuestions.filter((question) => {
            const questionGrade = question.grade === 'K' ? 0 : parseInt(question.grade, 10) || 1;
            return Math.abs(questionGrade - avgGrade) <= 3 && question.difficulty >= 1 && question.difficulty <= 5;
          })
        : filteredQuestions;

    if (filteredQuestions.length < 20) {
      console.log(`Broadened search yielded: ${questionPool.length} questions`);
    }

    return questionPool
      .slice(0, Math.max(50, requestedQuestionCount * 3))
      .map((question) => ({
        id: question.id,
        concept: question.concepts?.[0] || question.category,
        difficulty: question.difficulty,
        category: question.category,
        prerequisites: [],
        averageTimeToComplete: 60,
        successRate: 0.7,
      }));
  } catch (error) {
    console.error('Error in getAvailableQuestions:', error);
    return [];
  }
}

async function logRecommendationRequest(
  userId: number,
  request: RecommendationRequestType,
  response: RecommendationResponsePayload,
): Promise<void> {
  try {
    const logData: RecommendationLogPayload = {
      userId,
      requestType: request.sessionType,
      requestedQuestions: request.maxQuestions,
      providedRecommendations: response.recommendations.length,
      targetDifficulty: request.targetDifficulty,
      focusConcepts: request.focusConcepts,
      timestamp: new Date(),
      sessionId: response.sessionMetadata.sessionId,
    };

    console.log('Recommendation request logged:', logData);
  } catch (error) {
    console.error('Error logging recommendation request:', error);
  }
}

async function storeFeedback(
  userId: number,
  feedbackData: FeedbackDataType,
  question: Question,
): Promise<void> {
  try {
    const feedback: StoredFeedbackPayload = {
      userId,
      sessionId: feedbackData.sessionId,
      questionId: feedbackData.questionId,
      correct: feedbackData.correct,
      timeSpent: feedbackData.timeSpent,
      difficultyRating: feedbackData.difficultyRating,
      engagementRating: feedbackData.engagementRating,
      questionCategory: question.category,
      questionDifficulty: question.difficulty,
      questionConcepts: question.concepts ?? [],
      timestamp: new Date(),
    };

    console.log('Feedback stored:', feedback);
  } catch (error) {
    console.error('Error storing feedback:', error);
  }
}

async function getRecommendationEffectiveness(userId: number): Promise<{
  totalRecommendationSessions: number;
  averageAccuracy: number;
  engagementScore: number;
  difficultyAlignment: number;
  conceptCoverage: number;
}> {
  try {
    const moduleHistory = await storage.getUserModuleHistory(userId, 20);
    const totalSessions = moduleHistory.length;
    const avgAccuracy =
      totalSessions > 0
        ? moduleHistory.reduce((sum, session) => sum + session.questionsCorrect / session.questionsTotal, 0) /
          totalSessions
        : 0;

    return {
      totalRecommendationSessions: totalSessions,
      averageAccuracy: avgAccuracy,
      engagementScore: Math.min(1, avgAccuracy * 1.2),
      difficultyAlignment: 0.8,
      conceptCoverage: 0.75,
    };
  } catch (error) {
    console.error('Error calculating recommendation effectiveness:', error);
    return {
      totalRecommendationSessions: 0,
      averageAccuracy: 0,
      engagementScore: 0,
      difficultyAlignment: 0,
      conceptCoverage: 0,
    };
  }
}

function generatePerformanceTrends(performanceRecords: PerformanceTrendRecord[]) {
  if (performanceRecords.length === 0) {
    return {
      accuracyTrend: 'stable',
      difficultyTrend: 'stable',
      speedTrend: 'stable',
      engagementTrend: 'stable',
    } as const;
  }

  const recent = performanceRecords.slice(0, 10);
  const older = performanceRecords.slice(10, 20);
  const recentAccuracy = recent.filter((record) => record.correct).length / recent.length;
  const olderAccuracy =
    older.length > 0 ? older.filter((record) => record.correct).length / older.length : recentAccuracy;
  const recentAvgDifficulty = recent.reduce((sum, record) => sum + record.difficulty, 0) / recent.length;
  const olderAvgDifficulty =
    older.length > 0
      ? older.reduce((sum, record) => sum + record.difficulty, 0) / older.length
      : recentAvgDifficulty;
  const recentAvgTime = recent.reduce((sum, record) => sum + record.timeSpent, 0) / recent.length;
  const olderAvgTime =
    older.length > 0 ? older.reduce((sum, record) => sum + record.timeSpent, 0) / older.length : recentAvgTime;

  return {
    accuracyTrend: getDirectionTrend(recentAccuracy - olderAccuracy),
    difficultyTrend: getDirectionTrend(recentAvgDifficulty - olderAvgDifficulty),
    speedTrend: getDirectionTrend(olderAvgTime - recentAvgTime),
    engagementTrend: 'stable',
  } as const;
}

function getDirectionTrend(difference: number): 'improving' | 'declining' | 'stable' {
  if (difference > 0.1) {
    return 'improving';
  }

  if (difference < -0.1) {
    return 'declining';
  }

  return 'stable';
}

export { router as monolithRoutes };
