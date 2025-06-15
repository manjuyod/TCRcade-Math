import { Router } from 'express';
import { RecommendationEngine } from './recommendation-engine';
import { AnalyticsIntegration } from './analytics-integration';
import { 
  RecommendationRequestSchema, 
  FeedbackDataSchema,
  RecommendationRequestType,
  FeedbackDataType 
} from '../shared/types';
import { storage } from '../../server/storage';
import { openaiRecommendationEngine } from './openai-recommendation-engine';

const router = Router();
const recommendationEngine = new RecommendationEngine();
const analyticsIntegration = new AnalyticsIntegration();

/**
 * GET /api/monolith/recommendations
 * Get personalized quiz recommendations for authenticated user
 */
router.get('/recommendations', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate and parse request parameters
    const requestData: RecommendationRequestType = {
      userId: req.user.id,
      sessionType: (req.query.sessionType as any) || 'practice',
      maxQuestions: req.query.maxQuestions ? parseInt(req.query.maxQuestions as string) : 10,
      targetDifficulty: req.query.targetDifficulty ? parseInt(req.query.targetDifficulty as string) : undefined,
      focusConcepts: req.query.focusConcepts ? (req.query.focusConcepts as string).split(',') : undefined,
      excludeQuestionIds: req.query.excludeQuestionIds ? 
        (req.query.excludeQuestionIds as string).split(',').map(id => parseInt(id)) : undefined
    };

    // Validate request
    const validationResult = RecommendationRequestSchema.safeParse(requestData);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request parameters',
        details: validationResult.error.errors 
      });
    }

    // Get user data and analytics
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const analytics = await storage.getEnhancedUserAnalytics(req.user.id);
    const moduleHistory = await storage.getUserModuleHistory(req.user.id, 50);
    
    // Transform to monolith format
    const userProfile = analyticsIntegration.transformUserToProfile(user, analytics, moduleHistory);

    // Get available questions based on user grade and preferences
    const availableQuestions = await getAvailableQuestions(user, requestData);

    // Build user learning profile for OpenAI analysis
    const openaiUserProfile = await buildUserLearningProfile(user, analytics, moduleHistory);
    
    // Format questions for OpenAI engine
    const formattedQuestions = availableQuestions.map(q => ({
      id: q.id,
      concept: q.concepts?.[0] || q.category,
      difficulty: q.difficulty,
      category: q.category,
      prerequisites: [], // Enhanced with actual prerequisites later
      averageTimeToComplete: 60, // Default estimate
      successRate: 0.7 // Default estimate
    }));

    // Generate recommendations using OpenAI hybrid approach
    const recommendations = await openaiRecommendationEngine.generateRecommendations(
      requestData,
      openaiUserProfile,
      formattedQuestions
    );

    // Log recommendation request for analytics
    await logRecommendationRequest(req.user.id, requestData, recommendations);

    res.json(recommendations);

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * POST /api/monolith/feedback
 * Submit performance feedback for recommendation system
 */
router.post('/feedback', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate feedback data
    const validationResult = FeedbackDataSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid feedback data',
        details: validationResult.error.errors 
      });
    }

    const feedbackData: FeedbackDataType = validationResult.data;

    // Get question details for concept extraction
    const question = await storage.getQuestion(feedbackData.questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Update analytics with feedback
    await analyticsIntegration.updateAnalyticsWithFeedback(
      req.user.id,
      feedbackData.questionId,
      feedbackData.correct,
      feedbackData.timeSpent,
      question.concepts || []
    );

    // Store feedback for recommendation improvement
    await storeFeedback(req.user.id, feedbackData, question);

    res.json({ success: true, message: 'Feedback recorded successfully' });

  } catch (error) {
    console.error('Error processing feedback:', error);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

/**
 * GET /api/monolith/analytics
 * Get recommendation system analytics and insights
 */
router.get('/analytics', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user data for analysis
    const user = await storage.getUser(req.user.id);
    const analytics = await storage.getEnhancedUserAnalytics(req.user.id);
    const moduleHistory = await storage.getUserModuleHistory(req.user.id, 100);
    
    // Transform to monolith format
    const userProfile = analyticsIntegration.transformUserToProfile(user, analytics, moduleHistory);
    
    // Generate learning insights
    const recentPerformance = userProfile.performanceHistory.slice(0, 20);
    const insights = analyticsIntegration.generateLearningInsights(userProfile, recentPerformance);

    // Get recommendation effectiveness metrics
    const effectivenessMetrics = await getRecommendationEffectiveness(req.user.id);

    const analyticsResponse = {
      userProfile: {
        id: userProfile.id,
        grade: userProfile.grade,
        learningStyle: userProfile.learningStyle,
        totalSessions: moduleHistory.length,
        overallAccuracy: recentPerformance.length > 0 ? 
          recentPerformance.filter(p => p.correct).length / recentPerformance.length : 0
      },
      conceptMastery: userProfile.conceptMastery.slice(0, 10), // Top 10 concepts
      learningInsights: insights,
      recommendationMetrics: effectivenessMetrics,
      performanceTrends: generatePerformanceTrends(recentPerformance)
    };

    res.json(analyticsResponse);

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/monolith/status
 * Get system status and health check
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      system: 'monolith_recommendation_engine',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      components: {
        recommendation_engine: 'operational',
        analytics_integration: 'operational',
        database_connection: 'operational'
      }
    };

    // Test database connectivity
    try {
      await storage.getUser(1); // Test query
    } catch (error) {
      status.components.database_connection = 'error';
      status.status = 'degraded';
    }

    res.json(status);

  } catch (error) {
    console.error('Error checking system status:', error);
    res.status(500).json({ 
      system: 'monolith_recommendation_engine',
      status: 'error',
      error: 'System health check failed'
    });
  }
});

