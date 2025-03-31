import { useAuth } from '@/hooks/use-auth';
import { StreakBadge } from './streak-badge';
import { Link } from 'wouter';
import { Coins } from 'lucide-react';
import tcLogo from '../assets/tc-logo.png';

export default function Header() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <header className="bg-white shadow-sm py-0 px-3 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center h-6">
        <div className="flex items-center space-x-1">
          <Link href="/modules" className="h-5 cursor-pointer">
            <img src={tcLogo} alt="Tutoring Club Logo" className="h-full" />
          </Link>
          <span className="text-xs font-bold text-primary hidden sm:block">tcRCADE</span>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center mr-1.5">
            <div className="flex items-center bg-amber-100 rounded-full px-1.5 py-0.5">
              <Coins className="h-2.5 w-2.5 text-amber-700 mr-0.5" />
              <span className="text-xs font-bold text-amber-700">{user.tokens}</span>
            </div>
          </div>
          
          <StreakBadge streakDays={user.streakDays} size="xs" />
        </div>
      </div>
    </header>
  );
}
