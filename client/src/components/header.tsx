import { useAuth } from '@/hooks/use-auth';
import { StreakBadge } from './streak-badge';
import { Link } from 'wouter';
import { Coins } from 'lucide-react';
import tcLogo from '../assets/tc-logo.png';

export default function Header() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <header className="bg-white shadow-sm py-1 px-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center h-7">
        <div className="flex items-center space-x-2">
          <Link href="/modules" className="h-6 cursor-pointer">
            <img src={tcLogo} alt="Tutoring Club Logo" className="h-full" />
          </Link>
          <span className="text-base font-bold text-primary hidden sm:block">tcRCADE</span>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center mr-2">
            <div className="flex items-center bg-amber-100 rounded-full px-2 py-0.5">
              <Coins className="h-3 w-3 text-amber-700 mr-1" />
              <span className="font-bold text-amber-700">{user.tokens}</span>
            </div>
          </div>
          
          <StreakBadge streakDays={user.streakDays} size="sm" />
        </div>
      </div>
    </header>
  );
}
