import { useAuth } from '@/hooks/use-auth';
import { useQuery} from '@tanstack/react-query';
import axios from 'axios';
import { StreakBadge } from './streak-badge';
import { Link } from 'wouter';
import { Coins } from 'lucide-react';
import tcLogo from '../assets/tc-logo.png';


export default function Header() {
  const { user: authUser } = useAuth();
  const { data: user } = useQuery({
                                   queryKey: ['/api/user'],
                                   queryFn: () => axios.get('/api/user').then((res) => res.data),
                                   refetchOnMount: true,
                                   refetchOnWindowFocus: true,
                                   enabled: !!authUser, // wait until the auth user is available
                                 });)
  if (!user) return null;
  
  return (
    <header className="bg-white shadow-sm py-1.5 px-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/modules" className="h-8 cursor-pointer">
            <img src={tcLogo} alt="Tutoring Club Logo" className="h-full" />
          </Link>
          <span className="text-base font-bold text-primary hidden sm:block">tcRCADE</span>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center mr-3">
            <div className="flex items-center bg-amber-100 rounded-full px-2 py-1">
              <Coins className="h-4 w-4 text-amber-700 mr-1" />
              <span className="text-sm font-bold text-amber-700">
                {/* Format tokens to handle large numbers: 1000 -> 1K, 1000000 -> 1M */}
                {user.tokens >= 1000000 
                  ? `${Math.floor(user.tokens / 1000000)}M` 
                  : user.tokens >= 1000 
                    ? `${Math.floor(user.tokens / 1000)}K` 
                    : user.tokens}
              </span>
            </div>
          </div>
          
          <StreakBadge streakDays={user.streakDays} size="sm" />
        </div>
      </div>
    </header>
  );
}
