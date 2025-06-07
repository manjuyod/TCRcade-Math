
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './use-toast';

interface UseModuleSessionOptions {
  maxQuestions?: number;
  onModuleComplete?: () => void;
  onAttemptExit?: () => void;
}

interface ModuleSessionState {
  isActive: boolean;
  currentQuestion: number;
  totalQuestions: number;
  questionsCompleted: number;
}

export function useModuleSession({
  maxQuestions = 5,
  onModuleComplete,
  onAttemptExit
}: UseModuleSessionOptions = {}) {
  const { toast } = useToast();
  const [sessionState, setSessionState] = useState<ModuleSessionState>({
    isActive: false,
    currentQuestion: 0,
    totalQuestions: maxQuestions,
    questionsCompleted: 0
  });
  
  const isActiveRef = useRef(false);
  
  // Update ref when session state changes
  useEffect(() => {
    isActiveRef.current = sessionState.isActive;
  }, [sessionState.isActive]);
  
  // Trigger storage event to notify other components
  const triggerStorageEvent = useCallback(() => {
    // Dispatch custom storage event
    window.dispatchEvent(new Event('storage'));
    
    // Also dispatch custom event for immediate detection
    window.dispatchEvent(new CustomEvent('moduleSessionChange', {
      detail: { isActive: isActiveRef.current }
    }));
  }, []);
  
  // Start module function
  const startModule = useCallback(() => {
    console.log('🎯 Starting module session');
    
    setSessionState({
      isActive: true,
      currentQuestion: 1,
      totalQuestions: maxQuestions,
      questionsCompleted: 0
    });
    
    // Immediately set session storage
    sessionStorage.setItem('moduleInProgress', 'true');
    sessionStorage.setItem('moduleQuestionCount', '1');
    sessionStorage.setItem('moduleMaxQuestions', maxQuestions.toString());
    
    // Trigger events for immediate detection
    triggerStorageEvent();
    
    isActiveRef.current = true;
  }, [maxQuestions, triggerStorageEvent]);
  
  // End module function
  const endModule = useCallback(() => {
    console.log('🏁 Ending module session');
    
    setSessionState({
      isActive: false,
      currentQuestion: 0,
      totalQuestions: maxQuestions,
      questionsCompleted: 0
    });
    
    // Clear session storage
    sessionStorage.removeItem('moduleInProgress');
    sessionStorage.removeItem('moduleQuestionCount');
    sessionStorage.removeItem('moduleMaxQuestions');
    
    // Trigger events for immediate detection
    triggerStorageEvent();
    
    isActiveRef.current = false;
  }, [maxQuestions, triggerStorageEvent]);
  
  // Next question function
  const nextQuestion = useCallback(() => {
    if (!sessionState.isActive) {
      console.warn('Cannot advance question - module not active');
      return false;
    }
    
    const nextQuestionNum = sessionState.currentQuestion + 1;
    const completed = sessionState.questionsCompleted + 1;
    
    console.log(`📝 Advancing to question ${nextQuestionNum} (${completed}/${maxQuestions} completed)`);
    
    setSessionState(prev => ({
      ...prev,
      currentQuestion: nextQuestionNum,
      questionsCompleted: completed
    }));
    
    // Update session storage
    sessionStorage.setItem('moduleQuestionCount', nextQuestionNum.toString());
    
    // Check if module is complete
    if (completed >= maxQuestions) {
      console.log('✅ Module completed - all questions answered');
      
      // Call completion callback if provided
      if (onModuleComplete) {
        onModuleComplete();
      }
      
      // End the module
      setTimeout(() => {
        endModule();
      }, 100); // Small delay to allow completion handling
      
      return true;
    }
    
    return false;
  }, [sessionState, maxQuestions, onModuleComplete, endModule]);
  
  // Prevent page refresh/close during active module
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActiveRef.current) {
        e.preventDefault();
        e.returnValue = 'You are in the middle of a module. Your progress will be lost if you leave now.';
        return e.returnValue;
      }
    };
    
    if (sessionState.isActive) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [sessionState.isActive]);
  
  // Intercept navigation attempts during active module
  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    const interceptNavigation = (url: string) => {
      if (isActiveRef.current) {
        console.log('🚫 Navigation blocked - module in progress');
        
        if (onAttemptExit) {
          onAttemptExit();
        } else {
          toast({
            title: "Module in Progress",
            description: "Please complete your current module before navigating away.",
            variant: "destructive"
          });
        }
        return false;
      }
      return true;
    };
    
    // Override pushState
    window.history.pushState = function(data, title, url) {
      if (url && interceptNavigation(url.toString())) {
        originalPushState.apply(this, arguments as any);
      }
    };
    
    // Override replaceState
    window.history.replaceState = function(data, title, url) {
      if (url && interceptNavigation(url.toString())) {
        originalReplaceState.apply(this, arguments as any);
      }
    };
    
    // Handle back button
    const handlePopState = (e: PopStateEvent) => {
      if (isActiveRef.current) {
        e.preventDefault();
        
        if (onAttemptExit) {
          onAttemptExit();
        } else {
          toast({
            title: "Module in Progress",
            description: "Please complete your current module before navigating away.",
            variant: "destructive"
          });
        }
        
        // Push current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
      }
    };
    
    if (sessionState.isActive) {
      window.addEventListener('popstate', handlePopState);
    }
    
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [sessionState.isActive, onAttemptExit, toast]);
  
  // Restore session state on component mount (in case of page refresh)
  useEffect(() => {
    const moduleInProgress = sessionStorage.getItem('moduleInProgress');
    const questionCount = sessionStorage.getItem('moduleQuestionCount');
    const maxQuestionsStored = sessionStorage.getItem('moduleMaxQuestions');
    
    if (moduleInProgress === 'true') {
      const currentQ = questionCount ? parseInt(questionCount, 10) : 1;
      const maxQ = maxQuestionsStored ? parseInt(maxQuestionsStored, 10) : maxQuestions;
      
      console.log('🔄 Restoring module session state', { currentQ, maxQ });
      
      setSessionState({
        isActive: true,
        currentQuestion: currentQ,
        totalQuestions: maxQ,
        questionsCompleted: currentQ - 1
      });
      
      isActiveRef.current = true;
    }
  }, [maxQuestions]);
  
  return {
    // State
    isModuleActive: sessionState.isActive,
    currentQuestion: sessionState.currentQuestion,
    totalQuestions: sessionState.totalQuestions,
    questionsCompleted: sessionState.questionsCompleted,
    canEndModule: sessionState.questionsCompleted >= sessionState.totalQuestions,
    
    // Actions
    startModule,
    endModule,
    nextQuestion,
    
    // Progress info
    progress: sessionState.totalQuestions > 0 
      ? (sessionState.questionsCompleted / sessionState.totalQuestions) * 100 
      : 0
  };
}
