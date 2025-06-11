// Global session management and cleanup system
interface SessionData {
  timestamp: number;
  sessionId: string;
  module?: string;
}

class SessionManager {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Start global monitoring on page load
    if (typeof window !== 'undefined') {
      this.startGlobalMonitoring();
      
      // Clean up any existing stuck sessions immediately
      this.performInitialCleanup();
      
      // Listen for page visibility changes to detect abandoned sessions
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkForAbandonedSessions();
        }
      });
    }
  }

  private performInitialCleanup() {
    const moduleInProgress = sessionStorage.getItem('moduleInProgress');
    const sessionData = sessionStorage.getItem('moduleSessionData');
    
    // Check if there's a claimed active session
    if (moduleInProgress === 'true') {
      if (!sessionData) {
        console.warn('🧹 Initial cleanup: Orphaned session flag without data');
        this.clearSession();
        return;
      }
      
      try {
        const data: SessionData = JSON.parse(sessionData);
        const age = Date.now() - data.timestamp;
        
        // Clear sessions older than 30 minutes
        if (age > 30 * 60 * 1000) {
          console.warn('🧹 Initial cleanup: Expired session detected', {
            age: Math.round(age / 1000 / 60) + ' minutes',
            sessionId: data.sessionId
          });
          this.clearSession();
        }
      } catch (e) {
        console.warn('🧹 Initial cleanup: Corrupt session data');
        this.clearSession();
      }
    }
  }

  private startGlobalMonitoring() {
    // Check for stuck sessions every 10 seconds
    this.cleanupInterval = setInterval(() => {
      this.detectAndFixStuckSessions();
    }, 10000);

    // Comprehensive health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  private detectAndFixStuckSessions() {
    const moduleInProgress = sessionStorage.getItem('moduleInProgress');
    const sessionData = sessionStorage.getItem('moduleSessionData');
    
    if (moduleInProgress === 'true' && sessionData) {
      try {
        const data: SessionData = JSON.parse(sessionData);
        const age = Date.now() - data.timestamp;
        
        // 30 minute timeout
        if (age > 30 * 60 * 1000) {
          console.warn('🤖 Auto-fixing: STUCK_SESSION', { 
            age: Math.round(age / 1000 / 60) + ' minutes',
            sessionId: data.sessionId 
          });
          this.clearSession();
        }
      } catch (e) {
        console.warn('🤖 Auto-fixing: INVALID_SESSION_DATA', e);
        this.clearSession();
      }
    }
  }

  private checkForAbandonedSessions() {
    const currentPath = window.location.pathname;
    const moduleInProgress = sessionStorage.getItem('moduleInProgress') === 'true';
    
    // If session is active but user is not in a play page, it might be abandoned
    if (moduleInProgress && !currentPath.includes('/play')) {
      const sessionData = sessionStorage.getItem('moduleSessionData');
      if (sessionData) {
        try {
          const data: SessionData = JSON.parse(sessionData);
          const age = Date.now() - data.timestamp;
          
          // If user has been away from play page for more than 5 minutes, consider it abandoned
          if (age > 5 * 60 * 1000) {
            console.warn('🔍 Potential abandoned session detected', {
              currentPath,
              sessionAge: Math.round(age / 1000 / 60) + ' minutes'
            });
          }
        } catch (e) {
          // Invalid session data
          this.clearSession();
        }
      }
    }
  }

  private performHealthCheck() {
    const issues = [];
    const moduleSession = sessionStorage.getItem('moduleInProgress');
    const sessionData = sessionStorage.getItem('moduleSessionData');
    const currentPath = window.location.pathname;
    
    // Check for session storage leaks
    if (moduleSession === 'true' && !sessionData) {
      issues.push('ORPHANED_SESSION_NO_DATA');
    }
    
    // Check for navigation inconsistencies
    if (currentPath === '/' && !window.location.href.includes('/modules')) {
      issues.push('ROOT_REDIRECT_FAILURE');
    }
    
    // Auto-fix detected issues
    if (issues.length > 0) {
      console.warn('🚨 Health check detected issues:', issues);
      this.autoFix(issues);
    }
  }

  private autoFix(issues: string[]) {
    issues.forEach(issue => {
      switch (issue) {
        case 'ORPHANED_SESSION_NO_DATA':
          console.warn('🔧 Auto-fixing: Orphaned session');
          this.clearSession();
          break;
          
        case 'ROOT_REDIRECT_FAILURE':
          console.warn('🔧 Auto-fixing: Root redirect failure');
          window.location.href = '/modules';
          break;
      }
    });
  }

  public clearSession() {
    sessionStorage.removeItem('moduleInProgress');
    sessionStorage.removeItem('moduleSessionData');
    window.dispatchEvent(new Event('moduleSessionChange'));
  }

  public forceCleanup() {
    console.warn('🧹 Manual force cleanup initiated');
    sessionStorage.clear();
    window.dispatchEvent(new Event('moduleSessionChange'));
  }

  public getSessionStatus() {
    const moduleInProgress = sessionStorage.getItem('moduleInProgress') === 'true';
    const sessionData = sessionStorage.getItem('moduleSessionData');
    
    let parsedData = null;
    if (sessionData) {
      try {
        parsedData = JSON.parse(sessionData);
      } catch (e) {
        // Invalid data
      }
    }
    
    return {
      active: moduleInProgress,
      data: parsedData,
      currentPath: window.location.pathname,
      timestamp: Date.now()
    };
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Create global singleton instance
export const sessionManager = new SessionManager();

// Global debug interface
if (typeof window !== 'undefined') {
  (window as any).sessionManager = {
    status: () => sessionManager.getSessionStatus(),
    clear: () => sessionManager.clearSession(),
    forceCleanup: () => sessionManager.forceCleanup(),
    monitor: () => setInterval(() => console.log((window as any).sessionManager.status()), 5000)
  };
}