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
  
  // Fetch a question
  const { data, isLoading, error } = useQuery<Question, Error>({ 
    queryKey: [...queryKey, fetchTrigger],
    queryFn: async () => {
      // Build query string
      const params = new URLSearchParams();
      params.append('grade', grade);
      if (category) params.append('category', category);
      
      // Add excluded question IDs
      if (seenQuestions.length > 0) {
        params.append('exclude', seenQuestions.join(','));
      }
      
      // Force dynamic generation after we've seen many questions
      if (seenQuestions.length > 15) {
        params.append('forceDynamic', 'true');
      }
      
      // Make the request
      const response = await fetch(`/api/questions/next?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No questions available for the current grade and category');
        }
        throw new Error(`Failed to fetch question: ${response.status}`);
      }
      
      // Parse the response
      const responseData = await response.json();
      
      // Handle both response formats: { question: Question } or Question directly
      return responseData.question || responseData;
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // Questions are fresh for 5 minutes
    retry: false // Don't retry failed requests automatically
  });
  
  const question = data || null;
  
  // Update seen questions when we get a new question
  useEffect(() => {
    if (question && !seenQuestions.includes(question.id)) {
      setSeenQuestions(prev => [...prev, question.id].slice(-20)); // Keep last 20 seen questions
    }
  }, [question]);
  
  // Function to fetch a new question
  const fetchNewQuestion = async (excludeCurrentQuestion: boolean = true): Promise<void> => {
    // If we need to exclude the current question, add it to the seen list first
    if (excludeCurrentQuestion && question) {
      setSeenQuestions(prev => 
        prev.includes(question.id) ? prev : [...prev, question.id].slice(-20)
      );
    }
    
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