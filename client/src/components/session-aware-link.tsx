import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

interface SessionData {
  timestamp: number;
  sessionId: string;
  module?: string;
}

export function SessionAwareLink({ href, children, className }: Props) {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = () => {
      const active = sessionStorage.getItem('moduleInProgress') === 'true';
      const sessionData = sessionStorage.getItem('moduleSessionData');
      
      console.log('[SessionAwareLink] moduleInProgress =', active);
      
      // Auto-recovery for old sessions
      if (active && sessionData) {
        try {
          const data: SessionData = JSON.parse(sessionData);
          const age = Date.now() - data.timestamp;
          
          // Auto-clear sessions older than 30 minutes
          if (age > 30 * 60 * 1000) {
            console.warn('🤖 SessionAwareLink: Auto-clearing expired session', { 
              age: Math.round(age / 1000 / 60) + ' minutes',
              sessionId: data.sessionId 
            });
            sessionStorage.removeItem('moduleInProgress');
            sessionStorage.removeItem('moduleSessionData');
            window.dispatchEvent(new Event('moduleSessionChange'));
            setHasActiveSession(false);
            return;
          }
        } catch (e) {
          console.warn('🤖 SessionAwareLink: Invalid session data, clearing', e);
          sessionStorage.removeItem('moduleInProgress');
          sessionStorage.removeItem('moduleSessionData');
          window.dispatchEvent(new Event('moduleSessionChange'));
          setHasActiveSession(false);
          return;
        }
      }
      
      setHasActiveSession(active);
    };

    checkSession(); // Run once on mount

    const handleStorage = () => {
      console.log('[SessionAwareLink] storage or session change detected');
      checkSession();
    };

    // Check for stuck sessions every 10 seconds
    const stuckSessionInterval = setInterval(() => {
      checkSession();
    }, 10000);

    window.addEventListener('storage', handleStorage);
    window.addEventListener('moduleSessionChange', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('moduleSessionChange', handleStorage);
      clearInterval(stuckSessionInterval);
    };
  }, []);

  const handleBlockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Enhanced debugging for blocked navigation
    const sessionData = sessionStorage.getItem('moduleSessionData');
    let sessionInfo = '';
    
    if (sessionData) {
      try {
        const data: SessionData = JSON.parse(sessionData);
        const age = Math.round((Date.now() - data.timestamp) / 1000 / 60);
        sessionInfo = ` Session active for ${age} minutes in ${data.module || 'unknown'} module.`;
      } catch (e) {
        sessionInfo = ' Invalid session data detected.';
      }
    }
    
    console.log('🚫 Navigation blocked:', { href, sessionInfo, currentPath: window.location.pathname });
    
    toast({
      title: 'Module in Progress',
      description: 'Complete your current module before leaving.' + sessionInfo,
      variant: 'destructive',
    });
  };

  return hasActiveSession ? (
    <div
      onClick={handleBlockedClick}
      className={`cursor-not-allowed opacity-50 ${className ?? ''}`}
    >
      {children}
    </div>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}