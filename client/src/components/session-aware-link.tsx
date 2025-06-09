import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function SessionAwareLink({ href, children, className }: Props) {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = () => {
      const active = sessionStorage.getItem('moduleInProgress') === 'true';
      console.log('[SessionAwareLink] moduleInProgress =', active);
      setHasActiveSession(active);
    };

    checkSession(); // Run once on mount

    const handleStorage = () => {
      console.log('[SessionAwareLink] storage or session change detected');
      checkSession();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('moduleSessionChange', handleStorage); // ✅ add this line

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('moduleSessionChange', handleStorage); // ✅ and this
    };
  }, []);

  const handleBlockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast({
      title: 'Module in Progress',
      description: 'Complete your current module before leaving.',
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