/**
 * Build user learning profile for OpenAI analysis
 */
async function buildUserLearningProfile(user: any, analytics: any, moduleHistory: any[]): Promise<any> {
  // Extract recent performance from analytics
  const recentPerformance = moduleHistory.slice(-20).map(session => ({
    concept: session.moduleId,
    accuracy: session.score / 100, // Convert percentage to decimal
    timeSpent: session.timeSpent || 120, // Default 2 minutes if not available
    difficulty: session.difficulty || 2,
    timestamp: new Date(session.completedAt)
  }));

  // Build concept mastery from analytics
  const conceptMastery: Record<string, number> = {};
  if (analytics?.conceptMastery) {
    Object.entries(analytics.conceptMastery).forEach(([concept, data]: [string, any]) => {
      conceptMastery[concept] = data.masteryLevel || 0;
    });
  }

  // Determine learning velocity from recent sessions
  const learningVelocity = recentPerformance.length > 0 
    ? recentPerformance.reduce((sum, p) => sum + p.accuracy, 0) / recentPerformance.length
    : 0.5;

  // Identify strength and weakness concepts
  const strengthConcepts = Object.entries(conceptMastery)
    .filter(([_, mastery]) => mastery > 0.7)
    .map(([concept, _]) => concept);
  
  const weaknessConcepts = Object.entries(conceptMastery)
    .filter(([_, mastery]) => mastery < 0.4)
    .map(([concept, _]) => concept);

  // Build session history
  const sessionHistory = moduleHistory.slice(-10).map(session => ({
    sessionId: session.id.toString(),
    performance: session.score / 100,
    engagement: session.timeSpent > 60 ? 0.8 : 0.5, // Simple engagement metric
    concepts: [session.moduleId]
  }));

  return {
    userId: user.id,
    recentPerformance,
    conceptMastery,
    learningVelocity,
    preferredDifficulty: parseInt(user.grade) || 2,
    weaknessConcepts,
    strengthConcepts,
    sessionHistory
  };
}

/**
 * Helper functions
 */

async function getAvailableQuestions(user: any, request: RecommendationRequestType) {
  try {
    // Get questions appropriate for user's grade and difficulty level
    const userGrade = user.grade || 'K';
    const targetDifficulty = request.targetDifficulty || parseInt(userGrade) || 1;
    
    // Determine difficulty range (±1 from target)
    const minDifficulty = Math.max(1, targetDifficulty - 1);
    const maxDifficulty = Math.min(5, targetDifficulty + 1);
    
    // Get questions from database - use all questions for broader selection
    const allQuestions = await storage.getAllQuestions();
    
    const filteredQuestions = allQuestions.filter(question => {
      // Grade appropriateness
      const questionGrade = parseInt(question.grade) || 1;
      const userGradeNum = parseInt(userGrade) || 1;
      const gradeMatch = Math.abs(questionGrade - userGradeNum) <= 2;
      
      // Difficulty range
      const difficultyMatch = question.difficulty >= minDifficulty && 
                             question.difficulty <= maxDifficulty;
      
      // Exclude specific questions if requested
      const notExcluded = !request.excludeQuestionIds?.includes(question.id);
      
      // Focus concepts if specified
      const conceptMatch = !request.focusConcepts || 
        request.focusConcepts.some(concept => 
          question.concepts?.includes(concept)
        );
      
      return gradeMatch && difficultyMatch && notExcluded && conceptMatch;
    });

    // If not enough questions, broaden the search
    if (filteredQuestions.length < 20) {
      const broadenedQuestions = allQuestions.filter(question => {
        const questionGrade = parseInt(question.grade) || 1;
        const userGradeNum = parseInt(userGrade) || 1;
        const gradeMatch = Math.abs(questionGrade - userGradeNum) <= 3;
        const notExcluded = !request.excludeQuestionIds?.includes(question.id);
        
        return gradeMatch && notExcluded;
      });
      
      return broadenedQuestions;
    }
    
    return filteredQuestions;

  } catch (error) {
    console.error('Error fetching available questions:', error);
    // Return fallback questions
    return await storage.getQuestions();
  }
}

