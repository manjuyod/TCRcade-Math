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
  // This provides multi-layered duplicate prevention with strong randomization
  const allExcludeIds = [...excludeIds, ...Array.from(globalSeenQuestions.values())];
  
  // Only include the exclude parameter if we actually have IDs to exclude
  // This prevents issues where the server side might misinterpret an empty string
  if (allExcludeIds.length > 0) {
    params.append('exclude', allExcludeIds.join(','));
  }
  
  // Add timestamp to prevent caching and add some randomness to request
  params.append('_t', Date.now().toString() + Math.floor(Math.random() * 1000));
  
  // Explicitly request dynamic generation for better variety after user has seen several questions
  // or when forceDynamic is true
  if (forceDynamic || globalSeenQuestions.size > 5) {
    params.append('forceDynamic', 'true');
  }
  
  // Special Math Facts handling - use the non-authenticated endpoint
  let url = '/api/questions/next';
  
  // If this is a Math Facts module, use our specialized endpoint that doesn't require auth
  if (category && category.startsWith('math-facts-')) {
    const operation = category.split('-').pop();
    url = `/api/questions/math-facts?grade=${grade}&operation=${operation}`;
    console.log(`Using direct Math Facts endpoint for ${operation} module`);
  } else {
    url = `/api/questions/next?${params.toString()}`;
  }
  
  // Make the request
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store' // Explicitly prevent browser caching
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch question');
  }
  
  const data = await response.json();
  
  // Extract the actual question from response
  const question = data.question || data;
  
  // Add question ID to global seen list to prevent duplicates in future requests
  if (question && typeof question.id === 'number') {
    globalSeenQuestions.add(question.id);
    console.log(`Added question ID ${question.id} to global seen list (total: ${globalSeenQuestions.size})`);
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
      
      // Special handling for Math Facts modules - try direct endpoint first
      if (category && category.startsWith('math-facts-')) {
        console.log(`Math Facts module detected (${category}), using direct endpoint`);
        
        try {
          // Extract the operation from the category (math-facts-addition -> addition)
          const operation = category.split('-').pop();
          
          // Directly fetch from our specialized non-authenticated endpoint
          const url = `/api/questions/math-facts?grade=${grade}&operation=${operation}&_t=${Date.now()}`;
          console.log(`Fetching Math Facts directly from: ${url}`);
          
          const response = await fetch(url, {
            cache: 'no-store'
          });
          
          if (response.ok) {
            newQuestion = await response.json();
            console.log(`Successfully fetched Math Facts question: ${newQuestion?.question?.text || 'Unknown'}`);
            // Early return with the Math Facts question
            setQuestion(newQuestion);
            setLoading(false);
            return;
          } else {
            console.error(`Failed to fetch Math Facts directly: ${response.status}`);
            // Continue with normal flow if direct fetch fails
          }
        } catch (mathFactsError) {
          console.error('Error in direct Math Facts fetch:', mathFactsError);
          // Continue with normal flow if direct fetch fails
        }
      }
      
      // Try up to maxRetries times to get a non-duplicate question
      do {
        // If we're already retrying, force dynamic to get new questions
        const shouldForceDynamic = forceFresh || retryCount.current > 0;
        
        // Get current question ID and ALL session question IDs for exclusion
        // Include both the current component's seen questions AND the global seen questions set
        const sessionSeenIds = Array.from(seenQuestionsRef.current.values());
        
        if (question?.id) {
          sessionSeenIds.push(question.id);
        }
        
        // Make sure we have a unique set of IDs to exclude
        // Create a temporary regular array and then convert back to avoid Set iteration issues
        const tempSet = new Set(sessionSeenIds);
        const uniqueIdsToExclude = Array.from(tempSet);
        
        // Log exclusion info for debugging
        console.log(`Fetching question with ${uniqueIdsToExclude.length} excluded IDs, forceDynamic=${shouldForceDynamic}`);
        
        // Fetch a question with our improved exclusion mechanism
        newQuestion = await fetchQuestion(
          uniqueIdsToExclude,
          shouldForceDynamic,
          category,
          grade
        );
        
        // Check if this is a duplicate question (already seen in this session)
        // But don't consider it a duplicate if we're on retry #2+ to avoid infinite loops
        isDuplicate = newQuestion && retryCount.current < 2 ? 
          seenQuestionsRef.current.has(newQuestion.id) : false;
        
        if (isDuplicate) {
          console.log(`Question ${newQuestion?.id} is a duplicate, retrying (attempt ${retryCount.current + 1})`);
          retryCount.current++;
        } else if (newQuestion) {
          // Question is unique or we're past retry #2, accept it
          console.log(`Accepting question ${newQuestion.id} (isDuplicate: ${isDuplicate}, retries: ${retryCount.current})`);
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
export async function submitAnswer(
  questionId: number, 
  answer: string, 
  originalAnswer?: string,
  originalQuestion?: string
): Promise<{
  correct: boolean;
  tokensEarned: number;
  totalTokens: number;
  correctAnswer: string;
}> {
  // For dynamically generated questions, we need to pass the original answer
  // to ensure proper validation
  const response = await apiRequest('POST', '/api/answer', {
    questionId,
    answer,
    originalAnswer, // Pass the expected correct answer to the server
    originalQuestion // Pass the original question text for reference
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
