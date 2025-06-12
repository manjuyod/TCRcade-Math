export const ALGEBRA_CONFIG = {
  minGrade: 6,
  maxGrade: 8,
  practiceQuestionCount: 5,
  tokenRunRegularCount: 4,
  tokenRunChallengeCount: 1,
  passingScore: 0.8, // 80%
  perfectScore: 1.0, // 100%
  tokensForPassing: 5,
  tokensForPerfect: 8,
  attemptsToLevelChange: 3
};

export interface AlgebraSessionResult {
  questionsAnswered: number;
  correctAnswers: number;
  score: number;
  tokensEarned: number;
  timeSpent: number;
  runType: 'practice' | 'token';
  gradeLevel: number;
  lesson: number;
}

export interface AlgebraQuestion {
  id: number;
  GradeLevel: number;
  Lesson: number;
  Title: string;
  Section: string;
  Type: string;
  AnswerBank: any;
  CorrectAnswer: string;
  category: string;
}

export interface QuestionQueryParams {
  grade_level: number;
  lesson: number;
}

// Text parsing utilities for algebra questions
export const parseAlgebraText = (text: any): string => {
  if (!text) return '';
  
  // Convert to string if not already a string
  const textStr = typeof text === 'string' ? text : String(text);
  
  // Handle superscript notation: convert ^number and ^? to superscript
  return textStr.replace(/\^(\d+|\?)/g, '<sup>$1</sup>');
};

// Answer parsing utilities
export const parseAlgebraAnswer = (answer: string): string[] => {
  if (!answer) return [];
  
  // If answer starts with [ and ends with ], treat as JSON array
  if (answer.startsWith('[') && answer.endsWith(']')) {
    try {
      const parsed = JSON.parse(answer);
      return Array.isArray(parsed) ? parsed : [answer];
    } catch (e) {
      // If JSON parsing fails, return as single answer without brackets
      return [answer.slice(1, -1)];
    }
  }
  
  return [answer];
};

// Check if user answer matches any acceptable answers
export const checkAlgebraAnswer = (userAnswer: string, correctAnswers: string[]): boolean => {
  if (!userAnswer || !correctAnswers.length) return false;
  
  const normalizedUserAnswer = userAnswer.trim().toLowerCase();
  
  return correctAnswers.some(answer => {
    const normalizedAnswer = answer.trim().toLowerCase();
    return normalizedUserAnswer === normalizedAnswer;
  });
};