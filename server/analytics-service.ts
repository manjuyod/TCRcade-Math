import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { users, moduleHistory, type User, type ModuleHistory } from "@shared/schema";

// Analytics interfaces based on project requirements
export interface PerformanceMetrics {
  overallPerformanceScore: number;
  learningVelocity: number;
  accuracyTrends: ModuleAccuracyTrend[];
  retentionRate: number;
  consistencyIndex: number;
  questionsPerSession: number;
  averageSessionTime: number;
}

export interface ModuleAccuracyTrend {
  moduleName: string;
  accuracy: number;
  trend: 'improving' | 'declining' | 'stable';
  sessionCount: number;
  lastSessionDate: Date;
}

export interface LearningPatterns {
  peakPerformanceTimes: TimeSlot[];
  learningCurveAnalysis: LearningCurve[];
  strugglePoints: ConceptStruggle[];
  masteryMilestones: ConceptMastery[];
  crossModuleCorrelation: ModuleCorrelation[];
}

export interface TimeSlot {
  hour: number;
  performanceScore: number;
  sessionCount: number;
}

export interface LearningCurve {
  concept: string;
  progressRate: number;
  timeToMastery: number;
  difficultyAdaptation: number;
}

export interface ConceptStruggle {
  concept: string;
  failureRate: number;
  attemptsNeeded: number;
  recommendedAction: string;
}

export interface ConceptMastery {
  concept: string;
  masteryLevel: number;
  achievedDate: Date;
  stabilityScore: number;
}

export interface ModuleCorrelation {
  module1: string;
  module2: string;
  correlationStrength: number;
  type: 'positive' | 'negative' | 'neutral';
}

export interface EngagementMetrics {
  sessionDurationPatterns: SessionPattern[];
  modulePreferences: ModulePreference[];
  difficultyAdaptation: DifficultyMetric[];
  comebackPerformance: ComebackMetric[];
  goalAchievementRate: number;
}

export interface SessionPattern {
  averageDuration: number;
  optimalDuration: number;
  engagementScore: number;
  timeOfDay: string;
}

export interface ModulePreference {
  moduleName: string;
  timeSpent: number;
  performanceCorrelation: number;
  engagementLevel: number;
}

export interface DifficultyMetric {
  currentLevel: number;
  adaptationSpeed: number;
  comfortZone: [number, number];
  challengeReadiness: number;
}

export interface ComebackMetric {
  daysAway: number;
  performanceChange: number;
  recoveryTime: number;
}

export interface PredictiveAnalytics {
  performanceForecast: PerformanceForecast[];
  riskAssessment: RiskAssessment[];
  optimalChallengeLevel: number;
  learningPathOptimization: PathOptimization[];
  timeToMasteryEstimates: MasteryEstimate[];
}

export interface PerformanceForecast {
  sessionNumber: number;
  predictedScore: number;
  confidence: number;
  date: Date;
}

export interface RiskAssessment {
  concept: string;
  forgettingRisk: number;
  interventionNeeded: boolean;
  recommendedAction: string;
}

export interface PathOptimization {
  currentModule: string;
  nextModule: string;
  optimalSequence: string[];
  expectedOutcome: number;
}

export interface MasteryEstimate {
  concept: string;
  estimatedDays: number;
  confidence: number;
  prerequisitesMet: boolean;
}

export interface ComprehensiveAnalytics {
  performanceMetrics: PerformanceMetrics;
  learningPatterns: LearningPatterns;
  engagementMetrics: EngagementMetrics;
  predictiveAnalytics: PredictiveAnalytics;
  strengths: string[];
  weaknesses: string[];
  recommendedStudyPlan: StudyPlanDay[];
}

export interface StudyPlanDay {
  day: number;
  activities: StudyActivity[];
}

export interface StudyActivity {
  module: string;
  activity: string;
  duration: string;
  targetQuestions: number;
  difficultyLevel: string;
  rationale: string;
}

export class AnalyticsService {
  
