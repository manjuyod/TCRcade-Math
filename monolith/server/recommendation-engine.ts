import {
  UserProfile,
  PerformanceRecord,
  ConceptMastery,
  QuestionRecommendation,
  RecommendationType,
  Priority,
  RecommendationRequest,
  RecommendationResponse,
  SessionMetadata,
  AdaptiveSettings,
  PersonalizationFactors
} from '../shared/types';

export class RecommendationEngine {
  private defaultPersonalizationFactors: PersonalizationFactors = {
    accuracyWeight: 0.3,
    speedWeight: 0.2,
    engagementWeight: 0.2,
    diversityWeight: 0.15,
    challengeWeight: 0.15
  };

  /**
   * Generate personalized question recommendations for a user
   */
  async generateRecommendations(
    request: RecommendationRequest,
    userProfile: UserProfile,
    availableQuestions: any[]
  ): Promise<RecommendationResponse> {
    
    // Calculate user's current learning state
    const learningState = this.analyzeLearningState(userProfile);
    
    // Generate session metadata
    const sessionMetadata = this.createSessionMetadata(request, userProfile);
    
    // Create adaptive settings based on user performance
    const adaptiveSettings = this.createAdaptiveSettings(userProfile, learningState);
    
    // Score and rank questions
    const scoredQuestions = this.scoreQuestions(
      availableQuestions,
      userProfile,
      learningState,
      request
    );
    
    // Select optimal question set
    const recommendations = this.selectOptimalQuestions(
      scoredQuestions,
      request,
      adaptiveSettings
    );
    
    return {
      recommendations,
      sessionMetadata,
      adaptiveSettings
    };
  }

  /**
   * Analyze user's current learning state
   */
  private analyzeLearningState(userProfile: UserProfile) {
    const recentPerformance = this.getRecentPerformance(userProfile.performanceHistory, 20);
    
    return {
      overallAccuracy: this.calculateAccuracy(recentPerformance),
      conceptStrengths: this.identifyStrengths(userProfile.conceptMastery),
      conceptWeaknesses: this.identifyWeaknesses(userProfile.conceptMastery),
      difficultyTrend: this.analyzeDifficultyTrend(recentPerformance),
      engagementLevel: this.calculateEngagement(recentPerformance),
      learningVelocity: this.calculateLearningVelocity(userProfile.performanceHistory),
      reviewNeeds: this.identifyReviewNeeds(userProfile.conceptMastery)
    };
  }

  /**
   * Score individual questions based on user profile and learning state
   */
  private scoreQuestions(
    questions: any[],
    userProfile: UserProfile,
    learningState: any,
    request: RecommendationRequest
  ): QuestionRecommendation[] {
    
    return questions.map(question => {
      const conceptMastery = this.getConceptMastery(question.concepts, userProfile.conceptMastery);
      const difficultyMatch = this.calculateDifficultyMatch(question.difficulty, userProfile, learningState);
      const noveltyScore = this.calculateNoveltyScore(question, userProfile.performanceHistory);
      const spacedRepetitionScore = this.calculateSpacedRepetitionScore(question, userProfile.conceptMastery);
      
      // Calculate recommendation type and reasoning
      const recommendationType = this.determineRecommendationType(
        conceptMastery,
        difficultyMatch,
        noveltyScore,
        learningState
      );
      
      const priority = this.determinePriority(recommendationType, conceptMastery, learningState);
      
      // Composite scoring
      const score = this.calculateCompositeScore({
        conceptMastery,
        difficultyMatch,
        noveltyScore,
        spacedRepetitionScore,
        learningState,
        questionDifficulty: question.difficulty
      });

      return {
        questionId: question.id,
        score,
        reasoning: this.generateReasoning(recommendationType, conceptMastery, difficultyMatch),
        category: question.category,
        difficulty: question.difficulty,
        concepts: question.concepts || [],
        recommendationType,
        priority
      };
    });
  }

