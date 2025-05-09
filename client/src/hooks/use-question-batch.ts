import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Question } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { getTimeFallbackQuestions } from '@/lib/time-fallback-questions';

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
    maxRetries: 3,
    retry: (failureCount, error) => {
      if (failureCount < 3) {
        console.log(`Retrying batch load (attempt ${failureCount + 1}/3)`);
        return true;
      }
      return false;
    },
    async mutationFn: async (params: { moduleId: string, count: number }) => {
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

        // Special handling for Time module
        if (moduleId === 'time') {
          // The Time module already has fallback questions loaded
          // Only replace them if we got enough real questions (at least 5)
          if (data.length >= 5) {
            console.log('Replacing Time module fallback questions with API-generated questions');
            setQuestions(data);
            setCurrentIndex(0);
            cacheQuestions(moduleId, data);
          } else {
            console.log('Not enough Time questions from API, keeping fallbacks');
          }
        } else {
          // Normal handling for other modules
          setQuestions(data);
          setCurrentIndex(0);
          cacheQuestions(moduleId, data);
        }
      } else {
        // Don't show error for Time module since we have fallbacks
        if (moduleId !== 'time') {
          setError(new Error('No questions received in batch'));
        }
      }
      setLoading(false);
    },
    onError: (error: Error) => {
      console.error('Error loading question batch:', error);

      // For Time module, don't show errors since we already have fallbacks
      if (moduleId !== 'time') {
        setError(error);
      } else {
        console.log('Error loading Time module questions, but using fallbacks so no error shown to user');
      }

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

    // Get current grade for the user
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const currentGrade = currentUser?.grade || user?.grade || 'K';

    // Special handling for Time module - use fallback questions immediately
    // while API questions load in the background
    if (moduleId === 'time') {
      // We need to clear the cache for the Time module to prevent showing old fallback questions
      // This ensures users who've previously seen problematic questions get the updated ones
      if (localStorage.getItem(QUESTION_BATCH_CACHE_KEY)) {
        const cacheJson = localStorage.getItem(QUESTION_BATCH_CACHE_KEY);
        try {
          const cache: BatchCacheEntry = JSON.parse(cacheJson || '{}');
          if (cache.moduleId === 'time') {
            console.log('Clearing Time module cache to ensure latest questions are used');
            localStorage.removeItem(QUESTION_BATCH_CACHE_KEY);
          }
        } catch (e) {
          console.warn('Error parsing cache JSON', e);
        }
      }

      // Immediately set fallback questions to prevent long loading screens
      const fallbackQuestions = getTimeFallbackQuestions(currentGrade, batchSize);
      console.log(`Using ${fallbackQuestions.length} fallback time questions for grade ${currentGrade} while API loads`);
      setQuestions(fallbackQuestions);
      setCurrentIndex(0);
      setLoading(false);

      // Try to use cached questions first
      const cachedQuestions = loadCachedQuestions(moduleId);
      if (cachedQuestions) {
        console.log('Found cached time questions, using those instead of fallbacks');
        setQuestions(cachedQuestions);
        return;
      }

      // Silently load API questions in the background - fallbacks are already showing
      batchLoadMutation.mutate({ moduleId, count: batchSize });
      return;
    }

    // Normal flow for non-time modules
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

    // Special handling for Time module
    if (moduleId === 'time') {
      // Always clear the cache for the Time module when refetching
      // This ensures users always get the latest fallback questions
      if (localStorage.getItem(QUESTION_BATCH_CACHE_KEY)) {
        console.log('Clearing Time module cache when refetching');
        localStorage.removeItem(QUESTION_BATCH_CACHE_KEY);
      }

      // First set fallback questions to avoid loading screen
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const currentGrade = currentUser?.grade || user?.grade || 'K';
      const fallbackQuestions = getTimeFallbackQuestions(currentGrade, batchSize);
      console.log(`Refetching with ${fallbackQuestions.length} fallback time questions`);

      setQuestions(fallbackQuestions);
      setCurrentIndex(0);
      setLoading(false);

      // Then try to load API questions in the background
      return batchLoadMutation.mutateAsync({ moduleId, count: batchSize })
        .catch(error => {
          console.error('Error refetching Time module questions:', error);
          // Don't set error state for Time module as we have fallbacks
        });
    }

    // Normal handling for other modules
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