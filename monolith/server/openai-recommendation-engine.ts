import OpenAI from 'openai';
import { storage } from '../../server/storage';
import { QuestionRecommendation, RecommendationRequest } from '../shared/types';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface UserLearningProfile {
  userId: number;
  recentPerformance: Array<{
    concept: string;
    accuracy: number;
    timeSpent: number;
    difficulty: number;
    timestamp: Date;
  }>;
  conceptMastery: Record<string, number>;
  learningVelocity: number;
  preferredDifficulty: number;
  weaknessConcepts: string[];
  strengthConcepts: string[];
  sessionHistory: Array<{
    sessionId: string;
    performance: number;
    engagement: number;
    concepts: string[];
  }>;
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

/**
 * OpenAI-powered recommendation engine that mimics TensorFlow monolith architecture
 * but uses intelligent reasoning instead of neural networks
 */
export class OpenAIRecommendationEngine {
  
  /**
   * Generate personalized recommendations using OpenAI reasoning
   * Replaces the TensorFlow "model forward pass" with intelligent analysis
   */
  async generateRecommendations(
    request: RecommendationRequest,
    userProfile: UserLearningProfile,
    availableQuestions: AvailableQuestion[]
  ): Promise<QuestionRecommendation[]> {
    
    console.log('Starting OpenAI recommendation generation...');
    console.log(`Available questions: ${availableQuestions.length}`);
    console.log(`User grade: ${userProfile.currentGrade}`);
    console.log(`Request max questions: ${request.maxQuestions}`);
    
    // If no questions available, return empty array
    if (availableQuestions.length === 0) {
      console.log('No questions available - returning empty recommendations');
      return [];
    }
    
    try {
      // Prepare the educational context for OpenAI analysis
      const educationalContext = this.buildEducationalContext(userProfile, availableQuestions, request);
      console.log('Educational context built successfully');
      
      // Use OpenAI to analyze and recommend questions
      const recommendations = await this.getIntelligentRecommendations(educationalContext);
      console.log(`OpenAI returned ${recommendations?.length || 0} raw recommendations`);
      
      // Validate and format recommendations
      const formattedRecommendations = this.validateAndFormatRecommendations(recommendations, availableQuestions);
      console.log(`Formatted recommendations: ${formattedRecommendations.length}`);
      
      // If OpenAI didn't provide enough recommendations, use fallback
      if (formattedRecommendations.length === 0) {
        console.log('OpenAI provided no valid recommendations, using fallback');
        return this.fallbackAlgorithmicRecommendations(userProfile, availableQuestions, request);
      }
      
      return formattedRecommendations;
      
    } catch (error) {
      console.error('OpenAI recommendation generation failed:', error);
      // Fallback to algorithmic approach
      return this.fallbackAlgorithmicRecommendations(userProfile, availableQuestions, request);
    }
  }

  /**
   * Build comprehensive educational context for OpenAI analysis
   * This replaces the "feature engineering" stage in traditional ML pipelines
   */
  private buildEducationalContext(
    userProfile: UserLearningProfile,
    questions: AvailableQuestion[],
    request: RecommendationRequest
  ): string {
    const context = {
      learnerProfile: {
        userId: userProfile.userId,
        overallProgress: this.calculateOverallProgress(userProfile),
        recentAccuracy: this.calculateRecentAccuracy(userProfile),
        learningVelocity: userProfile.learningVelocity,
        masteredConcepts: userProfile.strengthConcepts,
        strugglingConcepts: userProfile.weaknessConcepts,
        preferredDifficulty: userProfile.preferredDifficulty,
        engagementTrend: this.calculateEngagementTrend(userProfile)
      },
      sessionContext: {
        maxQuestions: request.maxQuestions,
        sessionType: request.sessionType,
        targetDifficulty: request.targetDifficulty,
        excludeQuestionIds: request.excludeQuestionIds || []
      },
      availableContent: {
        totalQuestions: questions.length,
        conceptCoverage: this.analyzeConceptCoverage(questions),
        difficultyDistribution: this.analyzeDifficultyDistribution(questions),
        prereqMap: this.buildPrerequisiteMap(questions)
      },
      educationalObjectives: {
        primaryGoal: this.determinePrimaryGoal(userProfile, request),
        secondaryGoals: this.determineSecondaryGoals(userProfile),
        learningStrategy: this.recommendLearningStrategy(userProfile)
      }
    };

    return JSON.stringify(context, null, 2);
  }

  /**
   * Use OpenAI for intelligent recommendation analysis
   * This is the core "reasoning engine" that replaces neural network inference
   */
  private async getIntelligentRecommendations(educationalContext: string): Promise<any> {
    const systemPrompt = `You are an expert educational AI that specializes in personalized math learning. Your task is to analyze a student's learning profile and recommend the optimal sequence of math questions.

EDUCATIONAL PRINCIPLES:
- Use spaced repetition for long-term retention
- Apply zone of proximal development (challenge but not frustrate)
- Consider cognitive load theory (manage complexity)
- Implement mastery-based progression
- Account for individual learning differences

RECOMMENDATION TYPES:
- "review": Reinforce recently learned concepts
- "advance": Introduce new concepts when ready
- "reinforce": Strengthen weak areas
- "challenge": Stretch capable learners
- "remediate": Address fundamental gaps

RESPONSE FORMAT: Return a JSON object with recommendations array:
{
  "recommendations": [
    {
      "questionId": number,
      "score": number (0-1, confidence in recommendation),
      "reasoning": "Clear educational rationale",
      "recommendationType": "review|advance|reinforce|challenge|remediate",
      "priority": "high|medium|low",
      "estimatedSuccessProbability": number (0-1),
      "expectedLearningGain": number (0-1),
      "cognitiveLoadRating": number (1-5)
    }
  ]
}

Analyze the educational context and provide thoughtful, evidence-based recommendations.`;

    const userPrompt = `Please analyze this student's learning profile and recommend the optimal questions for their next learning session:

${educationalContext}

Consider their strengths, weaknesses, learning velocity, and engagement patterns. Provide recommendations that will maximize learning effectiveness while maintaining appropriate challenge and engagement levels.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using the latest model for best reasoning
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent educational recommendations
      max_tokens: 2000
    });

    const responseContent = response.choices[0].message.content || '{"recommendations": []}';
    const parsedResponse = JSON.parse(responseContent);
    return parsedResponse.recommendations || [];
  }

  /**
   * Validate and format OpenAI recommendations
   */
  private validateAndFormatRecommendations(
    aiRecommendations: any,
    availableQuestions: AvailableQuestion[]
  ): QuestionRecommendation[] {
    const questionMap = new Map(availableQuestions.map(q => [q.id, q]));
    const recommendations: QuestionRecommendation[] = [];

    for (const rec of aiRecommendations) {
      const question = questionMap.get(rec.questionId);
      if (!question) continue;

      recommendations.push({
        questionId: rec.questionId,
        score: Math.max(0, Math.min(1, rec.score || 0.5)),
        reasoning: rec.reasoning || 'AI-generated recommendation',
        category: question.category,
        difficulty: question.difficulty,
        concepts: [question.concept],
        recommendationType: 'mastery' as any,
        priority: 'medium' as any
      });
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Fallback algorithmic recommendations if OpenAI fails
   */
  private fallbackAlgorithmicRecommendations(
    userProfile: UserLearningProfile,
    questions: AvailableQuestion[],
    request: RecommendationRequest
  ): QuestionRecommendation[] {
    console.log('Using fallback algorithmic recommendations');
    
    return questions
      .slice(0, request.maxQuestions)
      .map(q => ({
        questionId: q.id,
        score: 0.5, // Default score
        reasoning: 'Fallback algorithmic recommendation',
        category: q.category,
        difficulty: q.difficulty,
        concepts: [q.concept],
        recommendationType: 'mastery' as any,
        priority: 'medium' as any
      }));
  }

  // Helper methods for educational analysis
  private calculateOverallProgress(profile: UserLearningProfile): number {
    if (profile.recentPerformance.length === 0) return 0;
    return profile.recentPerformance.reduce((sum, p) => sum + p.accuracy, 0) / profile.recentPerformance.length;
  }

  private calculateRecentAccuracy(profile: UserLearningProfile): number {
    const recentSession = profile.recentPerformance.slice(-10);
    if (recentSession.length === 0) return 0;
    return recentSession.reduce((sum, p) => sum + p.accuracy, 0) / recentSession.length;
  }

  private calculateEngagementTrend(profile: UserLearningProfile): string {
    if (profile.sessionHistory.length < 2) return 'stable';
    
    const recent = profile.sessionHistory.slice(-3);
    const avgRecent = recent.reduce((sum, s) => sum + s.engagement, 0) / recent.length;
    const avgEarlier = profile.sessionHistory.slice(-6, -3).reduce((sum, s) => sum + s.engagement, 0) / 3;
    
    if (avgRecent > avgEarlier + 0.1) return 'improving';
    if (avgRecent < avgEarlier - 0.1) return 'declining';
    return 'stable';
  }

  private analyzeConceptCoverage(questions: AvailableQuestion[]): Record<string, number> {
    const coverage: Record<string, number> = {};
    questions.forEach(q => {
      coverage[q.concept] = (coverage[q.concept] || 0) + 1;
    });
    return coverage;
  }

  private analyzeDifficultyDistribution(questions: AvailableQuestion[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    questions.forEach(q => {
      distribution[q.difficulty] = (distribution[q.difficulty] || 0) + 1;
    });
    return distribution;
  }

  private buildPrerequisiteMap(questions: AvailableQuestion[]): Record<string, string[]> {
    const prereqMap: Record<string, string[]> = {};
    questions.forEach(q => {
      prereqMap[q.concept] = q.prerequisites;
    });
    return prereqMap;
  }

  private determinePrimaryGoal(profile: UserLearningProfile, request: RecommendationRequest): string {
    if (request.sessionType === 'assessment') return 'evaluate_mastery';
    if (profile.weaknessConcepts.length > 2) return 'remediate_gaps';
    if (profile.learningVelocity > 0.8) return 'accelerate_learning';
    return 'steady_progress';
  }

  private determineSecondaryGoals(profile: UserLearningProfile): string[] {
    const goals = [];
    if (profile.weaknessConcepts.length > 0) goals.push('address_weaknesses');
    if (profile.strengthConcepts.length > 3) goals.push('leverage_strengths');
    goals.push('maintain_engagement');
    return goals;
  }

  private recommendLearningStrategy(profile: UserLearningProfile): string {
    if (profile.learningVelocity > 0.7) return 'accelerated_progression';
    if (profile.weaknessConcepts.length > profile.strengthConcepts.length) return 'remediation_focused';
    return 'balanced_progression';
  }
}

export const openaiRecommendationEngine = new OpenAIRecommendationEngine();