import { UserProfile, ConceptMastery, PerformanceRecord } from '../shared/types';

/**
 * Analytics Integration Module
 * Bridges the monolith recommendation system with existing AI analytics
 */
export class AnalyticsIntegration {
  
  /**
   * Transform user data from existing system to monolith UserProfile
   */
  transformUserToProfile(user: any, analytics: any, moduleHistory: any[]): UserProfile {
    const performanceHistory = this.extractPerformanceHistory(moduleHistory, user);
    const conceptMastery = this.extractConceptMastery(analytics, user);
    
    return {
      id: user.id,
      grade: user.grade || 'K',
      strengths: user.strengthConcepts || [],
      weaknesses: user.weaknessConcepts || [],
      learningStyle: user.learningStyle || 'Visual',
      performanceHistory,
      conceptMastery
    };
  }

  /**
   * Extract performance records from module history
   */
  private extractPerformanceHistory(moduleHistory: any[], user: any): PerformanceRecord[] {
    const records: PerformanceRecord[] = [];
    
    // Process module completion data
    for (const session of moduleHistory) {
      const accuracy = session.questionsTotal > 0 ? 
        session.questionsCorrect / session.questionsTotal : 0;
      
      // Create performance records based on session data
      for (let i = 0; i < session.questionsTotal; i++) {
        const isCorrect = i < session.questionsCorrect;
        
        records.push({
          questionId: session.id * 1000 + i, // Synthetic ID based on session
          category: this.extractCategoryFromModule(session.moduleName),
          difficulty: session.difficultyLevel || this.inferDifficulty(session.moduleName, user.grade),
          correct: isCorrect,
          timeSpent: session.timeSpentSeconds / session.questionsTotal,
          timestamp: new Date(session.completedAt),
          concepts: this.extractConceptsFromModule(session.moduleName)
        });
      }
    }
    
    // Add individual question data if available
    if (user.questionsAnswered && user.correctAnswers) {
      const recentAccuracy = user.correctAnswers / user.questionsAnswered;
      
      // Add recent performance summary record
      records.push({
        questionId: Date.now(),
        category: 'general',
        difficulty: this.inferUserDifficulty(user),
        correct: recentAccuracy > 0.7,
        timeSpent: 45, // Average time estimate
        timestamp: new Date(user.lastActive),
        concepts: ['general_math']
      });
    }
    
    return records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Extract concept mastery from analytics data
   */
  private extractConceptMastery(analytics: any, user: any): ConceptMastery[] {
    const masteries: ConceptMastery[] = [];
    
    // Process AI analytics concept mastery if available
    if (analytics?.concept_mastery) {
      for (const [concept, data] of Object.entries(analytics.concept_mastery)) {
        const masteryData = data as any;
        masteries.push({
          concept,
          mastery: this.normalizeMastery(masteryData.weighted_score || masteryData.score || 0),
          confidence: masteryData.confidence || 0.5,
          lastPracticed: new Date(masteryData.last_practiced || user.lastActive),
          practiceCount: masteryData.practice_count || 1
        });
      }
    }
    
    // Add concept mastery from user strengths/weaknesses
    if (user.strengthConcepts) {
      for (const concept of user.strengthConcepts) {
        if (!masteries.find(m => m.concept === concept)) {
          masteries.push({
            concept,
            mastery: 0.8, // Strong concepts
            confidence: 0.7,
            lastPracticed: new Date(user.lastActive),
            practiceCount: 5
          });
        }
      }
    }
    
    if (user.weaknessConcepts) {
      for (const concept of user.weaknessConcepts) {
        if (!masteries.find(m => m.concept === concept)) {
          masteries.push({
            concept,
            mastery: 0.3, // Weak concepts
            confidence: 0.6,
            lastPracticed: new Date(user.lastActive),
            practiceCount: 2
          });
        }
      }
    }
    
    return masteries;
  }

  /**
   * Update existing analytics with recommendation feedback
   */
  async updateAnalyticsWithFeedback(
    userId: number,
    questionId: number,
    correct: boolean,
    timeSpent: number,
    concepts: string[]
  ) {
    // This would integrate with the existing analytics update system
    const feedbackData = {
      userId,
      questionId,
      correct,
      timeSpent,
      concepts,
      timestamp: new Date()
    };
    
    // Update concept mastery based on performance
    for (const concept of concepts) {
      await this.updateConceptMastery(userId, concept, correct, timeSpent);
    }
    
    return feedbackData;
  }

  /**
   * Calculate recommendation effectiveness metrics
   */
  calculateRecommendationMetrics(
    recommendations: any[],
    actualPerformance: any[]
  ) {
    const metrics = {
      accuracyPrediction: 0,
      engagementPrediction: 0,
      difficultyAlignment: 0,
      conceptCoverage: 0
    };
    
    if (recommendations.length === 0 || actualPerformance.length === 0) {
      return metrics;
    }
    
    // Calculate accuracy prediction success
    let correctPredictions = 0;
    for (const perf of actualPerformance) {
      const rec = recommendations.find(r => r.questionId === perf.questionId);
      if (rec) {
        const predictedSuccess = rec.score > 0.6;
        const actualSuccess = perf.correct;
        if (predictedSuccess === actualSuccess) {
          correctPredictions++;
        }
      }
    }
    metrics.accuracyPrediction = correctPredictions / actualPerformance.length;
    
    // Calculate engagement alignment
    const avgEngagement = actualPerformance.reduce((sum: number, p: any) => 
      sum + this.calculateEngagementScore(p.timeSpent), 0) / actualPerformance.length;
    metrics.engagementPrediction = Math.min(1, avgEngagement);
    
    // Calculate difficulty alignment
    const difficultyErrors = actualPerformance.map((p: any) => {
      const rec = recommendations.find(r => r.questionId === p.questionId);
      if (!rec) return 1;
      const optimalTime = 30; // seconds
      const actualDifficulty = Math.max(1, Math.min(5, p.timeSpent / optimalTime * 3));
      return Math.abs(rec.difficulty - actualDifficulty);
    });
    const avgDifficultyError = difficultyErrors.reduce((sum, err) => sum + err, 0) / difficultyErrors.length;
    metrics.difficultyAlignment = Math.max(0, 1 - avgDifficultyError / 4);
    
    // Calculate concept coverage
    const recommendedConcepts = new Set(recommendations.flatMap(r => r.concepts));
    const practicedConcepts = new Set(actualPerformance.flatMap((p: any) => p.concepts || []));
    const intersection = new Set([...recommendedConcepts].filter(c => practicedConcepts.has(c)));
    metrics.conceptCoverage = recommendedConcepts.size > 0 ? 
      intersection.size / recommendedConcepts.size : 0;
    
    return metrics;
  }

  /**
   * Helper methods
   */
  private extractCategoryFromModule(moduleName: string): string {
    const moduleMap: Record<string, string> = {
      'math_rush_addition': 'addition',
      'math_rush_multiplication': 'multiplication',
      'math_facts_addition': 'addition',
      'math_facts_subtraction': 'subtraction',
      'math_facts_multiplication': 'multiplication',
      'math_facts_division': 'division',
      'fractions_puzzle': 'fractions',
      'decimal_defender': 'decimals',
      'ratios_proportions': 'ratios',
      'measurement_mastery': 'measurement',
      'algebra': 'algebra'
    };
    
    return moduleMap[moduleName] || 'general';
  }

  private extractConceptsFromModule(moduleName: string): string[] {
    const conceptMap: Record<string, string[]> = {
      'math_rush_addition': ['addition', 'basic_arithmetic', 'mental_math'],
      'math_rush_multiplication': ['multiplication', 'basic_arithmetic', 'mental_math'],
      'math_facts_addition': ['addition', 'fact_fluency'],
      'math_facts_subtraction': ['subtraction', 'fact_fluency'],
      'math_facts_multiplication': ['multiplication', 'fact_fluency'],
      'math_facts_division': ['division', 'fact_fluency'],
      'fractions_puzzle': ['fractions', 'parts_and_wholes', 'equivalent_fractions'],
      'decimal_defender': ['decimals', 'place_value', 'decimal_operations'],
      'ratios_proportions': ['ratios', 'proportions', 'scaling'],
      'measurement_mastery': ['measurement', 'units', 'conversions'],
      'algebra': ['algebra', 'variables', 'equations', 'expressions']
    };
    
    return conceptMap[moduleName] || ['general_math'];
  }

  private inferDifficulty(moduleName: string, grade: string): number {
    const gradeNum = parseInt(grade) || 1;
    
    const baseDifficulty: Record<string, number> = {
      'math_rush_addition': 1,
      'math_rush_multiplication': 2,
      'math_facts_addition': 1,
      'math_facts_subtraction': 1,
      'math_facts_multiplication': 2,
      'math_facts_division': 3,
      'fractions_puzzle': 3,
      'decimal_defender': 4,
      'ratios_proportions': 4,
      'measurement_mastery': 3,
      'algebra': 5
    };
    
    const base = baseDifficulty[moduleName] || 2;
    return Math.max(1, Math.min(5, base + Math.floor(gradeNum / 2) - 1));
  }

  private inferUserDifficulty(user: any): number {
    const grade = parseInt(user.grade) || 1;
    const accuracy = user.questionsAnswered > 0 ? 
      user.correctAnswers / user.questionsAnswered : 0.5;
    
    let difficulty = grade;
    
    // Adjust based on performance
    if (accuracy > 0.8) difficulty += 1;
    else if (accuracy < 0.6) difficulty -= 1;
    
    return Math.max(1, Math.min(5, difficulty));
  }

  private normalizeMastery(score: number): number {
    // Convert various scoring systems to 0-1 scale
    if (score <= 1) return score; // Already normalized
    if (score <= 5) return score / 5; // 5-point scale
    if (score <= 10) return score / 10; // 10-point scale
    if (score <= 100) return score / 100; // Percentage
    return Math.min(1, score / 100); // Cap at 1
  }

  private async updateConceptMastery(
    userId: number,
    concept: string,
    correct: boolean,
    timeSpent: number
  ) {
    // Calculate mastery adjustment based on performance
    const baseAdjustment = correct ? 0.1 : -0.05;
    const timeAdjustment = this.calculateTimeAdjustment(timeSpent);
    const totalAdjustment = baseAdjustment + timeAdjustment;
    
    // This would update the existing concept mastery system
    // Implementation would depend on the existing storage interface
    
    return {
      concept,
      adjustment: totalAdjustment,
      timestamp: new Date()
    };
  }

  private calculateTimeAdjustment(timeSpent: number): number {
    const optimalTime = 30; // seconds
    const ratio = timeSpent / optimalTime;
    
    if (ratio < 0.5) return -0.02; // Too fast, might be guessing
    if (ratio > 2.0) return -0.02; // Too slow, struggling
    return 0.02; // Good timing, small bonus
  }

  private calculateEngagementScore(timeSpent: number): number {
    const optimalTime = 30; // seconds
    const ratio = timeSpent / optimalTime;
    
    // Bell curve around optimal time
    return Math.exp(-Math.pow(ratio - 1, 2) / 0.5);
  }

  /**
   * Generate learning insights for recommendations
   */
  generateLearningInsights(userProfile: UserProfile, recentPerformance: PerformanceRecord[]) {
    const insights = {
      learningTrend: this.analyzeLearningTrend(recentPerformance),
      strongestConcepts: this.identifyStrongestConcepts(userProfile.conceptMastery),
      emergingStrengths: this.identifyEmergingStrengths(recentPerformance, userProfile.conceptMastery),
      persistentChallenges: this.identifyPersistentChallenges(recentPerformance, userProfile.conceptMastery),
      recommendedFocus: this.recommendFocusAreas(userProfile, recentPerformance)
    };
    
    return insights;
  }

  private analyzeLearningTrend(records: PerformanceRecord[]): string {
    if (records.length < 5) return 'insufficient_data';
    
    const recent = records.slice(0, 5);
    const older = records.slice(5, 10);
    
    const recentAccuracy = recent.filter(r => r.correct).length / recent.length;
    const olderAccuracy = older.length > 0 ? 
      older.filter(r => r.correct).length / older.length : recentAccuracy;
    
    const improvement = recentAccuracy - olderAccuracy;
    
    if (improvement > 0.1) return 'improving';
    if (improvement < -0.1) return 'declining';
    return 'stable';
  }

  private identifyStrongestConcepts(masteries: ConceptMastery[]): string[] {
    return masteries
      .filter(m => m.mastery > 0.8 && m.confidence > 0.7)
      .sort((a, b) => b.mastery - a.mastery)
      .slice(0, 3)
      .map(m => m.concept);
  }

  private identifyEmergingStrengths(
    records: PerformanceRecord[],
    masteries: ConceptMastery[]
  ): string[] {
    const conceptPerformance = new Map<string, number[]>();
    
    // Group recent performance by concept
    records.slice(0, 10).forEach(record => {
      record.concepts.forEach(concept => {
        if (!conceptPerformance.has(concept)) {
          conceptPerformance.set(concept, []);
        }
        conceptPerformance.get(concept)!.push(record.correct ? 1 : 0);
      });
    });
    
    const emerging: string[] = [];
    
    for (const [concept, performances] of conceptPerformance) {
      if (performances.length >= 3) {
        const recentAccuracy = performances.slice(0, 3).reduce((sum, p) => sum + p, 0) / 3;
        const currentMastery = masteries.find(m => m.concept === concept)?.mastery || 0.5;
        
        // Emerging if recent performance is much better than stored mastery
        if (recentAccuracy > 0.8 && recentAccuracy > currentMastery + 0.2) {
          emerging.push(concept);
        }
      }
    }
    
    return emerging;
  }

  private identifyPersistentChallenges(
    records: PerformanceRecord[],
    masteries: ConceptMastery[]
  ): string[] {
    const persistentChallenges: string[] = [];
    
    const weakConcepts = masteries
      .filter(m => m.mastery < 0.5)
      .map(m => m.concept);
    
    // Check if weak concepts remain challenging in recent performance
    for (const concept of weakConcepts) {
      const recentAttempts = records
        .filter(r => r.concepts.includes(concept))
        .slice(0, 5);
      
      if (recentAttempts.length >= 2) {
        const recentAccuracy = recentAttempts.filter(r => r.correct).length / recentAttempts.length;
        if (recentAccuracy < 0.6) {
          persistentChallenges.push(concept);
        }
      }
    }
    
    return persistentChallenges;
  }

  private recommendFocusAreas(
    userProfile: UserProfile,
    recentPerformance: PerformanceRecord[]
  ): string[] {
    const focusAreas: string[] = [];
    
    // Priority 1: Persistent challenges that need immediate attention
    const persistentChallenges = this.identifyPersistentChallenges(recentPerformance, userProfile.conceptMastery);
    focusAreas.push(...persistentChallenges.slice(0, 2));
    
    // Priority 2: Concepts ready for advancement
    const readyToAdvance = userProfile.conceptMastery
      .filter(m => m.mastery > 0.7 && m.mastery < 0.9)
      .sort((a, b) => b.mastery - a.mastery)
      .slice(0, 2)
      .map(m => m.concept);
    
    focusAreas.push(...readyToAdvance);
    
    // Priority 3: New concepts based on grade level
    const gradeAppropriate = this.getGradeAppropriateConcepts(userProfile.grade);
    const newConcepts = gradeAppropriate.filter(concept => 
      !userProfile.conceptMastery.some(m => m.concept === concept)
    );
    
    focusAreas.push(...newConcepts.slice(0, 1));
    
    return [...new Set(focusAreas)].slice(0, 5); // Remove duplicates, limit to 5
  }

  private getGradeAppropriateConcepts(grade: string): string[] {
    const gradeNum = parseInt(grade) || 1;
    
    const conceptsByGrade: Record<number, string[]> = {
      0: ['counting', 'number_recognition', 'basic_shapes'],
      1: ['addition', 'subtraction', 'place_value', 'time'],
      2: ['multiplication', 'division', 'fractions_intro', 'measurement'],
      3: ['fractions', 'decimals', 'area_perimeter', 'data_analysis'],
      4: ['long_division', 'equivalent_fractions', 'angles', 'patterns'],
      5: ['decimals_operations', 'ratios', 'coordinate_plane', 'volume'],
      6: ['percentages', 'negative_numbers', 'expressions', 'statistics']
    };
    
    return conceptsByGrade[Math.min(6, gradeNum)] || conceptsByGrade[6];
  }
}