import { useState, useRef } from 'react';
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
  const retryAttemptsRef = useRef<number>(0);
  const maxRetryAttempts = 3; // Maximum number of attempts to avoid duplicates
  
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
      
      // Only exclude questions if we haven't hit the retry limit
      if (seenQuestions.length > 0 && retryAttemptsRef.current < maxRetryAttempts) {
        url += `&exclude=${seenQuestions.join(',')}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch question: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check for duplicate questions
      if (data.id && seenQuestions.includes(data.id)) {
        retryAttemptsRef.current++;
        
        if (retryAttemptsRef.current < maxRetryAttempts) {
          console.log("Duplicate question detected in current session, fetching new one");
          // Only retry if we haven't exceeded the maximum
          setFetchTrigger(prev => prev + 1);
          return data; // Return current data to avoid flickering while retrying
        } else {
          // If we've hit the retry limit, accept the duplicate and reset the counter
          console.log(`Hit retry limit (${maxRetryAttempts}), accepting duplicate question`);
          retryAttemptsRef.current = 0;
        }
      } else {
        // Not a duplicate, reset retry counter
        retryAttemptsRef.current = 0;
      }
      
      // Add to seen questions list
      if (data.id && !seenQuestions.includes(data.id)) {
        setSeenQuestions(prev => {
          // Limit to last 5 seen questions to prevent the list from growing too large
          // Also reduced from 20 to 5 to make it more likely we'll see repeats when there are few questions
          if ([...prev, data.id].length > 5) {
            return [...prev, data.id].slice(-5);
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
    // Reset retry counter when explicitly fetching a new question
    retryAttemptsRef.current = 0;
    
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