async function logRecommendationRequest(
  userId: number, 
  request: RecommendationRequestType, 
  response: any
) {
  try {
    const logData = {
      userId,
      requestType: request.sessionType,
      requestedQuestions: request.maxQuestions,
      providedRecommendations: response.recommendations.length,
      targetDifficulty: request.targetDifficulty,
      focusConcepts: request.focusConcepts,
      timestamp: new Date(),
      sessionId: response.sessionMetadata.sessionId
    };

    // This could be stored in a dedicated recommendations log table
    console.log('Recommendation request logged:', logData);
    
  } catch (error) {
    console.error('Error logging recommendation request:', error);
  }
}

async function storeFeedback(
  userId: number, 
  feedbackData: FeedbackDataType, 
  question: any
) {
  try {
    const feedback = {
      userId,
      sessionId: feedbackData.sessionId,
      questionId: feedbackData.questionId,
      correct: feedbackData.correct,
      timeSpent: feedbackData.timeSpent,
      difficultyRating: feedbackData.difficultyRating,
      engagementRating: feedbackData.engagementRating,
      questionCategory: question.category,
      questionDifficulty: question.difficulty,
      questionConcepts: question.concepts || [],
      timestamp: new Date()
    };

    // This could be stored in a dedicated feedback table
    console.log('Feedback stored:', feedback);
    
  } catch (error) {
    console.error('Error storing feedback:', error);
  }
}

async function getRecommendationEffectiveness(userId: number) {
  try {
    // This would analyze stored recommendation logs and feedback
    // For now, return basic metrics
    const moduleHistory = await storage.getUserModuleHistory(userId, 20);
    
    const totalSessions = moduleHistory.length;
    const avgAccuracy = totalSessions > 0 ? 
      moduleHistory.reduce((sum, session) => 
        sum + (session.questionsCorrect / session.questionsTotal), 0) / totalSessions : 0;
    
    return {
      totalRecommendationSessions: totalSessions,
      averageAccuracy: avgAccuracy,
      engagementScore: Math.min(1, avgAccuracy * 1.2), // Simplified calculation
      difficultyAlignment: 0.8, // Would be calculated from actual feedback
      conceptCoverage: 0.75 // Would be calculated from concept tracking
    };
    
  } catch (error) {
    console.error('Error calculating recommendation effectiveness:', error);
    return {
      totalRecommendationSessions: 0,
      averageAccuracy: 0,
      engagementScore: 0,
      difficultyAlignment: 0,
      conceptCoverage: 0
    };
  }
}

function generatePerformanceTrends(performanceRecords: any[]) {
  if (performanceRecords.length === 0) {
    return {
      accuracyTrend: 'stable',
      difficultyTrend: 'stable',
      speedTrend: 'stable',
      engagementTrend: 'stable'
    };
  }

  const recent = performanceRecords.slice(0, 10);
  const older = performanceRecords.slice(10, 20);

  const recentAccuracy = recent.filter(r => r.correct).length / recent.length;
  const olderAccuracy = older.length > 0 ? 
    older.filter(r => r.correct).length / older.length : recentAccuracy;

  const recentAvgDifficulty = recent.reduce((sum, r) => sum + r.difficulty, 0) / recent.length;
  const olderAvgDifficulty = older.length > 0 ?
    older.reduce((sum, r) => sum + r.difficulty, 0) / older.length : recentAvgDifficulty;

  const recentAvgTime = recent.reduce((sum, r) => sum + r.timeSpent, 0) / recent.length;
  const olderAvgTime = older.length > 0 ?
    older.reduce((sum, r) => sum + r.timeSpent, 0) / older.length : recentAvgTime;

  return {
    accuracyTrend: getDirectionTrend(recentAccuracy - olderAccuracy),
    difficultyTrend: getDirectionTrend(recentAvgDifficulty - olderAvgDifficulty),
    speedTrend: getDirectionTrend(olderAvgTime - recentAvgTime), // Lower time is better
    engagementTrend: 'stable' // Would need more sophisticated engagement metrics
  };
}

function getDirectionTrend(difference: number): 'improving' | 'declining' | 'stable' {
  if (difference > 0.1) return 'improving';
  if (difference < -0.1) return 'declining';
  return 'stable';
}

export { router as monolithRoutes };