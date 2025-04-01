import { useState } from 'react';
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
  const { data, isLoading, error } = useQuery<Question>({
    queryKey: [...queryKey, fetchTrigger],
    queryFn: async () => {
      // Build query params
      let url = `/api/questions/next?grade=${grade}`;
      
      if (category) {
        url += `&category=${category}`;
      }
      
      if (seenQuestions.length > 0) {
        url += `&exclude=${seenQuestions.join(',')}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch question: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add to seen questions list to prevent duplicates
      if (data.id && !seenQuestions.includes(data.id)) {
        setSeenQuestions(prev => {
          // Limit to last 20 seen questions to prevent the list from growing too large
          if ([...prev, data.id].length > 20) {
            return [...prev, data.id].slice(-20);
          }
          return [...prev, data.id];
        });
      }
      
      return data;
    },
    refetchOnWindowFocus: false
  });
  
  // Function to fetch a new question
  const fetchNewQuestion = async (excludeCurrentQuestion?: boolean) => {
    // If we have a current question and want to exclude it
    if (excludeCurrentQuestion && data?.id) {
      if (!seenQuestions.includes(data.id)) {
        setSeenQuestions(prev => [...prev, data.id]);
      }
    }
    
    // Trigger a refetch with the updated seenQuestions
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