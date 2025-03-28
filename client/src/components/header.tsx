import { useAuth } from '@/hooks/use-auth';
import { StreakBadge } from './streak-badge';
import { Link } from 'wouter';
import { Coins } from 'lucide-react';
import tcLogo from '../assets/tc-logo.png';

export default function Header() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Link href="/modules" className="h-10 cursor-pointer">
            <img src={tcLogo} alt="Tutoring Club Logo" className="h-full" />
          </Link>
          <span className="text-xl font-bold text-primary hidden sm:block">TC R cade</span>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <div className="flex items-center bg-amber-100 rounded-full px-3 py-1">
              <Coins className="h-4 w-4 text-amber-700 mr-1" />
              <span className="font-bold text-amber-700">{user.tokens}</span>
            </div>
          </div>
          
          <StreakBadge streakDays={user.streakDays} />
        </div>
      </div>
    </header>
  );
}
