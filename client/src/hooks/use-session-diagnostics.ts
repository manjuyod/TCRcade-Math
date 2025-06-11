import { useState, useEffect } from 'react';

interface DiagnosticReport {
  timestamp: number;
  sessionState: {
    moduleInProgress: boolean;
    sessionData: any;
    hasActiveComponent: boolean;
  };
  navigationState: {
    currentPath: string;
    expectedNavState: string;
    actualNavState: string;
  };
  issues: string[];
  healthScore: number;
}

export function useSessionDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticReport | null>(null);

  // Real-time health check
  const healthCheck = (): string[] => {
    const issues: string[] = [];
    
    // Check for session storage leaks
    const moduleSession = sessionStorage.getItem('moduleInProgress');
    const sessionData = sessionStorage.getItem('moduleSessionData');
    
    // Check if session claims to be active but no actual session data
    if (moduleSession === 'true' && !sessionData) {
      issues.push('ORPHANED_SESSION_NO_DATA');
    }
    
    // Check for old session data
    if (sessionData) {
      try {
        const data = JSON.parse(sessionData);
        const age = Date.now() - data.timestamp;
        if (age > 30 * 60 * 1000) { // 30 minutes
          issues.push('EXPIRED_SESSION_DATA');
        }
      } catch (e) {
        issues.push('CORRUPT_SESSION_DATA');
      }
    }
    
    // Check navigation state consistency
    const currentPath = window.location.pathname;
    if (currentPath === '/' && !currentPath.includes('/modules')) {
      issues.push('ROOT_REDIRECT_ISSUE');
    }
    
    return issues;
  };

  // Generate comprehensive diagnostic report
  const generateReport = (): DiagnosticReport => {
    const moduleInProgress = sessionStorage.getItem('moduleInProgress') === 'true';
    const sessionData = sessionStorage.getItem('moduleSessionData');
    const currentPath = window.location.pathname;
    const issues = healthCheck();
    
    let parsedSessionData = null;
    try {
      parsedSessionData = sessionData ? JSON.parse(sessionData) : null;
    } catch (e) {
      // Session data is corrupt
    }
    
    const report: DiagnosticReport = {
      timestamp: Date.now(),
      sessionState: {
        moduleInProgress,
        sessionData: parsedSessionData,
        hasActiveComponent: moduleInProgress && currentPath.includes('/play')
      },
      navigationState: {
        currentPath,
        expectedNavState: currentPath === '/' || currentPath === '/modules' ? 'home' : 'unknown',
        actualNavState: 'home' // This would be determined by actual nav component state
      },
      issues,
      healthScore: Math.max(0, 100 - (issues.length * 20))
    };
    
    return report;
  };

  // Auto-fix common issues
  const autoFix = () => {
    const issues = healthCheck();
    
    issues.forEach(issue => {
      switch (issue) {
        case 'ORPHANED_SESSION_NO_DATA':
        case 'EXPIRED_SESSION_DATA':
        case 'CORRUPT_SESSION_DATA':
          console.warn(`🔧 Auto-fixing: ${issue}`);
          sessionStorage.removeItem('moduleInProgress');
          sessionStorage.removeItem('moduleSessionData');
          window.dispatchEvent(new Event('moduleSessionChange'));
          break;
          
        case 'ROOT_REDIRECT_ISSUE':
          console.warn(`🔧 Auto-fixing: ${issue}`);
          window.location.href = '/modules';
          break;
      }
    });
  };

  // Clear stuck session manually
  const clearStuckSession = () => {
    console.warn('🧹 Manually clearing stuck session');
    sessionStorage.removeItem('moduleInProgress');
    sessionStorage.removeItem('moduleSessionData');
    window.dispatchEvent(new Event('moduleSessionChange'));
  };

  // Export diagnostics for debugging
  const exportDiagnostics = () => {
    const report = generateReport();
    setDiagnostics(report);
    return report;
  };

  // Continuous monitoring
  useEffect(() => {
    const monitorInterval = setInterval(() => {
      const issues = healthCheck();
      if (issues.length > 0) {
        console.warn('🚨 Session issues detected:', issues);
        autoFix();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(monitorInterval);
  }, []);

  return {
    diagnostics,
    healthCheck,
    generateReport,
    autoFix,
    clearStuckSession,
    exportDiagnostics
  };
}

// Global debug interface
if (typeof window !== 'undefined') {
  (window as any).sessionDebug = {
    status: () => {
      const diagnostics = new (class {
        generateReport() {
          const moduleInProgress = sessionStorage.getItem('moduleInProgress') === 'true';
          const sessionData = sessionStorage.getItem('moduleSessionData');
          return {
            moduleInProgress,
            sessionData: sessionData ? JSON.parse(sessionData) : null,
            currentPath: window.location.pathname,
            timestamp: Date.now()
          };
        }
        clearStuckSession() {
          sessionStorage.removeItem('moduleInProgress');
          sessionStorage.removeItem('moduleSessionData');
          window.dispatchEvent(new Event('moduleSessionChange'));
        }
      })();
      return diagnostics.generateReport();
    },
    clear: () => {
      sessionStorage.removeItem('moduleInProgress');
      sessionStorage.removeItem('moduleSessionData');
      window.dispatchEvent(new Event('moduleSessionChange'));
    },
    monitor: () => setInterval(() => console.log((window as any).sessionDebug.status()), 5000)
  };
}