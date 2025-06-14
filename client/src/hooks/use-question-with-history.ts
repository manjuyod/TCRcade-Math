import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Question } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

const LOCAL_STORAGE_QUESTION_HISTORY_KEY = 'question_history';
const MAX_QUESTION_HISTORY = 500; // Track the last 500 questions per user

interface UseQuestionWithHistoryReturn {
  question: Question | null;
  loading: boolean;
  error: Error | null;
  fetchNewQuestion: (forceDynamic?: boolean) => Promise<void>;
  seenQuestions: number[];
  clearHistory: () => void;
}

interface QuestionHistoryItem {
  id: number;
  question?: string;
  mathOperations?: string[];
  questionSignature?: string;
  timestamp: number;
}

interface QuestionHistory {
  userId: number;
  seenQuestionIds: number[];
  lastSeen: Record<number, number>; // questionId -> timestamp
  questionData: Record<number, QuestionHistoryItem>; // Detailed question data for better duplication detection
}

/**
 * Enhanced hook for fetching questions with advanced duplicate prevention
 * 
 * This hook maintains user question history in localStorage to prevent
 * repeated questions across sessions. It prioritizes questions the user
 * hasn't seen in months.
 * 
 * @param grade The grade level to fetch questions for
 * @param category Optional category to filter questions
 * @returns Object containing the current question, loading state, and functions to fetch new questions
 */
