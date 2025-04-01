import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Question } from '@shared/schema';

interface UseQuestionWithHistoryReturn {
  question: Question | null;
  loading: boolean;
  error: Error | null;
  fetchNewQuestion: (excludeCurrentQuestion?: boolean) => Promise<void>;
  seenQuestions: number[];
}

interface QueryParams {
  grade: string;
  category?: string;
  exclude: string;
  forceDynamic: boolean;
}

interface ApiResponse {
  question: Question;
}

/**
 * Custom hook for fetching questions while avoiding repetition
 * 
 * @param grade The grade level to fetch questions for
 * @param category Optional category to filter questions
 * @returns Object containing the current question, loading state, and functions to fetch new questions
 */
export function useQuestionWithHistory(
  grade: string,
  category?: string
): UseQuestionWithHistoryReturn {
  const [seenQuestions, setSeenQuestions] = useState<number[]>([]);
  const queryClient = useQueryClient();
  
  // Build a query key that includes grade and category
  const queryKey = category 
    ? ['/api/questions/next', grade, category]
    : ['/api/questions/next', grade];
  
  // State to trigger query refetching
  const [fetchTrigger, setFetchTrigger] = useState(0);
  
  // Initialize a questoin reference for the getQueryParams function
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // Prepare parameters for API request
  const getQueryParams = (excludeCurrentQuestion: boolean = false): QueryParams => {
    // Convert seen question IDs into a comma-separated string
    const excludeIds = excludeCurrentQuestion && currentQuestion?.id 
      ? [...seenQuestions, currentQuestion.id].join(',')
      : seenQuestions.join(',');
    
    return {
      grade,
      category,
      exclude: excludeIds,
      forceDynamic: seenQuestions.length > 15 // Force dynamic generation if we've seen many questions
    };
  };
  
  // Fetch a question
  const { data, isLoading, error } = useQuery<{ question: Question } | Question, Error>({ 
    queryKey: [...queryKey, fetchTrigger],
    queryFn: async ({ signal }): Promise<Question> => {
      // Build query string
      const params = new URLSearchParams(getQueryParams() as Record<string, string>);
      
      // Make the request
      const response = await fetch(`/api/questions/next?${params.toString()}`, { signal });
      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }
      
      // Handle both response formats: { question: Question } or Question directly
      const responseData = await response.json();
      return responseData.question || responseData;
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // Questions are fresh for 5 minutes
  });
  
  const question = data ?? null;
  
  // Update the currentQuestion reference when data changes
  useEffect(() => {
    if (question) {
      setCurrentQuestion(question);
    }
  }, [question]);
  
  // Update seen questions when we get a new question
  useEffect(() => {
    if (question && !seenQuestions.includes(question.id)) {
      setSeenQuestions(prev => [...prev, question.id].slice(-20)); // Keep last 20 seen questions
    }
  }, [question]);
  
  // Function to fetch a new question
  const fetchNewQuestion = async (excludeCurrentQuestion: boolean = true): Promise<void> => {
    // Invalidate the current query to force a refetch
    await queryClient.invalidateQueries({ queryKey });
    
    // Increment fetch trigger to cause a refetch with new parameters
    setFetchTrigger(prev => prev + 1);
  };
  
  return {
    question,
    loading: isLoading,
    error,
    fetchNewQuestion,
    seenQuestions
  };
}