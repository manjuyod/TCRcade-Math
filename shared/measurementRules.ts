export interface MeasurementConfig {
  minGrade: number;
  maxGrade: number;
  questionsPerSession: number;
  passingScore: number;
  tokens: {
    passing: number;
    perfect: number;
  };
  attempts: {
    levelUpThreshold: number;
    levelDownThreshold: number;
  };
}

export const MEASUREMENT_CONFIG: MeasurementConfig = {
  minGrade: 2,
  maxGrade: 5,
  questionsPerSession: 5,
  passingScore: 80,
  tokens: {
    passing: 5,
    perfect: 8
  },
  attempts: {
    levelUpThreshold: 3,
    levelDownThreshold: 3
  }
};

export interface MeasurementQuestion {
  id: number;
  GradeLevel: number;
  Lesson: number;
  Title: string;
  Section: string;
  Type: string;
  AnswerBank: {
    question: {
      text: string;
      svg: string | null;
    };
    options: Array<{
      label: string;
      text: string;
      svg: string | null;
    }>;
  };
  CorrectAnswer: string | string[];
}

export interface MeasurementProgress {
  lesson: number;
  attempt_good: number;
  attempt_bad: number;
  best_score: number;
  best_time: number | null;
  test_taken: boolean;
  last_played: string | null;
  mastery_level: boolean;
  tokens_earned: number;
  correct_answers: number;
  sessions_completed: number;
  total_questions_answered: number;
}

export interface MeasurementProgressResult {
  grade_level: number;
  lesson: number;
}

export interface MeasurementUserData {
  grade_level: number;
  progress: MeasurementProgress;
}

export type MeasurementRunType = 'practice' | 'token';

export interface MeasurementSessionResult {
  correct: number;
  total: number;
  score: number;
  tokensEarned: number;
  levelChanged: boolean;
  newLevel?: number;
  levelDirection?: 'up' | 'down';
}