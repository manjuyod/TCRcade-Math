import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

interface UseSessionPreventionOptions {
  isActive: boolean;
  onAttemptExit?: () => void;
  allowedPaths?: string[];
}

interface SessionData {
  timestamp: number;
  sessionId: string;
  module?: string;
}

// Auto-diagnostic and recovery system
const sessionMonitor = {
  // Check every 5 seconds for stuck sessions
  detectStuckSessions: () => {
    const moduleInProgress = sessionStorage.getItem('moduleInProgress');
    const sessionData = sessionStorage.getItem('moduleSessionData');
    
    if (moduleInProgress === 'true' && sessionData) {
      try {
        const data: SessionData = JSON.parse(sessionData);
        const age = Date.now() - data.timestamp;
        
        // 30 minute timeout
        if (age > 30 * 60 * 1000) {
          console.warn('🤖 Auto-fixing: STUCK_SESSION', { age, sessionId: data.sessionId });
          sessionMonitor.autoFix('STUCK_SESSION', { age, data });
        }
      } catch (e) {
        console.warn('🤖 Auto-fixing: INVALID_SESSION_DATA', e);
        sessionMonitor.autoFix('INVALID_SESSION_DATA', {});
      }
    }
  },
  
  // Automatic fixes for common issues
  autoFix: (issue: string, context: any) => {
    console.warn(`🤖 Auto-fixing: ${issue}`, context);
    
    switch (issue) {
      case 'STUCK_SESSION':
        sessionStorage.removeItem('moduleInProgress');
        sessionStorage.removeItem('moduleSessionData');
        window.dispatchEvent(new Event('moduleSessionChange'));
        break;
        
      case 'INVALID_SESSION_DATA':
        sessionStorage.clear();
        window.dispatchEvent(new Event('moduleSessionChange'));
        break;
    }
  }
};

export function useSessionPrevention({
  isActive,
  onAttemptExit,
  allowedPaths = [],
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
        e.returnValue =
          "You are in the middle of a module. Your progress will be lost if you leave now.";
        return e.returnValue;
      }
    };

    if (isActive) {
      window.addEventListener("beforeunload", handleBeforeUnload);

      // Store enhanced session state with timestamp
      const sessionData: SessionData = {
        timestamp: Date.now(),
        sessionId: Math.random().toString(36).substr(2, 9),
        module: window.location.pathname.split('/')[1]
      };
      
      sessionStorage.setItem("moduleInProgress", "true");
      sessionStorage.setItem("moduleSessionData", JSON.stringify(sessionData));
      window.dispatchEvent(new Event("moduleSessionChange"));

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    } else {
      // Clear session state when not active
      sessionStorage.removeItem("moduleInProgress");
      sessionStorage.removeItem("moduleSessionData");
      window.dispatchEvent(new Event("moduleSessionChange"));
    }
  }, [isActive]);

  // Intercept navigation attempts
  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const interceptNavigation = (url: string) => {
      if (isActiveRef.current) {
        // Check if navigation is to an allowed path
        const isAllowed = allowedPaths.some((path) => url.includes(path));

        if (!isAllowed) {
          if (onAttemptExit) {
            onAttemptExit();
          }
          return false;
        }
      }
      return true;
    };

    window.history.pushState = function (data, title, url) {
      if (url && interceptNavigation(url.toString())) {
        originalPushState.apply(this, arguments as any);
      }
    };

    window.history.replaceState = function (data, title, url) {
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
        window.history.pushState(null, "", window.location.href);
      }
    };

    if (isActive) {
      window.addEventListener("popstate", handlePopState);
    }

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isActive, onAttemptExit, allowedPaths]);

  // Auto-monitoring system
  useEffect(() => {
    // Start monitoring when session becomes active
    if (isActive) {
      const monitorInterval = setInterval(() => {
        sessionMonitor.detectStuckSessions();
      }, 5000); // Check every 5 seconds

      return () => {
        clearInterval(monitorInterval);
      };
    }
  }, [isActive]);

  // Function to safely end session
  const endSession = () => {
    isActiveRef.current = false;
    sessionStorage.removeItem("moduleInProgress");
    sessionStorage.removeItem("moduleSessionData");
    window.dispatchEvent(new Event("moduleSessionChange"));
  };

  return { endSession };
}
