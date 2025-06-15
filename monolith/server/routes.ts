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

    const moduleHistory = await storage.getUserModuleHistory(req.user.id, 50);
    
    // Parse hidden_grade_asset for comprehensive user data
    const hiddenGradeAsset = typeof user.hiddenGradeAsset === 'string' 
      ? JSON.parse(user.hiddenGradeAsset) 
      : user.hiddenGradeAsset;

    // Get available questions based on user's actual learning profile
    const availableQuestions = await getAvailableQuestions(user, requestData);
    console.log(`Available questions count: ${availableQuestions.length}`);
    console.log('Sample question:', availableQuestions[0]);

    // Build user learning profile for OpenAI analysis using hidden_grade_asset
    const openaiUserProfile = await buildUserLearningProfile(user, hiddenGradeAsset, moduleHistory);
    console.log('User profile grade:', openaiUserProfile.currentGrade);
    console.log('User profile strengths:', openaiUserProfile.strengths);
    
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
    console.log(`Formatted questions count: ${formattedQuestions.length}`);

    // Generate recommendations using OpenAI hybrid approach
    const recommendations = await openaiRecommendationEngine.generateRecommendations(
      requestData,
      openaiUserProfile,
      formattedQuestions
    );

    // Add debugging info
    console.log(`Generated ${recommendations.length} recommendations for user ${req.user.id}`);
    console.log('Recommendations sample:', recommendations.slice(0, 2));

    // Create proper response format expected by frontend
    const response = {
      recommendations,
      sessionMetadata: {
        sessionId: `rec_${Date.now()}_${req.user.id}`,
        timestamp: new Date().toISOString(),
        userId: req.user.id
      },
      totalQuestions: recommendations.length,
      requestMetadata: {
        maxQuestions: requestData.maxQuestions,
        sessionType: requestData.sessionType,
        targetDifficulty: requestData.targetDifficulty
      }
    };

    // Log recommendation request for analytics
    await logRecommendationRequest(req.user.id, requestData, response);

    res.json(response);

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
 * Build user learning profile for OpenAI analysis using hidden_grade_asset
 */
async function buildUserLearningProfile(user: any, hiddenGradeAsset: any, moduleHistory: any[]): Promise<any> {
  console.log('Building user learning profile from hidden_grade_asset...');
  
  // Extract performance data from module history
  const recentPerformance = moduleHistory.slice(-20).map(session => ({
    sessionId: session.id.toString(),
    accuracy: session.score / 100,
    timeToComplete: session.timeSpent || 60,
    concept: session.moduleId,
    difficulty: session.difficulty || 3
  }));

  // Extract concept mastery from hidden_grade_asset
  const conceptMastery = hiddenGradeAsset?.concept_mastery || {};
  
  // Calculate current grade from module grade levels
  const moduleGrades = [];
  if (hiddenGradeAsset?.modules) {
    Object.values(hiddenGradeAsset.modules).forEach((moduleData: any) => {
      if (moduleData?.grade_level) {
        moduleGrades.push(moduleData.grade_level);
      }
    });
  }
  
  const currentGrade = moduleGrades.length > 0 
    ? Math.round(moduleGrades.reduce((sum, grade) => sum + grade, 0) / moduleGrades.length)
    : 3;
  
  // Extract strengths and weaknesses from AI analytics
  const strengthConcepts = hiddenGradeAsset?.ai_analytics?.strengths || [];
  const weaknessConcepts = hiddenGradeAsset?.ai_analytics?.weaknesses || [];
  
  // Calculate learning velocity from global stats
  const globalStats = hiddenGradeAsset?.global_stats || {};
  const learningVelocity = globalStats.total_questions_answered > 0 
    ? globalStats.total_correct_answers / globalStats.total_questions_answered
    : 0;

  // Build session history from module history
  const sessionHistory = moduleHistory.slice(-10).map(session => ({
    sessionId: session.id.toString(),
    performance: session.score / 100,
    engagement: session.timeSpent > 60 ? 0.8 : 0.5,
    concepts: [session.moduleId]
  }));

  console.log(`Profile built - currentGrade: ${currentGrade}, strengths: ${strengthConcepts.length}, weaknesses: ${weaknessConcepts.length}`);

  return {
    userId: user.id,
    currentGrade,
    recentPerformance,
    conceptMastery,
    learningVelocity,
    preferredDifficulty: currentGrade,
    weaknessConcepts,
    strengthConcepts,
    sessionHistory,
    strengths: strengthConcepts,
    weaknesses: weaknessConcepts
  };
}

/**
 * Helper functions
 */