  /**
   * Select optimal set of questions from scored candidates
   */
  private selectOptimalQuestions(
    scoredQuestions: QuestionRecommendation[],
    request: RecommendationRequest,
    adaptiveSettings: AdaptiveSettings
  ): QuestionRecommendation[] {
    
    const maxQuestions = request.maxQuestions || 10;
    
    // Sort by score and priority
    const sorted = scoredQuestions.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.score - a.score;
    });

    // Ensure diversity in recommendation types
    const selected = this.ensureDiversity(sorted, maxQuestions);
    
    // Apply difficulty progression
    return this.applyDifficultyProgression(selected, adaptiveSettings);
  }

  /**
   * Calculate composite recommendation score
   */
  private calculateCompositeScore(factors: {
    conceptMastery: number;
    difficultyMatch: number;
    noveltyScore: number;
    spacedRepetitionScore: number;
    learningState: any;
    questionDifficulty: number;
  }): number {
    
    const weights = this.defaultPersonalizationFactors;
    
    // Base score from concept mastery and difficulty match
    let score = (factors.conceptMastery * 0.4) + (factors.difficultyMatch * 0.3);
    
    // Adjust for novelty (avoid repetition)
    score += factors.noveltyScore * weights.diversityWeight;
    
    // Boost for spaced repetition opportunities
    score += factors.spacedRepetitionScore * 0.2;
    
    // Adjust for user's current learning state
    if (factors.learningState.overallAccuracy < 0.6) {
      // Struggling user - prefer easier questions
      score *= (factors.questionDifficulty <= 2) ? 1.2 : 0.8;
    } else if (factors.learningState.overallAccuracy > 0.8) {
      // Advanced user - prefer challenging questions
      score *= (factors.questionDifficulty >= 3) ? 1.2 : 0.9;
    }
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Determine recommendation type based on analysis
   */
  private determineRecommendationType(
    conceptMastery: number,
    difficultyMatch: number,
    noveltyScore: number,
    learningState: any
  ): RecommendationType {
    
    if (conceptMastery < 0.4) {
      return RecommendationType.REMEDIATE;
    }
    
    if (conceptMastery < 0.7 && learningState.overallAccuracy < 0.6) {
      return RecommendationType.REVIEW;
    }
    
    if (conceptMastery > 0.8 && difficultyMatch > 0.7) {
      return RecommendationType.CHALLENGE;
    }
    
    if (noveltyScore > 0.8) {
      return RecommendationType.ADVANCE;
    }
    
    return RecommendationType.REINFORCE;
  }

  /**
   * Determine priority level
   */
  private determinePriority(
    type: RecommendationType,
    conceptMastery: number,
    learningState: any
  ): Priority {
    
    if (type === RecommendationType.REMEDIATE || conceptMastery < 0.3) {
      return Priority.HIGH;
    }
    
    if (type === RecommendationType.REVIEW || learningState.overallAccuracy < 0.5) {
      return Priority.HIGH;
    }
    
    if (type === RecommendationType.CHALLENGE && learningState.overallAccuracy > 0.85) {
      return Priority.MEDIUM;
    }
    
    return Priority.MEDIUM;
  }

  /**
   * Helper methods for calculations
   */
  private getRecentPerformance(history: PerformanceRecord[], count: number): PerformanceRecord[] {
    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  private calculateAccuracy(records: PerformanceRecord[]): number {
    if (records.length === 0) return 0.5;
    return records.filter(r => r.correct).length / records.length;
  }

  private identifyStrengths(masteries: ConceptMastery[]): string[] {
    return masteries
      .filter(m => m.mastery > 0.75)
      .sort((a, b) => b.mastery - a.mastery)
      .slice(0, 5)
      .map(m => m.concept);
  }

  private identifyWeaknesses(masteries: ConceptMastery[]): string[] {
    return masteries
      .filter(m => m.mastery < 0.5)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 5)
      .map(m => m.concept);
  }

  private analyzeDifficultyTrend(records: PerformanceRecord[]): number {
    if (records.length < 5) return 0;
    
    const recent = records.slice(0, 5);
    const older = records.slice(5, 10);
    
    const recentAvg = recent.reduce((sum, r) => sum + r.difficulty, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.difficulty, 0) / older.length;
    
    return recentAvg - olderAvg; // Positive = increasing difficulty
  }

  private calculateEngagement(records: PerformanceRecord[]): number {
    if (records.length === 0) return 0.5;
    
    // Use time spent as engagement proxy (reasonable time = high engagement)
    const avgTime = records.reduce((sum, r) => sum + r.timeSpent, 0) / records.length;
    const optimalTime = 30; // seconds
    
    return Math.max(0, 1 - Math.abs(avgTime - optimalTime) / optimalTime);
  }

  private calculateLearningVelocity(history: PerformanceRecord[]): number {
    if (history.length < 10) return 0.5;
    
    const recent = history.slice(0, 20);
    const older = history.slice(20, 40);
    
    const recentAccuracy = this.calculateAccuracy(recent);
    const olderAccuracy = this.calculateAccuracy(older);
    
    return Math.max(0, recentAccuracy - olderAccuracy);
  }

  private identifyReviewNeeds(masteries: ConceptMastery[]): string[] {
    const now = new Date();
    return masteries
      .filter(m => {
        const daysSince = (now.getTime() - m.lastPracticed.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > (7 * (1 - m.mastery)); // Review more frequently for weaker concepts
      })
      .map(m => m.concept);
  }

  private getConceptMastery(concepts: string[], masteries: ConceptMastery[]): number {
    if (!concepts || concepts.length === 0) return 0.5;
    
    const relevantMasteries = masteries.filter(m => concepts.includes(m.concept));
    if (relevantMasteries.length === 0) return 0.3; // New concept
    
    return relevantMasteries.reduce((sum, m) => sum + m.mastery, 0) / relevantMasteries.length;
  }

  private calculateDifficultyMatch(
    questionDifficulty: number,
    userProfile: UserProfile,
    learningState: any
  ): number {
    // Calculate user's current optimal difficulty level
    const baseLevel = parseInt(userProfile.grade) || 1;
    const accuracyAdjustment = (learningState.overallAccuracy - 0.7) * 2;
    const optimalDifficulty = Math.max(1, Math.min(5, baseLevel + accuracyAdjustment));
    
    // Calculate match score (closer = better)
    const distance = Math.abs(questionDifficulty - optimalDifficulty);
    return Math.max(0, 1 - (distance / 4));
  }

  private calculateNoveltyScore(question: any, history: PerformanceRecord[]): number {
    const timesAsked = history.filter(r => r.questionId === question.id).length;
    
    if (timesAsked === 0) return 1.0; // Completely new
    if (timesAsked === 1) return 0.8; // Asked once
    if (timesAsked === 2) return 0.5; // Asked twice
    return 0.2; // Asked many times
  }

  private calculateSpacedRepetitionScore(question: any, masteries: ConceptMastery[]): number {
    if (!question.concepts) return 0;
    
    const relevantMasteries = masteries.filter(m => question.concepts.includes(m.concept));
    if (relevantMasteries.length === 0) return 0;
    
    const now = new Date();
    let totalScore = 0;
    
    for (const mastery of relevantMasteries) {
      const daysSince = (now.getTime() - mastery.lastPracticed.getTime()) / (1000 * 60 * 60 * 24);
      const optimalInterval = Math.pow(2, mastery.practiceCount) * (1 - mastery.mastery + 0.1);
      
      if (daysSince >= optimalInterval * 0.8) {
        totalScore += 1.0; // Due for review
      } else if (daysSince >= optimalInterval * 0.6) {
        totalScore += 0.5; // Soon due
      }
    }
    
    return Math.min(1.0, totalScore / relevantMasteries.length);
  }

  private generateReasoning(
    type: RecommendationType,
    conceptMastery: number,
    difficultyMatch: number
  ): string {
    const masteryDesc = conceptMastery < 0.3 ? "weak" : 
                      conceptMastery < 0.7 ? "developing" : "strong";
    
    const reasoningMap = {
      [RecommendationType.REMEDIATE]: `Addressing fundamental gaps in ${masteryDesc} concepts`,
      [RecommendationType.REVIEW]: `Reinforcing ${masteryDesc} understanding through targeted practice`,
      [RecommendationType.REINFORCE]: `Building confidence in ${masteryDesc} skills`,
      [RecommendationType.ADVANCE]: `Introducing new concepts building on ${masteryDesc} foundation`,
      [RecommendationType.CHALLENGE]: `Pushing boundaries with advanced problems in ${masteryDesc} areas`
    };
    
    return reasoningMap[type];
  }

  private ensureDiversity(
    questions: QuestionRecommendation[],
    maxQuestions: number
  ): QuestionRecommendation[] {
    const result: QuestionRecommendation[] = [];
    const typeCount: Record<RecommendationType, number> = {
      [RecommendationType.REMEDIATE]: 0,
      [RecommendationType.REVIEW]: 0,
      [RecommendationType.REINFORCE]: 0,
      [RecommendationType.ADVANCE]: 0,
      [RecommendationType.CHALLENGE]: 0
    };
    
    // Ensure minimum representation of each type
    const maxPerType = Math.ceil(maxQuestions / 3);
    
    for (const question of questions) {
      if (result.length >= maxQuestions) break;
      
      if (typeCount[question.recommendationType] < maxPerType) {
        result.push(question);
        typeCount[question.recommendationType]++;
      }
    }
    
    // Fill remaining slots with highest scored questions
    for (const question of questions) {
      if (result.length >= maxQuestions) break;
      if (!result.some(q => q.questionId === question.questionId)) {
        result.push(question);
      }
    }
    
    return result.slice(0, maxQuestions);
  }

  private applyDifficultyProgression(
    questions: QuestionRecommendation[],
    adaptiveSettings: AdaptiveSettings
  ): QuestionRecommendation[] {
    // Sort by difficulty to create a progression
    return questions.sort((a, b) => {
      // High priority first, then by difficulty progression
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.difficulty - b.difficulty;
    });
  }

  private createSessionMetadata(
    request: RecommendationRequest,
    userProfile: UserProfile
  ): SessionMetadata {
    return {
      sessionId: `session_${Date.now()}_${userProfile.id}`,
      userId: userProfile.id,
      startTime: new Date(),
      estimatedDuration: (request.maxQuestions || 10) * 2, // 2 minutes per question
      targetConcepts: request.focusConcepts || userProfile.weaknesses.slice(0, 3),
      difficultyRange: [1, Math.min(5, parseInt(userProfile.grade) + 2)]
    };
  }

  private createAdaptiveSettings(
    userProfile: UserProfile,
    learningState: any
  ): AdaptiveSettings {
    return {
      initialDifficulty: Math.max(1, Math.min(5, parseInt(userProfile.grade) + 
        (learningState.overallAccuracy - 0.7))),
      difficultyAdjustmentRate: learningState.learningVelocity > 0.1 ? 0.3 : 0.1,
      masteryThreshold: 0.75,
      spacedRepetitionInterval: 7 // days
    };
  }
}