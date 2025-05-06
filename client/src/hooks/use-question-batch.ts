import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Question } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

const QUESTION_BATCH_CACHE_KEY = 'question_batch_cache';

interface BatchCacheEntry {
  moduleId: string;
  grade: string;
  questions: Question[];
  timestamp: number;
}

interface UseQuestionBatchReturn {
  /** All loaded questions for the module */
  questions: Question[];
  /** Current question being shown to the user */
  currentQuestion: Question | null;
  /** Current position in the batch */
  currentIndex: number;
  /** Whether questions are being loaded */
  loading: boolean;
  /** Error that occurred during loading */
  error: Error | null;
  /** Move to the next question in the batch */
  nextQuestion: () => void;
  /** Move to the previous question in the batch */
  previousQuestion: () => void;
  /** Go to a specific question by index */
  goToQuestion: (index: number) => void;
  /** Refetch the questions */
  refetchQuestions: () => Promise<void>;
  /** Whether more questions are available */
  hasNextQuestion: boolean;
  /** Whether previous questions are available */
  hasPreviousQuestion: boolean;
}

/**
 * Hook for preloading and managing a batch of questions for a module
 */
export function useQuestionBatch(
  moduleId: string,
  batchSize: number = 20
): UseQuestionBatchReturn {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load cached questions from localStorage if available
  const loadCachedQuestions = (moduleId: string): Question[] | null => {
    try {
      const cacheJson = localStorage.getItem(QUESTION_BATCH_CACHE_KEY);
      if (cacheJson) {
        const cache: BatchCacheEntry = JSON.parse(cacheJson);
        
        // Check if cache is for the current module
        if (cache.moduleId === moduleId) {
          // Check if cache is still fresh (less than 30 minutes old)
          const cacheAge = Date.now() - cache.timestamp;
          const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
          
          if (cacheAge < CACHE_TTL && cache.questions.length > 0) {
            console.log(`Using cached ${cache.questions.length} questions for module ${moduleId}`);
            return cache.questions;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load question batch cache:", e);
    }
    
    return null;
  };

  // Cache questions to localStorage
  const cacheQuestions = (moduleId: string, questions: Question[]) => {
    try {
      const cacheEntry: BatchCacheEntry = {
        moduleId,
        grade: user?.grade || '3',
        questions,
        timestamp: Date.now()
      };
      
      localStorage.setItem(QUESTION_BATCH_CACHE_KEY, JSON.stringify(cacheEntry));
      console.log(`Cached ${questions.length} questions for module ${moduleId}`);
    } catch (e) {
      console.warn("Failed to cache question batch:", e);
    }
  };

  // Mutation for loading questions in batch
  const batchLoadMutation = useMutation({
    mutationFn: async (params: { moduleId: string, count: number }) => {
      const grade = user?.grade || '3';
      const url = `/api/questions/batch?grade=${grade}&category=${params.moduleId}&count=${params.count}`;
      
      const response = await apiRequest('GET', url);
      if (!response.ok) {
        throw new Error('Failed to load question batch');
      }
      
      const data = await response.json();
      return data.questions as Question[];
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        console.log(`Successfully loaded batch of ${data.length} questions`);
        setQuestions(data);
        setCurrentIndex(0);
        cacheQuestions(moduleId, data);
      } else {
        setError(new Error('No questions received in batch'));
      }
      setLoading(false);
    },
    onError: (error: Error) => {
      console.error('Error loading question batch:', error);
      setError(error);
      setLoading(false);
    }
  });

  // Load questions when module changes
  useEffect(() => {
    if (!moduleId) return;
    
    setLoading(true);
    setError(null);
    
    // Try to use cached questions first
    const cachedQuestions = loadCachedQuestions(moduleId);
    if (cachedQuestions) {
      setQuestions(cachedQuestions);
      setCurrentIndex(0);
      setLoading(false);
      return;
    }
    
    // Otherwise fetch a new batch
    batchLoadMutation.mutate({ moduleId, count: batchSize });
  }, [moduleId, batchSize]);

  // Function to refetch questions
  const refetchQuestions = async () => {
    setLoading(true);
    setError(null);
    return batchLoadMutation.mutateAsync({ moduleId, count: batchSize })
      .then(() => {
        setCurrentIndex(0);
      })
      .catch(error => {
        console.error('Error refetching questions:', error);
        setError(error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Navigation functions
  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prevIndex => prevIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prevIndex => prevIndex - 1);
    }
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  return {
    questions,
    currentQuestion: questions.length > 0 ? questions[currentIndex] : null,
    currentIndex,
    loading,
    error,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    refetchQuestions,
    hasNextQuestion: currentIndex < questions.length - 1,
    hasPreviousQuestion: currentIndex > 0
  };
}