async function getAvailableQuestions(user: any, request: RecommendationRequestType) {
  try {
    // Parse user's hidden_grade_asset to get actual learning data
    const hiddenGradeAsset = typeof user.hiddenGradeAsset === 'string' 
      ? JSON.parse(user.hiddenGradeAsset) 
      : user.hiddenGradeAsset;
    
    console.log('User hidden_grade_asset parsed successfully');
    
    // Extract user's strengths and current grade levels from multiple modules
    const moduleGrades = [];
    const userStrengths = [];
    const userWeaknesses = [];
    
    if (hiddenGradeAsset?.modules) {
      Object.entries(hiddenGradeAsset.modules).forEach(([moduleId, moduleData]: [string, any]) => {
        if (moduleData?.grade_level) {
          moduleGrades.push(moduleData.grade_level);
        }
      });
    }
    
    if (hiddenGradeAsset?.ai_analytics?.strengths) {
      userStrengths.push(...hiddenGradeAsset.ai_analytics.strengths);
    }
    
    if (hiddenGradeAsset?.ai_analytics?.weaknesses) {
      userWeaknesses.push(...hiddenGradeAsset.ai_analytics.weaknesses);
    }
    
    // Calculate user's average grade level
    const avgGrade = moduleGrades.length > 0 
      ? Math.round(moduleGrades.reduce((sum, grade) => sum + grade, 0) / moduleGrades.length)
      : 3; // Default to grade 3
    
    console.log(`User analysis - avgGrade: ${avgGrade}, strengths: ${userStrengths.join(', ')}, weaknesses: ${userWeaknesses.join(', ')}`);
    
    // Query all question tables for comprehensive question pool
    const [baseQuestions, additionQuestions, multiplicationQuestions, measurementQuestions, algebraQuestions] = await Promise.all([
      storage.getQuestions(),
      storage.getQuestionsByCategory('addition'),
      storage.getQuestionsByCategory('multiplication'), 
      storage.getQuestionsByCategory('measurement'),
      storage.getQuestionsByCategory('algebra')
    ]);
    
    // Combine all questions with source tracking
    const allQuestions = [
      ...baseQuestions.map(q => ({ ...q, source: 'base' })),
      ...additionQuestions.map(q => ({ ...q, source: 'addition' })),
      ...multiplicationQuestions.map(q => ({ ...q, source: 'multiplication' })),
      ...measurementQuestions.map(q => ({ ...q, source: 'measurement' })),
      ...algebraQuestions.map(q => ({ ...q, source: 'algebra' }))
    ];
    
    console.log(`Combined question pool: ${allQuestions.length} total questions`);
    console.log('Question sources:', {
      base: baseQuestions.length,
      addition: additionQuestions.length,
      multiplication: multiplicationQuestions.length,
      measurement: measurementQuestions.length,
      algebra: algebraQuestions.length
    });
    
    // Smart filtering based on user's actual learning profile
    const targetDifficulty = request.targetDifficulty || Math.min(5, Math.max(1, avgGrade - 1));
    const minDifficulty = Math.max(1, targetDifficulty - 1);
    const maxDifficulty = Math.min(5, targetDifficulty + 2);
    
    console.log(`Smart filtering - targetDifficulty: ${targetDifficulty}, range: ${minDifficulty}-${maxDifficulty}`);
    
    const filteredQuestions = allQuestions.filter((question, index) => {
      // Grade appropriateness using user's actual learning levels
      const questionGrade = question.grade === 'K' ? 0 : parseInt(question.grade) || 1;
      const gradeMatch = Math.abs(questionGrade - avgGrade) <= 2;
      
      // Difficulty range
      const difficultyMatch = question.difficulty >= minDifficulty && 
                             question.difficulty <= maxDifficulty;
      
      // Exclude specific questions if requested
      const notExcluded = !request.excludeQuestionIds?.includes(question.id);
      
      // Prioritize user's focus areas or weaknesses
      const conceptMatch = !request.focusConcepts || 
        request.focusConcepts.some(concept => 
          question.concepts?.includes(concept)
        ) || 
        userWeaknesses.some(weakness => 
          question.concepts?.includes(weakness)
        );
      
      // Debug first few questions
      if (index < 3) {
        console.log(`Question ${question.id}: grade=${question.grade}(${questionGrade}), difficulty=${question.difficulty}, source=${question.source}, gradeMatch=${gradeMatch}, difficultyMatch=${difficultyMatch}, conceptMatch=${conceptMatch}`);
      }
      
      return gradeMatch && difficultyMatch && notExcluded && conceptMatch;
    });
    
    console.log(`After smart filtering: ${filteredQuestions.length} questions remain`);

    // If still not enough questions, broaden the search progressively
    if (filteredQuestions.length < 20) {
      console.log('Broadening search criteria...');
      const broadenedQuestions = allQuestions.filter(question => {
        const questionGrade = question.grade === 'K' ? 0 : parseInt(question.grade) || 1;
        return Math.abs(questionGrade - avgGrade) <= 3 && 
               question.difficulty >= 1 && question.difficulty <= 5;
      });
      
      console.log(`Broadened search yielded: ${broadenedQuestions.length} questions`);
      return broadenedQuestions.slice(0, Math.max(50, request.maxQuestions * 3));
    }

    return filteredQuestions.slice(0, Math.max(50, request.maxQuestions * 3));
    
  } catch (error) {
    console.error('Error in getAvailableQuestions:', error);
    return [];
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
      providedRecommendations: response.recommendations?.length || 0,
      targetDifficulty: request.targetDifficulty,
      focusConcepts: request.focusConcepts,
      timestamp: new Date(),
      sessionId: response.sessionMetadata?.sessionId || 'unknown'
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