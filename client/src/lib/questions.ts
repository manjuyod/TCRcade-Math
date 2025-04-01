import { Question, User, Recommendation } from "@shared/schema";
import { apiRequest } from "./queryClient";
import { useState, useEffect, useRef } from 'react';

// Track recently seen questions in memory to prevent duplicates
// This is a global cache that persists between component renders and React re-renders
const globalSeenQuestions = new Set<number>();

/**
 * Improved version - fetch a question with robust multi-layered duplicate prevention
 * - Uses client-side tracking of seen questions using globalSeenQuestions Set
 * - Sends excludeIds to server to avoid specific questions
 * - Leverages server-side session tracking of previously seen questions
 * - Supports forced dynamic question generation
 */
export async function fetchQuestion(
  excludeIds: number[] = [], 
  forceDynamic: boolean = false, 
  category?: string, 
  grade: string = '3'
): Promise<Question> {
  // Build params
  let params = new URLSearchParams();
  
  // Add category parameter if specified
  if (category && category !== 'all') {
    params.append('category', category);
  }
  
  // Add grade parameter
  params.append('grade', grade);
  
  // Add dynamic generation parameter
  params.append('forceDynamic', forceDynamic ? 'true' : 'false');
  
  // Include ALL excluded IDs from both params and our global cache
  // This provides multi-layered duplicate prevention
  const allExcludeIds = [...excludeIds, ...Array.from(globalSeenQuestions)];
  if (allExcludeIds.length > 0) {
    params.append('exclude', allExcludeIds.join(','));
  }
  
  // Add timestamp to prevent caching
  params.append('_t', Date.now().toString());
  
  // Make the request
  const response = await fetch(`/api/questions/next?${params.toString()}`, {
    credentials: 'include',
    cache: 'no-store' // Explicitly prevent browser caching
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch question');
  }
  
  const data = await response.json();
  
  // Extract the actual question from response
  const question = data.question || data;
  
  // Add question ID to global seen list to prevent duplicates
  if (question && typeof question.id === 'number') {
    globalSeenQuestions.add(data.question.id);
  }
  
  // Return the question
  if (data.question) {
    return data.question;
  }
  
  return data;
}

/**
 * Custom hook for fetching questions with duplicate prevention
 * Uses both server-side and client-side tracking of seen questions
 */
export function useQuestionWithHistory(initialGrade = '3', initialCategory?: string) {
  // Question state
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Parameters
  const [grade, setGrade] = useState(initialGrade);
  const [category, setCategory] = useState(initialCategory);
  
  // Track locally seen questions (component specific)
  const [seenQuestions, setSeenQuestions] = useState<number[]>([]);
  const seenQuestionsRef = useRef<Set<number>>(new Set());
  
  // Keep track of retry attempts
  const retryCount = useRef(0);
  const maxRetries = 5;
  
  // Function to fetch a new question with duplicate prevention
  const fetchNewQuestion = async (forceFresh = false) => {
    setLoading(true);
    setError(null);
    retryCount.current = 0;
    
    try {
      let newQuestion: Question | null = null;
      let isDuplicate = false;
      
      // Try up to maxRetries times to get a non-duplicate question
      do {
        // If we're already retrying, force dynamic to get new questions
        const shouldForceDynamic = forceFresh || retryCount.current > 0;
        
        // Get current question's ID for exclusion
        const currentId = question?.id;
        const idsToExclude = currentId ? [currentId] : [];
        
        // Fetch a question
        newQuestion = await fetchQuestion(
          idsToExclude,
          shouldForceDynamic,
          category,
          grade
        );
        
        // Check if this is a duplicate question (already seen in this session)
        isDuplicate = newQuestion ? 
          seenQuestionsRef.current.has(newQuestion.id) : false;
        
        if (isDuplicate) {
          console.log("Duplicate question detected, fetching new one");
          retryCount.current++;
        }
      } while (isDuplicate && retryCount.current < maxRetries);
      
      // If we have a question, update state
      if (newQuestion) {
        // Add to seen questions
        seenQuestionsRef.current.add(newQuestion.id);
        
        // Update state
        setQuestion(newQuestion);
        setSeenQuestions(prev => [newQuestion.id, ...prev].slice(0, 50));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchNewQuestion();
  }, [grade, category]); // Re-fetch when grade or category changes
  
  return {
    question,
    loading,
    error,
    fetchNewQuestion,
    setGrade,
    setCategory,
    seenQuestions
  };
}

// Fetch personalized recommendations for the user
export async function fetchRecommendations(regenerate: boolean = false): Promise<Recommendation> {
  const queryParams = regenerate ? '?regenerate=true' : '';
  
  const response = await fetch(`/api/recommendations${queryParams}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch recommendations');
  }
  
  return await response.json();
}

// Submit an answer to a question
export async function submitAnswer(questionId: number, answer: string): Promise<{
  correct: boolean;
  tokensEarned: number;
  totalTokens: number;
  correctAnswer: string;
}> {
  const response = await apiRequest('POST', '/api/answer', {
    questionId,
    answer
  });
  
  return await response.json();
}

// Get difficulty label based on question difficulty (1-5)
export function getDifficultyLabel(difficulty: number): string {
  switch(difficulty) {
    case 1:
      return "Easy";
    case 2:
      return "Basic";
    case 3:
      return "Medium";
    case 4:
      return "Advanced";
    case 5:
      return "Expert";
    default:
      return "Unknown";
  }
}

// Get category display name
export function getCategoryLabel(category: string): string {
  const categories: Record<string, string> = {
    "addition": "Addition",
    "subtraction": "Subtraction",
    "multiplication": "Multiplication",
    "division": "Division",
    "fractions": "Fractions",
    "geometry": "Geometry",
    "time": "Time",
    "money": "Money"
  };
  
  return categories[category] || category;
}

// Calculate appropriate token reward based on difficulty and user grade
export function calculateTokenReward(difficulty: number, userGrade: string): number {
  // Base reward is difficulty level * 2
  let reward = difficulty * 2;
  
  // Adjust based on grade level
  const gradeMap: Record<string, number> = {
    "K": 1,
    "1": 2,
    "2": 3,
    "3": 4,
    "4": 5,
    "5": 6,
    "6": 7
  };
  
  // Higher grades get slightly decreased rewards for same difficulty
  const gradeModifier = gradeMap[userGrade] || 1;
  reward = Math.max(1, Math.min(10, reward - Math.floor(gradeModifier / 3)));
  
  return reward;
}
