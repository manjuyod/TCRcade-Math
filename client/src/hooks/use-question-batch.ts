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
      
      // Get the current user's grade
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const currentGrade = currentUser?.grade || user?.grade || 'K';
      
      if (cacheJson) {
        const cache: BatchCacheEntry = JSON.parse(cacheJson);
        
        // Check if cache is for the current module AND current grade
        if (cache.moduleId === moduleId && cache.grade === currentGrade) {
          // Check if cache is still fresh (less than 30 minutes old)
          const cacheAge = Date.now() - cache.timestamp;
          const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
          
          if (cacheAge < CACHE_TTL && cache.questions.length > 0) {
            console.log(`Using cached ${cache.questions.length} questions for module ${moduleId}, grade ${currentGrade}`);
            return cache.questions;
          }
        } else if (cache.grade !== currentGrade) {
          console.log(`Cache found but for different grade (cached: ${cache.grade}, current: ${currentGrade}). Fetching new questions.`);
          return null;
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
      // Always use the most current grade when caching
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const currentGrade = currentUser?.grade || user?.grade || 'K';
      
      const cacheEntry: BatchCacheEntry = {
        moduleId,
        grade: currentGrade,
        questions,
        timestamp: Date.now()
      };
      
      localStorage.setItem(QUESTION_BATCH_CACHE_KEY, JSON.stringify(cacheEntry));
      console.log(`Cached ${questions.length} questions for module ${moduleId}, grade ${currentGrade}`);
    } catch (e) {
      console.warn("Failed to cache question batch:", e);
    }
  };

  // Mutation for loading questions in batch
  const batchLoadMutation = useMutation({
    mutationFn: async (params: { moduleId: string, count: number }) => {
      // Always get the most current grade from user object
      // This ensures we respect any grade changes that happened during the session
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const grade = currentUser?.grade || user?.grade || 'K';
      
      console.log(`Loading questions for grade: ${grade}, module: ${params.moduleId}`);
      
      // Special handling for Math Facts modules
      if (params.moduleId?.startsWith('math-facts-')) {
        const operation = params.moduleId.replace('math-facts-', '');
        console.log(`Loading Math Facts with grade=${grade}, operation=${operation}`);
        
        // For Math Facts, we need to load multiple questions in parallel
        const promises = [];
        
        for (let i = 0; i < params.count; i++) {
          // Use timestamp to avoid cache issues
          const timestamp = Date.now() + i;
          const url = `/api/questions/math-facts?grade=${grade}&operation=${operation}&_t=${timestamp}`;
          promises.push(apiRequest('GET', url).then(r => r.json()));
        }
        
        // Wait for all promises to resolve
        const results = await Promise.all(promises);
        console.log(`Loaded ${results.length} Math Facts questions for grade ${grade}`);
        return results;
      } else {
        // Regular batch loading for non-Math Facts modules
        const url = `/api/questions/batch?grade=${grade}&category=${params.moduleId}&count=${params.count}`;
        
        const response = await apiRequest('GET', url);
        if (!response.ok) {
          throw new Error('Failed to load question batch');
        }
        
        const data = await response.json();
        return data.questions as Question[];
      }
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

  // Watch for user grade changes
  const userGrade = user?.grade || 'K';
  
  // Load questions when module or user grade changes
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
  }, [moduleId, batchSize, userGrade]); // Add userGrade as dependency to re-fetch when grade changes

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