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
    queryFn: async ({ signal }) => {
      try {
        // Build query string
        const params = new URLSearchParams();
        
        // Add parameters one by one to ensure type safety
        params.append('grade', grade);
        if (category) params.append('category', category);
        if (seenQuestions.length > 0) params.append('exclude', seenQuestions.join(','));
        if (seenQuestions.length > 15) params.append('forceDynamic', 'true');
        
        // Make the request, but check if signal is aborted before using it
        // This helps prevent the "signal is aborted without reason" error
        const controller = new AbortController();
        const requestSignal = signal || controller.signal;
        
        if (requestSignal.aborted) {
          console.log('Request was already aborted');
          throw new Error('Request was aborted');
        }
        
        const response = await fetch(`/api/questions/next?${params.toString()}`, { 
          signal: requestSignal,
          credentials: 'include'
        });
        
        // Handle 404 errors specifically - these mean no questions were found
        if (response.status === 404) {
          console.warn('No questions found for the current criteria - try a different grade or category');
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch question: ${response.status}`);
        }
        
        // Handle both response formats: { question: Question } or Question directly
        const responseData = await response.json();
        return responseData.question || responseData;
      } catch (error) {
        // Ignore AbortError as it's expected when components unmount
        if (error.name === 'AbortError') {
          console.log('Request was aborted');
          return null;
        }
        throw error;
      }
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
  
  // Function to fetch a new question with improved abort handling
  const fetchNewQuestion = async (excludeCurrentQuestion: boolean = true): Promise<void> => {
    try {
      // Create a new controller for each fetch to prevent signal already aborted errors
      const controller = new AbortController();
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('grade', grade);
      if (category) params.append('category', category);
      
      // Handle exclusions - first our seen questions, then the current one if needed
      let excludeIds = [...seenQuestions];
      if (excludeCurrentQuestion && currentQuestion?.id) {
        excludeIds.push(currentQuestion.id);
      }
      
      // Add to query params if we have exclusions
      if (excludeIds.length > 0) {
        params.append('exclude', excludeIds.join(','));
      }
      
      // Force dynamic generation after we've seen several questions
      if (seenQuestions.length > 15 || excludeCurrentQuestion) {
        params.append('forceDynamic', 'true');
      }
      
      // Manually fetch instead of invalidating to have more control
      const response = await fetch(`/api/questions/next?${params.toString()}`, {
        signal: controller.signal,
        credentials: 'include'
      });
      
      // Process the response
      if (response.ok) {
        const data = await response.json();
        const newQuestion = data.question || data;
        
        // Update the cache with the new question
        queryClient.setQueryData([...queryKey, fetchTrigger], newQuestion);
        
        // Increment the fetch trigger for the next fetch
        setFetchTrigger(prev => prev + 1);
      } else if (response.status === 404) {
        // Handle case where no questions are available
        console.warn('No questions found for the current criteria');
        queryClient.setQueryData([...queryKey, fetchTrigger], null);
        setFetchTrigger(prev => prev + 1);
      } else {
        throw new Error(`Failed to fetch question: ${response.status}`);
      }
    } catch (error) {
      // Don't report aborted requests as they're expected
      if (error.name !== 'AbortError') {
        console.error('Error fetching new question:', error);
      }
    }
  };
  
  return {
    question,
    loading: isLoading,
    error,
    fetchNewQuestion,
    seenQuestions
  };
}