import { useAuth } from '@/hooks/use-auth';
import { StreakBadge } from './streak-badge';
import { Link } from 'wouter';

export default function Header() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center cursor-pointer">
              <span className="text-white text-lg font-bold">M</span>
            </div>
          </Link>
          <span className="text-xl font-bold text-dark hidden sm:block">Math Arcade</span>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <div className="flex items-center bg-accent rounded-full px-3 py-1">
              <i className="ri-coin-line text-yellow-800 mr-1"></i>
              <span className="font-bold text-yellow-800">{user.tokens}</span>
            </div>
          </div>
          
          <StreakBadge streakDays={user.streakDays} />
        </div>
      </div>
    </header>
  );
}
