import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Question } from '@shared/schema';

interface UseQuestionWithHistoryReturn {
  question: Question | null;
  loading: boolean;
  error: Error | null;
  fetchNewQuestion: (excludeCurrentQuestion?: boolean) => Promise<void>;
  seenQuestions: number[];
}

/**
 * Custom hook for fetching questions - minimal version with no duplicate detection
 * to avoid infinite loops
 * 
 * @param grade The grade level to fetch questions for
 * @param category Optional category to filter questions
 * @returns Object containing the current question, loading state, and functions to fetch new questions
 */
export function useQuestionWithHistory(
  grade: string,
  category?: string
): UseQuestionWithHistoryReturn {
  // Just keep a record but don't use for filtering
  const [seenQuestions, setSeenQuestions] = useState<number[]>([]);
  
  // Build a query key that includes grade and category
  const queryKey = category 
    ? ['/api/questions/next', grade, category] 
    : ['/api/questions/next', grade];
  
  // State to trigger query refetching
  const [fetchTrigger, setFetchTrigger] = useState(0);
  
  // Fetch a question - with no duplicate detection
  const { data, isLoading, error } = useQuery<Question>({
    queryKey: [...queryKey, fetchTrigger],
    queryFn: async () => {
      // Build query params
      let url = `/api/questions/next?grade=${grade}`;
      
      if (category) {
        url += `&category=${category}`;
      }
      
      // Add a randomizing parameter to prevent cache
      url += `&random=${Math.random()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch question: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Just record seen questions but don't filter by them
      if (data.id) {
        setSeenQuestions(prev => [...prev.slice(-19), data.id]);
      }
      
      return data;
    },
    refetchOnWindowFocus: false
  });
  
  // Function to fetch a new question
  const fetchNewQuestion = async () => {
    // Just trigger a refetch by incrementing the trigger
    setFetchTrigger(prev => prev + 1);
  };

  return {
    question: data || null,
    loading: isLoading,
    error: error as Error,
    fetchNewQuestion,
    seenQuestions
  };
}