  /**
   * Get comprehensive analytics for a user combining historical and current data
   */
  async getComprehensiveAnalytics(userId: number): Promise<ComprehensiveAnalytics | null> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]) return null;

    const userRecord = user[0];
    
    // Get historical data from module_history
    const moduleHistoryData = await this.getUserModuleHistory(userId);
    
    // Get current progress from hiddenGradeAsset
    const currentProgress = userRecord.hiddenGradeAsset || {};

    // Calculate performance metrics
    const performanceMetrics = await this.calculatePerformanceMetrics(userId, moduleHistoryData, currentProgress);
    
    // Analyze learning patterns
    const learningPatterns = await this.analyzeLearningPatterns(userId, moduleHistoryData);
    
    // Calculate engagement metrics
    const engagementMetrics = await this.calculateEngagementMetrics(userId, moduleHistoryData);
    
    // Generate predictive analytics
    const predictiveAnalytics = await this.generatePredictiveAnalytics(userId, moduleHistoryData, performanceMetrics);
    
    // Extract strengths and weaknesses
    const { strengths, weaknesses } = await this.extractStrengthsWeaknesses(userId, moduleHistoryData, currentProgress);

    return {
      performanceMetrics,
      learningPatterns,
      engagementMetrics,
      predictiveAnalytics,
      strengths,
      weaknesses,
      recommendedStudyPlan: [] // Will be populated by OpenAI service
    };
  }

  /**
   * Get user's module history with analytics focus
   */
  private async getUserModuleHistory(userId: number, limit: number = 100): Promise<ModuleHistory[]> {
    return await db
      .select()
      .from(moduleHistory)
      .where(eq(moduleHistory.userId, userId))
      .orderBy(desc(moduleHistory.completedAt))
      .limit(limit);
  }

  /**
   * Calculate comprehensive performance metrics
   */
  private async calculatePerformanceMetrics(
    userId: number, 
    historyData: ModuleHistory[], 
    currentProgress: any
  ): Promise<PerformanceMetrics> {
    
    if (historyData.length === 0) {
      return {
        overallPerformanceScore: 0,
        learningVelocity: 0,
        accuracyTrends: [],
        retentionRate: 0,
        consistencyIndex: 0,
        questionsPerSession: 0,
        averageSessionTime: 0
      };
    }

    // Calculate overall performance score (weighted average)
    const totalSessions = historyData.length;
    const overallPerformanceScore = historyData.reduce((sum, session) => sum + session.finalScore, 0) / totalSessions;

    // Calculate learning velocity (questions per day)
    const daysSinceFirst = Math.max(1, Math.ceil(
      (new Date().getTime() - new Date(historyData[historyData.length - 1].completedAt).getTime()) / (1000 * 60 * 60 * 24)
    ));
    const totalQuestions = historyData.reduce((sum, session) => sum + session.questionsTotal, 0);
    const learningVelocity = totalQuestions / daysSinceFirst;

    // Calculate accuracy trends by module
    const moduleGroups = this.groupByModule(historyData);
    const accuracyTrends: ModuleAccuracyTrend[] = [];
    
    for (const [moduleName, sessions] of Object.entries(moduleGroups)) {
      const accuracies = sessions.map(s => s.questionsCorrect / Math.max(1, s.questionsTotal));
      const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
      
      // Determine trend by comparing first and second half of sessions
      const firstHalf = accuracies.slice(0, Math.floor(accuracies.length / 2));
      const secondHalf = accuracies.slice(Math.floor(accuracies.length / 2));
      const firstAvg = firstHalf.reduce((sum, acc) => sum + acc, 0) / Math.max(1, firstHalf.length);
      const secondAvg = secondHalf.reduce((sum, acc) => sum + acc, 0) / Math.max(1, secondHalf.length);
      
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (secondAvg > firstAvg + 0.1) trend = 'improving';
      else if (secondAvg < firstAvg - 0.1) trend = 'declining';

      accuracyTrends.push({
        moduleName,
        accuracy: avgAccuracy,
        trend,
        sessionCount: sessions.length,
        lastSessionDate: new Date(sessions[0].completedAt)
      });
    }

    // Calculate retention rate (performance maintenance over gaps)
    const retentionRate = this.calculateRetentionRate(historyData);

    // Calculate consistency index (variance in performance)
    const scores = historyData.map(s => s.finalScore);
    const variance = this.calculateVariance(scores);
    const consistencyIndex = Math.max(0, 100 - variance);

    // Calculate session metrics
    const questionsPerSession = totalQuestions / totalSessions;
    const averageSessionTime = historyData.reduce((sum, s) => sum + s.timeSpentSeconds, 0) / totalSessions;

    return {
      overallPerformanceScore,
      learningVelocity,
      accuracyTrends,
      retentionRate,
      consistencyIndex,
      questionsPerSession,
      averageSessionTime
    };
  }

  /**
   * Analyze learning patterns from historical data
   */
  private async analyzeLearningPatterns(userId: number, historyData: ModuleHistory[]): Promise<LearningPatterns> {
    // Peak performance times analysis
    const timeGroups = this.groupByHour(historyData);
    const peakPerformanceTimes: TimeSlot[] = [];
    
    for (const [hour, sessions] of Object.entries(timeGroups)) {
      const avgScore = sessions.reduce((sum, s) => sum + s.finalScore, 0) / sessions.length;
      peakPerformanceTimes.push({
        hour: parseInt(hour),
        performanceScore: avgScore,
        sessionCount: sessions.length
      });
    }

    // Learning curve analysis - improvement rate by module
    const moduleGroups = this.groupByModule(historyData);
    const learningCurveAnalysis: LearningCurve[] = [];
    
    for (const [moduleName, sessions] of Object.entries(moduleGroups)) {
      const progressRate = this.calculateProgressRate(sessions);
      const difficultyAdaptation = this.calculateDifficultyAdaptation(sessions);
      
      learningCurveAnalysis.push({
        concept: moduleName,
        progressRate,
        timeToMastery: this.estimateTimeToMastery(sessions),
        difficultyAdaptation
      });
    }

    // Struggle points identification
    const strugglePoints = this.identifyStrugglePoints(historyData);
    
    // Mastery milestones
    const masteryMilestones = this.identifyMasteryMilestones(historyData);
    
    // Cross-module correlation
    const crossModuleCorrelation = this.calculateCrossModuleCorrelation(moduleGroups);

    return {
      peakPerformanceTimes,
      learningCurveAnalysis,
      strugglePoints,
      masteryMilestones,
      crossModuleCorrelation
    };
  }

  /**
   * Calculate engagement metrics
   */
  private async calculateEngagementMetrics(userId: number, historyData: ModuleHistory[]): Promise<EngagementMetrics> {
    // Session duration patterns
    const sessionDurationPatterns = this.analyzeSessionDurations(historyData);
    
    // Module preferences based on time spent and performance
    const modulePreferences = this.calculateModulePreferences(historyData);
    
    // Difficulty adaptation metrics
    const difficultyAdaptation = this.analyzeDifficultyAdaptation(historyData);
    
    // Comeback performance after breaks
    const comebackPerformance = this.analyzeComebackPerformance(historyData);
    
    // Goal achievement rate (placeholder - would need goal tracking)
    const goalAchievementRate = this.calculateGoalAchievementRate(historyData);

    return {
      sessionDurationPatterns,
      modulePreferences,
      difficultyAdaptation,
      comebackPerformance,
      goalAchievementRate
    };
  }

  /**
   * Generate predictive analytics
   */
  private async generatePredictiveAnalytics(
    userId: number, 
    historyData: ModuleHistory[], 
    performanceMetrics: PerformanceMetrics
  ): Promise<PredictiveAnalytics> {
    
    // Performance forecasting for next 5 sessions
    const performanceForecast = this.forecastPerformance(historyData, 5);
    
    // Risk assessment for concept forgetting
    const riskAssessment = this.assessForgettingRisk(historyData);
    
    // Optimal challenge level recommendation
    const optimalChallengeLevel = this.calculateOptimalChallengeLevel(historyData);
    
    // Learning path optimization
    const learningPathOptimization = this.optimizeLearningPath(historyData);
    
    // Time to mastery estimates
    const timeToMasteryEstimates = this.estimateTimeToMasteryAll(historyData);

    return {
      performanceForecast,
      riskAssessment,
      optimalChallengeLevel,
      learningPathOptimization,
      timeToMasteryEstimates
    };
  }

  /**
   * Extract strengths and weaknesses from data
   */
  private async extractStrengthsWeaknesses(
    userId: number, 
    historyData: ModuleHistory[], 
    currentProgress: any
  ): Promise<{ strengths: string[], weaknesses: string[] }> {
    
    const modulePerformance = this.groupByModule(historyData);
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const [moduleName, sessions] of Object.entries(modulePerformance)) {
      const avgAccuracy = sessions.reduce((sum, s) => sum + (s.questionsCorrect / Math.max(1, s.questionsTotal)), 0) / sessions.length;
      const avgScore = sessions.reduce((sum, s) => sum + s.finalScore, 0) / sessions.length;
      
      if (avgAccuracy > 0.8 && avgScore > 75) {
        strengths.push(this.formatModuleName(moduleName));
      } else if (avgAccuracy < 0.6 || avgScore < 50) {
        weaknesses.push(this.formatModuleName(moduleName));
      }
    }

    return { strengths, weaknesses };
  }

  // Helper methods
  private groupByModule(historyData: ModuleHistory[]): Record<string, ModuleHistory[]> {
    return historyData.reduce((groups, session) => {
      const module = session.moduleName;
      if (!groups[module]) groups[module] = [];
      groups[module].push(session);
      return groups;
    }, {} as Record<string, ModuleHistory[]>);
  }

  private groupByHour(historyData: ModuleHistory[]): Record<string, ModuleHistory[]> {
    return historyData.reduce((groups, session) => {
      const hour = new Date(session.completedAt).getHours().toString();
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push(session);
      return groups;
    }, {} as Record<string, ModuleHistory[]>);
  }

  private calculateRetentionRate(historyData: ModuleHistory[]): number {
    if (historyData.length < 2) return 100;
    
    // Calculate performance maintenance over time gaps
    const sortedSessions = [...historyData].sort((a, b) => 
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    
    let retentionSum = 0;
    let comparisons = 0;
    
    for (let i = 1; i < sortedSessions.length; i++) {
      const current = sortedSessions[i];
      const previous = sortedSessions[i - 1];
      const daysBetween = (new Date(current.completedAt).getTime() - new Date(previous.completedAt).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysBetween > 1) { // Only count if there was a gap
        const retention = Math.min(100, (current.finalScore / Math.max(1, previous.finalScore)) * 100);
        retentionSum += retention;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? retentionSum / comparisons : 100;
  }

  private calculateVariance(scores: number[]): number {
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  private calculateProgressRate(sessions: ModuleHistory[]): number {
    if (sessions.length < 2) return 0;
    
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    
    const firstScore = sortedSessions[0].finalScore;
    const lastScore = sortedSessions[sortedSessions.length - 1].finalScore;
    const improvement = lastScore - firstScore;
    
    return improvement / sessions.length; // improvement per session
  }

  private calculateDifficultyAdaptation(sessions: ModuleHistory[]): number {
    // Calculate how quickly user adapts to increasing difficulty
    const difficultyChanges = sessions.slice(1).map((session, i) => {
      const prevDifficulty = sessions[i].difficultyLevel || 1;
      const currentDifficulty = session.difficultyLevel || 1;
      return currentDifficulty - prevDifficulty;
    });
    
    return difficultyChanges.length > 0 ? difficultyChanges.reduce((sum, change) => sum + change, 0) / difficultyChanges.length : 0;
  }

  private estimateTimeToMastery(sessions: ModuleHistory[]): number {
    // Estimate based on improvement rate and current performance
    if (sessions.length === 0) return 0;
    
    const latestScore = sessions[0].finalScore;
    const progressRate = this.calculateProgressRate(sessions);
    
    if (latestScore >= 85) return 0; // Already mastered
    if (progressRate <= 0) return 999; // Not improving
    
    const scoreNeeded = 85 - latestScore;
    return Math.ceil(scoreNeeded / Math.max(0.1, progressRate));
  }

  private identifyStrugglePoints(historyData: ModuleHistory[]): ConceptStruggle[] {
    const moduleGroups = this.groupByModule(historyData);
    const strugglePoints: ConceptStruggle[] = [];
    
    for (const [moduleName, sessions] of Object.entries(moduleGroups)) {
      const failureRate = sessions.reduce((sum, s) => sum + (s.questionsTotal - s.questionsCorrect), 0) / 
                         sessions.reduce((sum, s) => sum + s.questionsTotal, 0);
      
      if (failureRate > 0.4) { // More than 40% failure rate
        strugglePoints.push({
          concept: moduleName,
          failureRate,
          attemptsNeeded: sessions.length,
          recommendedAction: failureRate > 0.6 ? 'Review fundamentals' : 'Practice more'
        });
      }
    }
    
    return strugglePoints;
  }

  private identifyMasteryMilestones(historyData: ModuleHistory[]): ConceptMastery[] {
    const moduleGroups = this.groupByModule(historyData);
    const milestones: ConceptMastery[] = [];
    
    for (const [moduleName, sessions] of Object.entries(moduleGroups)) {
      const recentSessions = sessions.slice(0, 3); // Last 3 sessions
      const avgScore = recentSessions.reduce((sum, s) => sum + s.finalScore, 0) / recentSessions.length;
      
      if (avgScore >= 85 && recentSessions.length >= 2) {
        const stability = this.calculateVariance(recentSessions.map(s => s.finalScore));
        milestones.push({
          concept: moduleName,
          masteryLevel: avgScore,
          achievedDate: new Date(recentSessions[0].completedAt),
          stabilityScore: Math.max(0, 100 - stability)
        });
      }
    }
    
    return milestones;
  }

  private calculateCrossModuleCorrelation(moduleGroups: Record<string, ModuleHistory[]>): ModuleCorrelation[] {
    const correlations: ModuleCorrelation[] = [];
    const moduleNames = Object.keys(moduleGroups);
    
    for (let i = 0; i < moduleNames.length; i++) {
      for (let j = i + 1; j < moduleNames.length; j++) {
        const module1 = moduleNames[i];
        const module2 = moduleNames[j];
        
        const scores1 = moduleGroups[module1].map(s => s.finalScore);
        const scores2 = moduleGroups[module2].map(s => s.finalScore);
        
        const correlation = this.calculateCorrelation(scores1, scores2);
        
        correlations.push({
          module1,
          module2,
          correlationStrength: Math.abs(correlation),
          type: correlation > 0.1 ? 'positive' : correlation < -0.1 ? 'negative' : 'neutral'
        });
      }
    }
    
    return correlations;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      denomX += deltaX * deltaX;
      denomY += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Placeholder implementations for engagement metrics
  private analyzeSessionDurations(historyData: ModuleHistory[]): SessionPattern[] {
    const avgDuration = historyData.reduce((sum, s) => sum + s.timeSpentSeconds, 0) / Math.max(1, historyData.length);
    return [{
      averageDuration: avgDuration,
      optimalDuration: avgDuration * 1.2, // Estimated optimal
      engagementScore: Math.min(100, avgDuration / 10), // Simple engagement score
      timeOfDay: 'morning' // Placeholder
    }];
  }

  private calculateModulePreferences(historyData: ModuleHistory[]): ModulePreference[] {
    const moduleGroups = this.groupByModule(historyData);
    return Object.entries(moduleGroups).map(([moduleName, sessions]) => ({
      moduleName,
      timeSpent: sessions.reduce((sum, s) => sum + s.timeSpentSeconds, 0),
      performanceCorrelation: sessions.reduce((sum, s) => sum + s.finalScore, 0) / sessions.length,
      engagementLevel: Math.min(100, sessions.length * 10)
    }));
  }

  private analyzeDifficultyAdaptation(historyData: ModuleHistory[]): DifficultyMetric[] {
    const avgDifficulty = historyData.reduce((sum, s) => sum + (s.difficultyLevel || 1), 0) / Math.max(1, historyData.length);
    return [{
      currentLevel: avgDifficulty,
      adaptationSpeed: 1.0, // Placeholder
      comfortZone: [avgDifficulty - 1, avgDifficulty + 1],
      challengeReadiness: 75 // Placeholder
    }];
  }

  private analyzeComebackPerformance(historyData: ModuleHistory[]): ComebackMetric[] {
    // Simplified comeback analysis
    return [{
      daysAway: 1,
      performanceChange: 0,
      recoveryTime: 1
    }];
  }

  private calculateGoalAchievementRate(historyData: ModuleHistory[]): number {
    // Placeholder - would need actual goal tracking
    const highPerformanceSessions = historyData.filter(s => s.finalScore >= 80).length;
    return (highPerformanceSessions / Math.max(1, historyData.length)) * 100;
  }

  private forecastPerformance(historyData: ModuleHistory[], sessions: number): PerformanceForecast[] {
    const forecasts: PerformanceForecast[] = [];
    const recentScores = historyData.slice(0, 10).map(s => s.finalScore);
    const trend = recentScores.length > 1 ? (recentScores[0] - recentScores[recentScores.length - 1]) / recentScores.length : 0;
    const baseScore = recentScores[0] || 50;
    
    for (let i = 1; i <= sessions; i++) {
      forecasts.push({
        sessionNumber: i,
        predictedScore: Math.max(0, Math.min(100, baseScore + (trend * i))),
        confidence: Math.max(0.3, 0.9 - (i * 0.1)),
        date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)) // Next i days
      });
    }
    
    return forecasts;
  }

  private assessForgettingRisk(historyData: ModuleHistory[]): RiskAssessment[] {
    const moduleGroups = this.groupByModule(historyData);
    const assessments: RiskAssessment[] = [];
    
    for (const [moduleName, sessions] of Object.entries(moduleGroups)) {
      const lastSession = sessions[0];
      const daysSinceLastSession = (Date.now() - new Date(lastSession.completedAt).getTime()) / (1000 * 60 * 60 * 24);
      const forgettingRisk = Math.min(100, daysSinceLastSession * 5); // Risk increases over time
      
      assessments.push({
        concept: moduleName,
        forgettingRisk,
        interventionNeeded: forgettingRisk > 50,
        recommendedAction: forgettingRisk > 50 ? 'Review immediately' : 'Continue regular practice'
      });
    }
    
    return assessments;
  }

  private calculateOptimalChallengeLevel(historyData: ModuleHistory[]): number {
    const recentPerformance = historyData.slice(0, 5);
    const avgScore = recentPerformance.reduce((sum, s) => sum + s.finalScore, 0) / Math.max(1, recentPerformance.length);
    
    // Optimal challenge based on performance
    if (avgScore >= 85) return 4; // High difficulty
    if (avgScore >= 70) return 3; // Medium-high
    if (avgScore >= 55) return 2; // Medium
    return 1; // Low difficulty
  }

  private optimizeLearningPath(historyData: ModuleHistory[]): PathOptimization[] {
    const moduleGroups = this.groupByModule(historyData);
    const optimizations: PathOptimization[] = [];
    
    // Simple optimization based on performance
    const sortedModules = Object.entries(moduleGroups)
      .map(([name, sessions]) => ({
        name,
        avgScore: sessions.reduce((sum, s) => sum + s.finalScore, 0) / sessions.length
      }))
      .sort((a, b) => a.avgScore - b.avgScore); // Weakest first
    
    for (let i = 0; i < sortedModules.length - 1; i++) {
      optimizations.push({
        currentModule: sortedModules[i].name,
        nextModule: sortedModules[i + 1].name,
        optimalSequence: [sortedModules[i].name, sortedModules[i + 1].name],
        expectedOutcome: (sortedModules[i].avgScore + sortedModules[i + 1].avgScore) / 2
      });
    }
    
    return optimizations;
  }

  private estimateTimeToMasteryAll(historyData: ModuleHistory[]): MasteryEstimate[] {
    const moduleGroups = this.groupByModule(historyData);
    const estimates: MasteryEstimate[] = [];
    
    for (const [moduleName, sessions] of Object.entries(moduleGroups)) {
      const avgScore = sessions.reduce((sum, s) => sum + s.finalScore, 0) / sessions.length;
      const progressRate = this.calculateProgressRate(sessions);
      
      let estimatedDays = 0;
      if (avgScore < 85 && progressRate > 0) {
        estimatedDays = Math.ceil((85 - avgScore) / Math.max(0.1, progressRate));
      }
      
      estimates.push({
        concept: moduleName,
        estimatedDays: Math.min(999, estimatedDays),
        confidence: sessions.length > 3 ? 0.8 : 0.5,
        prerequisitesMet: avgScore > 40
      });
    }
    
    return estimates;
  }

  private formatModuleName(moduleName: string): string {
    return moduleName
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Math Facts', 'Math Facts:')
      .replace('_', ' ');
  }
}