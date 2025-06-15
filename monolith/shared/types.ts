import { z } from "zod";

// Core recommendation types
export interface UserProfile {
  id: number;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  learningStyle: string;
  performanceHistory: PerformanceRecord[];
  conceptMastery: ConceptMastery[];
}

export interface PerformanceRecord {
  questionId: number;
  category: string;
  difficulty: number;
  correct: boolean;
  timeSpent: number;
  timestamp: Date;
  concepts: string[];
}

export interface ConceptMastery {
  concept: string;
  mastery: number; // 0-1 scale
  confidence: number; // 0-1 scale
  lastPracticed: Date;
  practiceCount: number;
}

export interface QuestionRecommendation {
  questionId: number;
  score: number; // Recommendation confidence 0-1
  reasoning: string;
  category: string;
  difficulty: number;
  concepts: string[];
  recommendationType: RecommendationType;
  priority: Priority;
}

export enum RecommendationType {
  REVIEW = "review",           // Review weak concepts
  ADVANCE = "advance",         // Progress to new material
  REINFORCE = "reinforce",     // Strengthen existing knowledge
  CHALLENGE = "challenge",     // Push boundaries
  REMEDIATE = "remediate"      // Fill knowledge gaps
}

export enum Priority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low"
}

export interface RecommendationRequest {
  userId: number;
  sessionType?: "practice" | "assessment" | "review";
  maxQuestions?: number;
  targetDifficulty?: number;
  focusConcepts?: string[];
  excludeQuestionIds?: number[];
}

export interface RecommendationResponse {
  recommendations: QuestionRecommendation[];
  sessionMetadata: SessionMetadata;
  adaptiveSettings: AdaptiveSettings;
}

export interface SessionMetadata {
  sessionId: string;
  userId: number;
  startTime: Date;
  estimatedDuration: number; // minutes
  targetConcepts: string[];
  difficultyRange: [number, number];
}

export interface AdaptiveSettings {
  initialDifficulty: number;
  difficultyAdjustmentRate: number;
  masteryThreshold: number;
  spacedRepetitionInterval: number;
}

export interface FeedbackData {
  sessionId: string;
  questionId: number;
  correct: boolean;
  timeSpent: number;
  difficultyRating?: number; // User perceived difficulty 1-5
  engagementRating?: number; // User engagement 1-5
}

export interface LearningPathNode {
  concept: string;
  prerequisites: string[];
  difficulty: number;
  estimatedTime: number;
  questions: number[];
}

export interface PersonalizationFactors {
  accuracyWeight: number;
  speedWeight: number;
  engagementWeight: number;
  diversityWeight: number;
  challengeWeight: number;
}

// Validation schemas
export const RecommendationRequestSchema = z.object({
  userId: z.number(),
  sessionType: z.enum(["practice", "assessment", "review"]).optional(),
  maxQuestions: z.number().min(1).max(50).optional(),
  targetDifficulty: z.number().min(1).max(5).optional(),
  focusConcepts: z.array(z.string()).optional(),
  excludeQuestionIds: z.array(z.number()).optional()
});

export const FeedbackDataSchema = z.object({
  sessionId: z.string(),
  questionId: z.number(),
  correct: z.boolean(),
  timeSpent: z.number().min(0),
  difficultyRating: z.number().min(1).max(5).optional(),
  engagementRating: z.number().min(1).max(5).optional()
});

export type RecommendationRequestType = z.infer<typeof RecommendationRequestSchema>;
export type FeedbackDataType = z.infer<typeof FeedbackDataSchema>;