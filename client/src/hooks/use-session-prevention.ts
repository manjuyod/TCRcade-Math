
import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

interface UseSessionPreventionOptions {
  isActive: boolean;
  onAttemptExit?: () => void;
  allowedPaths?: string[];
}

export function useSessionPrevention({
  isActive,
  onAttemptExit,
  allowedPaths = []
}: UseSessionPreventionOptions) {
  const [, navigate] = useLocation();
  const isActiveRef = useRef(isActive);
  
  // Update ref when isActive changes
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  
  // Prevent page refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActiveRef.current) {
        e.preventDefault();
        e.returnValue = 'You are in the middle of a module. Your progress will be lost if you leave now.';
        return e.returnValue;
      }
    };
    
    if (isActive) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Store session state
      sessionStorage.setItem('moduleInProgress', 'true');
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } else {
      // Clear session state when not active
      sessionStorage.removeItem('moduleInProgress');
    }
  }, [isActive]);
  
  // Intercept navigation attempts
  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    const interceptNavigation = (url: string) => {
      if (isActiveRef.current) {
        // Check if navigation is to an allowed path
        const isAllowed = allowedPaths.some(path => url.includes(path));
        
        if (!isAllowed) {
          if (onAttemptExit) {
            onAttemptExit();
          }
          return false;
        }
      }
      return true;
    };
    
    window.history.pushState = function(data, title, url) {
      if (url && interceptNavigation(url.toString())) {
        originalPushState.apply(this, arguments as any);
      }
    };
    
    window.history.replaceState = function(data, title, url) {
      if (url && interceptNavigation(url.toString())) {
        originalReplaceState.apply(this, arguments as any);
      }
    };
    
    // Handle popstate (back button)
    const handlePopState = (e: PopStateEvent) => {
      if (isActiveRef.current) {
        e.preventDefault();
        if (onAttemptExit) {
          onAttemptExit();
        }
        // Push current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
      }
    };
    
    if (isActive) {
      window.addEventListener('popstate', handlePopState);
    }
    
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isActive, onAttemptExit, allowedPaths]);
  
  // Function to safely end session
  const endSession = () => {
    isActiveRef.current = false;
    sessionStorage.removeItem('moduleInProgress');
  };
  
  return { endSession };
}
