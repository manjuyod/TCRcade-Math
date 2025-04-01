import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { User } from '@shared/schema';
import { getGradeLabel } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type LeaderboardEntry = User & { score: number };

export default function LeaderboardPage() {
  const { user } = useAuth();
  
  // Fetch leaderboard data
  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/leaderboard'],
    refetchOnWindowFocus: false
  });
  
  if (!user) return null;
  
  // Find user's position in leaderboard
  const userPosition = leaderboard?.findIndex(entry => entry.id === user.id) || -1;
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark mb-2">Leaderboard</h1>
          <p className="text-gray-500">See who's on top this week!</p>
        </div>
        
        {isLoading ? (
          <div className="bg-white rounded-3xl shadow-md p-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <div className="bg-white rounded-3xl shadow-md overflow-hidden mb-6">
            {/* Top 3 Players */}
            <div className="flex justify-center items-end p-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
              {leaderboard.length >= 2 && (
                /* 2nd Place */
                <div className="flex flex-col items-center mx-4">
                  <div className="w-16 h-16 bg-orange-400 rounded-full border-4 border-white flex items-center justify-center mb-2">
                    <span className="text-white text-xl font-bold">{leaderboard[1].initials}</span>
                  </div>
                  <div className="bg-accent py-1 px-3 rounded-full">
                    <span className="text-xs font-bold">{leaderboard[1].score}</span>
                  </div>
                  <div className="h-20 w-full bg-white bg-opacity-20 mt-2 rounded-t-lg flex items-end justify-center">
                    <span className="text-white font-bold mb-2">2nd</span>
                  </div>
                </div>
              )}
              
              {leaderboard.length >= 1 && (
                /* 1st Place */
                <div className="flex flex-col items-center mx-4">
                  <div className="w-20 h-20 bg-orange-500 rounded-full border-4 border-white flex items-center justify-center mb-2 relative">
                    <span className="text-white text-2xl font-bold">{leaderboard[0].initials}</span>
                    <div className="absolute -top-6">
                      <i className="ri-award-fill text-4xl text-yellow-400"></i>
                    </div>
                  </div>
                  <div className="bg-accent py-1 px-3 rounded-full">
                    <span className="text-xs font-bold">{leaderboard[0].score}</span>
                  </div>
                  <div className="h-28 w-full bg-white bg-opacity-20 mt-2 rounded-t-lg flex items-end justify-center">
                    <span className="text-white font-bold mb-2">1st</span>
                  </div>
                </div>
              )}
              
              {leaderboard.length >= 3 && (
                /* 3rd Place */
                <div className="flex flex-col items-center mx-4">
                  <div className="w-16 h-16 bg-orange-300 rounded-full border-4 border-white flex items-center justify-center mb-2">
                    <span className="text-white text-xl font-bold">{leaderboard[2].initials}</span>
                  </div>
                  <div className="bg-accent py-1 px-3 rounded-full">
                    <span className="text-xs font-bold">{leaderboard[2].score}</span>
                  </div>
                  <div className="h-16 w-full bg-white bg-opacity-20 mt-2 rounded-t-lg flex items-end justify-center">
                    <span className="text-white font-bold mb-2">3rd</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Rest of Leaderboard */}
            <div className="p-4">
              {leaderboard.slice(3).map((entry, index) => (
                <div key={entry.id} className="leaderboard-item flex items-center p-3 border-b border-gray-100">
                  <span className="text-lg font-bold text-white w-10 h-10 flex items-center justify-center rounded-full bg-orange-500">{index + 4}</span>
                  <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center mx-3">
                    <span className="text-white font-bold text-sm">{entry.initials}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-dark font-bold">{entry.displayName || entry.username}</span>
                    <span className="text-xs text-gray-500 ml-2">{getGradeLabel(entry.grade || 'K')}</span>
                  </div>
                  <div className="bg-accent bg-opacity-10 py-1 px-3 rounded-full">
                    <span className="text-xs font-bold text-yellow-800">{entry.score}</span>
                  </div>
                </div>
              ))}
              
              {/* User's Position (if not in top 10) */}
              {userPosition > 9 && (
                <div className="leaderboard-item flex items-center p-3 bg-primary bg-opacity-5 rounded-xl mt-4">
                  <span className="text-lg font-bold text-primary w-10 text-center">{userPosition + 1}</span>
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-3">
                    <span className="text-white font-bold text-sm">YOU</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-dark font-bold">{user.displayName || user.username}</span>
                    <span className="text-xs text-gray-500 ml-2">{getGradeLabel(user.grade || 'K')}</span>
                  </div>
                  <div className="bg-accent py-1 px-3 rounded-full">
                    <span className="text-xs font-bold text-yellow-800">{user.tokens}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-md p-8 text-center">
            <p className="text-gray-500">No leaderboard data available yet. Start playing to get on the board!</p>
          </div>
        )}
      </main>
      
      <Navigation active="leaderboard" />
    </div>
  );
}