export function useQuestionWithHistory(
  grade: string,
  category?: string
): UseQuestionWithHistoryReturn {
  const { user } = useAuth();
  const userId = user?.id || 0;
  
  // Load persisted question history from localStorage
  const loadQuestionHistory = (): QuestionHistory => {
    try {
      const savedHistory = localStorage.getItem(LOCAL_STORAGE_QUESTION_HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // Only use history if it's for the current user
        if (parsedHistory.userId === userId) {
          return parsedHistory;
        }
      }
    } catch (e) {
      console.warn("Failed to load question history:", e);
    }
    
    // Default empty history
    return {
      userId,
      seenQuestionIds: [],
      lastSeen: {},
      questionData: {}
    };
  };
  
  // State for tracking seen questions with timestamps
  const [questionHistory, setQuestionHistory] = useState<QuestionHistory>(loadQuestionHistory);
  
  // Extract just the IDs for easier reference
  const [seenQuestions, setSeenQuestions] = useState<number[]>(questionHistory.seenQuestionIds);
  
  // Save question history to localStorage whenever it changes
  useEffect(() => {
    if (userId) {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_QUESTION_HISTORY_KEY,
          JSON.stringify({
            ...questionHistory,
            userId // Ensure we're always storing for current user
          })
        );
        
        // Update the simplified list
        setSeenQuestions(questionHistory.seenQuestionIds);
      } catch (e) {
        console.warn("Failed to save question history:", e);
      }
    }
  }, [questionHistory, userId]);
  
  // Build a query key that includes grade and category
  const queryKey = category 
    ? ['/api/questions/next', grade, category] 
    : ['/api/questions/next', grade];
  
  // State to trigger query refetching with specific parameters
  const [queryParams, setQueryParams] = useState({
    fetchTrigger: 0,
    forceDynamic: false
  });
  
  // Record that a question was seen, with full question data for better duplication detection
  const recordSeenQuestion = (question: Question) => {
    if (!question || !question.id) return;
    
    const questionId = question.id;
    
    setQuestionHistory(prev => {
      // Check if we've already seen this question
      const alreadySeen = prev.seenQuestionIds.includes(questionId);
      
      // Create updated list (either add new or move to end if already seen)
      let updatedIds = alreadySeen 
        ? prev.seenQuestionIds.filter(id => id !== questionId)
        : [...prev.seenQuestionIds];
      
      // Add to end (most recently seen)
      updatedIds.push(questionId);
      
      // Trim to maximum history size
      if (updatedIds.length > MAX_QUESTION_HISTORY) {
        updatedIds = updatedIds.slice(-MAX_QUESTION_HISTORY);
      }
      
      // Update timestamp
      const now = Date.now();
      
      // Extract mathematical operations from the question text (if available)
      const mathOperations: string[] = [];
      
      if (question.question) {
        // Get the text property if it exists, otherwise use question.question directly
        const questionText = typeof question.question === 'object' && question.question.text 
          ? question.question.text 
          : typeof question.question === 'string' 
            ? question.question 
            : '';

        console.log("Processing question text:", questionText);
            
        // Extract operations using regex
        const additionMatches = questionText.match(/(\d+)\s*\+\s*(\d+)/g) || [];
        const subtractionMatches = questionText.match(/(\d+)\s*\-\s*(\d+)/g) || [];
        const multiplicationMatches = questionText.match(/(\d+)\s*[×x\*]\s*(\d+)/g) || [];
        const divisionMatches = questionText.match(/(\d+)\s*[÷\/]\s*(\d+)/g) || [];
        
        // Convert matches to standardized math facts
        additionMatches.forEach(match => {
          const parts = match.match(/(\d+)\s*\+\s*(\d+)/);
          if (parts && parts.length >= 3) {
            mathOperations.push(`${parts[1]}+${parts[2]}`);
          }
        });
        
        subtractionMatches.forEach(match => {
          const parts = match.match(/(\d+)\s*\-\s*(\d+)/);
          if (parts && parts.length >= 3) {
            mathOperations.push(`${parts[1]}-${parts[2]}`);
          }
        });
        
        multiplicationMatches.forEach(match => {
          const parts = match.match(/(\d+)\s*[×x\*]\s*(\d+)/);
          if (parts && parts.length >= 3) {
            mathOperations.push(`${parts[1]}×${parts[2]}`);
          }
        });
        
        divisionMatches.forEach(match => {
          const parts = match.match(/(\d+)\s*[÷\/]\s*(\d+)/);
          if (parts && parts.length >= 3) {
            mathOperations.push(`${parts[1]}÷${parts[2]}`);
          }
        });
      }
      
      // Generate a signature (normalized question text)
      const questionSignature = question.question
        ? (typeof question.question === 'object' && question.question.text
            ? question.question.text.toLowerCase().replace(/\s+/g, ' ').trim()
            : typeof question.question === 'string'
                ? question.question.toLowerCase().replace(/\s+/g, ' ').trim()
                : '')
        : '';
      
      // Store the question data
      const questionData = {
        ...prev.questionData,
        [questionId]: {
          id: questionId,
          question: question.question,
          mathOperations,
          questionSignature,
          timestamp: now
        }
      };
      
      return {
        ...prev,
        userId,
        seenQuestionIds: updatedIds,
        lastSeen: {
          ...prev.lastSeen,
          [questionId]: now
        },
        questionData
      };
    });
  };
  
  // Enhanced question fetching with extensive exclusion list
  const { data, isLoading, error } = useQuery<Question>({
    queryKey: [...queryKey, queryParams.fetchTrigger, queryParams.forceDynamic],
    queryFn: async () => {
      // Check if this is a Math Facts module
      const isMathFactsModule = category && category.startsWith('math-facts-');
      
      if (isMathFactsModule) {
        // Extract the operation (math-facts-addition -> addition)
        const operation = category!.split('-').pop();
        
        // Use the non-authenticated endpoint for Math Facts
        const mathFactsUrl = `/api/math-facts/question?grade=${grade}&operation=${operation}&_t=${Date.now()}`;
        console.log(`HOOK: Using direct Math Facts endpoint: ${mathFactsUrl}`);
        
        try {
          const response = await fetch(mathFactsUrl, {
            cache: 'no-store'
          });
          
          if (!response.ok) {
            throw new Error(`Math Facts fetch failed: ${response.status}`);
          }
          
          const data = await response.json();
          console.log(`Math Facts question loaded: ${data?.question?.text || 'Unknown'}`);
          
          // Record that we've seen this question
          if (data && data.id) {
            recordSeenQuestion(data);
          }
          
          return data;
        } catch (error) {
          console.error('Error fetching Math Facts:', error);
          throw error;
        }
      } else {
        // Standard question endpoint with authentication
        // Build query params
        let url = `/api/questions/next?grade=${grade}`;
        
        if (category) {
          url += `&category=${category}`;
        }
        
        // Pass the list of recently seen questions to exclude (limited to 100 most recent to keep URL reasonable)
        if (seenQuestions.length > 0) {
          // Only send the most recent 100 questions to keep URL manageable
          const recentlySeenIds = seenQuestions.slice(-100);
          url += `&exclude=${recentlySeenIds.join(',')}`;
        }
        
        // Add forceDynamic parameter if needed
        if (queryParams.forceDynamic) {
          url += '&forceDynamic=true';
        }
        
        // Add a randomizing parameter to prevent cache
        url += `&random=${Math.random()}`;
        
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch question: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Record that we've seen this question with full data for better duplication detection
        if (data && data.id) {
          recordSeenQuestion(data);
        }
        
        return data;
      }
    },
    refetchOnWindowFocus: false
  });
  
  // Function to fetch a new question
  const fetchNewQuestion = async (forceDynamic = false) => {
    setQueryParams(prev => ({
      fetchTrigger: prev.fetchTrigger + 1,
      forceDynamic: forceDynamic
    }));
    
    return Promise.resolve();
  };
  
  // Function to clear question history
  const clearHistory = () => {
    setQuestionHistory({
      userId,
      seenQuestionIds: [],
      lastSeen: {},
      questionData: {}
    });
  };

  return {
    question: data || null,
    loading: isLoading,
    error: error as Error,
    fetchNewQuestion,
    seenQuestions,
    clearHistory
  };
}