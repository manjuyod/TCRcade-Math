import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { ProgressBar } from '@/components/progress-bar';
import { UserProgress } from '@shared/schema';
import { getGradeLabel } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/questions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  
  // Fetch user progress
  const { data: progressData, isLoading } = useQuery<UserProgress[]>({
    queryKey: ['/api/progress'],
    refetchOnWindowFocus: false
  });
  
  if (!user) return null;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto p-4">
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-purple-700 p-6 text-white">
            <div className="flex items-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mr-4">
                <span className="text-primary text-2xl font-bold">{user.initials}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user.displayName || user.username}</h2>
                <p className="text-white text-opacity-90">
                  {getGradeLabel(user.grade || 'K')}
                </p>
              </div>
            </div>
          </div>
          
          <CardContent className="p-0">
            <div className="grid grid-cols-3 gap-2 p-4">
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-primary">{user.tokens}</div>
                <div className="text-sm text-gray-600">Tokens</div>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-primary">{user.streakDays}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-primary">{user.questionsAnswered}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-dark mb-4">Your Progress</h3>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : progressData && progressData.length > 0 ? (
              progressData.map((progress) => {
                const percentage = Math.min(100, (progress.score / 100) * 100);
                
                return (
                  <div className="mb-4" key={progress.id}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700">{getCategoryLabel(progress.category)}</span>
                      <span className="text-primary font-bold">{Math.round(percentage)}%</span>
                    </div>
                    <ProgressBar progress={percentage} />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No progress data yet. Start playing to see your progress!</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-dark mb-4">Your Badges</h3>
            
            <div className="grid grid-cols-3 gap-4">
              {user.streakDays >= 3 && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                    <i className="ri-fire-line text-2xl text-primary"></i>
                  </div>
                  <span className="text-xs text-center text-gray-700">On Fire!</span>
                </div>
              )}
              
              {user.questionsAnswered >= 50 && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-secondary bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                    <i className="ri-question-line text-2xl text-secondary"></i>
                  </div>
                  <span className="text-xs text-center text-gray-700">Question Master</span>
                </div>
              )}
              
              {user.tokens >= 100 && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-accent bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                    <i className="ri-coin-line text-2xl text-accent"></i>
                  </div>
                  <span className="text-xs text-center text-gray-700">Token Collector</span>
                </div>
              )}
              
              {/* Show empty state if no badges */}
              {user.streakDays < 3 && user.questionsAnswered < 50 && user.tokens < 100 && (
                <div className="col-span-3 text-center py-4 text-gray-500">
                  <p>Keep playing to earn badges!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Button
          onClick={handleLogout}
          className="arcade-btn w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl mb-4"
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
        </Button>
      </main>
      
      <Navigation active="profile" />
    </div>
  );
}
