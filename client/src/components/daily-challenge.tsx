import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { playSound } from '@/lib/sounds';
import { DailyChallenge, Question } from '@shared/schema';
import { Loader2, Calendar, Trophy, Flame, Star, Gift, CalendarClock } from 'lucide-react';
import QuestionCard from './question-card';
import FeedbackMessage from './feedback-message';
import confetti from 'canvas-confetti';

export default function DailyChallengeComponent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeChallenge, setActiveChallenge] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    correct: boolean;
    tokensEarned: number;
    correctAnswer: string;
  } | null>(null);
  const [challengeComplete, setChallengeComplete] = useState(false);

  // Fetch today's challenge
  const { 
    data: challenge, 
    isLoading: isLoadingChallenge, 
    error: challengeError 
  } = useQuery({
    queryKey: ['/api/daily-challenge/current'],
    queryFn: async () => {
      const res = await fetch('/api/daily-challenge/current');
      if (!res.ok) throw new Error('Failed to fetch daily challenge');
      return res.json() as Promise<{
        challenge: DailyChallenge & { questions?: Question[] };
        status: { completed: boolean; currentStreak: number };
      }>;
    }
  });

  // Submit challenge completion
  const completeMutation = useMutation({
    mutationFn: async (data: { challengeId: number; score: number }) => {
      const res = await apiRequest('POST', '/api/daily-challenge/complete', data);
      if (!res.ok) throw new Error('Failed to complete challenge');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-challenge/current'] });
      
      // Launch confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Play sound based on streak
      const streak = data.dailyChallengeStreak || 0;
      if (streak >= 20) playSound('streak20');
      else if (streak >= 10) playSound('streak10');
      else if (streak >= 5) playSound('streak5');
      else playSound('streak');
      
      toast({
        title: 'Challenge Completed!',
        description: `You earned ${data.tokensEarned} tokens. Current streak: ${data.dailyChallengeStreak} days!`,
        variant: 'default',
      });
      
      setChallengeComplete(true);
    },
    onError: (error) => {
      toast({
        title: 'Error completing challenge',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Handle starting the challenge
  const handleStartChallenge = () => {
    setActiveChallenge(true);
    setCurrentQuestionIndex(0);
    setScore(0);
    setChallengeComplete(false);
  };

  // Handle answering a question
  const handleAnswerSubmit = (answer: string) => {
    const questions = challenge?.challenge?.questions || [];
    if (!questions[currentQuestionIndex]) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer.toLowerCase() === currentQuestion.answer.toLowerCase();
    
    // Play appropriate sound
    isCorrect ? playSound('correct') : playSound('incorrect');
    
    // Update score if correct
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    // Set feedback data
    setFeedbackData({
      correct: isCorrect,
      tokensEarned: isCorrect ? 10 : 0,
      correctAnswer: currentQuestion.answer
    });
    
    // Show feedback
    setShowFeedback(true);
  };

  // Handle moving to the next question
  const handleNextQuestion = () => {
    setShowFeedback(false);
    const questions = challenge?.challenge?.questions || [];
    const questionsLength = questions.length || 0;
    
    if (currentQuestionIndex < questionsLength - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Challenge complete, submit results
      if (challenge?.challenge) {
        completeMutation.mutate({
          challengeId: challenge.challenge.id,
          score: score + (feedbackData?.correct ? 1 : 0) // Include current question if correct
        });
      }
    }
  };

  // Display calendar rewards and streak section
  const renderStreakCalendar = () => {
    const currentStreak = challenge?.status?.currentStreak || 0;
    
    return (
      <div className="streak-calendar mb-6">
        <h3 className="text-lg font-semibold flex items-center mb-3">
          <Calendar className="mr-2 h-5 w-5" />
          Daily Streak
        </h3>
        
        <div className="flex items-center mb-4">
          <div className="flex items-center bg-orange-100 text-orange-700 px-3 py-1 rounded-full mr-4">
            <Flame className="h-4 w-4 mr-1" />
            <span className="font-bold">{currentStreak}</span>
            <span className="ml-1 text-sm font-medium">days</span>
          </div>
          
          <div className="text-sm text-gray-600">
            {currentStreak > 0 
              ? `You're on a roll! Keep your streak going.` 
              : `Start your streak today!`}
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-4">
          {Array.from({ length: 7 }).map((_, i) => {
            const day = i + 1;
            const isActive = currentStreak >= day;
            
            return (
              <div 
                key={day} 
                className={`
                  flex flex-col items-center justify-center p-1 rounded-lg
                  ${isActive ? 'bg-gradient-to-br from-primary to-primary/80 text-white' : 'bg-gray-100 text-gray-400'}
                `}
              >
                <div className="text-xs font-medium mb-1">{day}d</div>
                <div className="text-xs">
                  {day <= 3 ? '+10' : day <= 5 ? '+20' : '+30'}
                </div>
                <Star className={`h-3 w-3 ${isActive ? 'text-yellow-300' : 'text-gray-300'}`} />
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <div>Day 1</div>
          <div>Day 7</div>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoadingChallenge) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading daily challenge...</p>
      </div>
    );
  }

  // Error state
  if (challengeError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Challenge</CardTitle>
          <CardDescription>Something went wrong</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load daily challenge.</p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/daily-challenge/current'] })}
          >
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Challenge already completed today
  if (challenge?.status?.completed && !activeChallenge) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
            Challenge Completed
          </CardTitle>
          <CardDescription>You've already completed today's challenge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Streak: {challenge.status.currentStreak} days</p>
              <p className="text-sm text-muted-foreground">Come back tomorrow for a new challenge!</p>
            </div>
          </div>
          
          {renderStreakCalendar()}
          
          <div className="relative mt-4 pt-4 border-t border-gray-100">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              Next challenge in {getNextChallengeTime()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active challenge view
  if (activeChallenge && !challengeComplete) {
    const currentQuestion = challenge?.challenge?.questions?.[currentQuestionIndex];
    
    if (showFeedback && feedbackData) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Daily Challenge</CardTitle>
            <CardDescription>
              Question {currentQuestionIndex + 1} of {(challenge?.challenge?.questions || []).length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackMessage
              correct={feedbackData.correct}
              tokensEarned={feedbackData.tokensEarned}
              correctAnswer={feedbackData.correctAnswer}
              onNextQuestion={handleNextQuestion}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm">
              Score: <Badge variant="outline">{score}/{currentQuestionIndex + 1}</Badge>
            </div>
            <Button onClick={handleNextQuestion}>
              {currentQuestionIndex < ((challenge?.challenge?.questions || []).length) - 1 
                ? 'Next Question' 
                : 'Complete Challenge'}
            </Button>
          </CardFooter>
        </Card>
      );
    }
    
    if (currentQuestion) {
      return (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Daily Challenge</CardTitle>
              <Badge variant="outline">
                {currentQuestionIndex + 1}/{(challenge?.challenge?.questions || []).length}
              </Badge>
            </div>
            <CardDescription>
              Answer correctly to earn tokens and maintain your streak!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress className="mb-4" value={(currentQuestionIndex / ((challenge?.challenge?.questions || []).length || 1)) * 100} />
            <QuestionCard
              question={currentQuestion}
              onAnswerSubmit={handleAnswerSubmit}
            />
          </CardContent>
        </Card>
      );
    }
    
    return null;
  }

  // Challenge completion screen
  if (challengeComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
            Challenge Complete!
          </CardTitle>
          <CardDescription>You've completed today's challenge</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mb-6 py-4">
            <div className="text-5xl font-bold mb-2">{score}/{(challenge?.challenge?.questions || []).length}</div>
            <p className="text-muted-foreground">Questions answered correctly</p>
          </div>
          
          <div className="flex justify-center mb-6">
            <Badge variant="outline" className="px-4 py-2 text-base flex items-center">
              <Flame className="mr-2 h-4 w-4 text-orange-500" />
              <span className="font-semibold">{challenge?.status?.currentStreak || 1}</span>
              <span className="ml-1">day streak</span>
            </Badge>
          </div>
          
          {renderStreakCalendar()}
          
          <div className="flex items-center justify-center mt-4">
            <Gift className="h-5 w-5 text-primary mr-2" />
            <span className="text-lg font-medium">Come back tomorrow for a new challenge!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default challenge view
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Challenge</CardTitle>
        <CardDescription>Complete daily challenges to earn bonus tokens!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Today's Challenge</h3>
          <p>{challenge?.challenge?.description || 'Test your math skills with a special set of questions'}</p>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center">
              <Star className="h-3 w-3 mr-1 text-yellow-500" />
              Difficulty: {challenge?.challenge?.difficulty || 'Medium'}
            </Badge>
            <Badge variant="outline" className="flex items-center">
              <Trophy className="h-3 w-3 mr-1 text-primary" />
              {(challenge?.challenge?.questions || []).length || 5} Questions
            </Badge>
          </div>
        </div>
        
        {renderStreakCalendar()}
        
        <div className="bg-muted p-4 rounded-lg mb-6">
          <h4 className="font-semibold mb-2">Rewards</h4>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center">
              <Gift className="h-3 w-3 mr-2 text-primary" />
              Base reward: 20 tokens
            </li>
            <li className="flex items-center">
              <Flame className="h-3 w-3 mr-2 text-orange-500" />
              Streak bonus: +5 tokens per day (up to 100)
            </li>
            <li className="flex items-center">
              <Star className="h-3 w-3 mr-2 text-yellow-500" />
              Perfect score: +10 tokens
            </li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleStartChallenge}
          disabled={challenge?.status?.completed}
        >
          {challenge?.status?.completed 
            ? 'Already Completed Today' 
            : 'Start Daily Challenge'}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Helper function to format time until next challenge
function getNextChallengeTime(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diffMs = tomorrow.getTime() - now.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${diffHrs}h ${diffMins}m`;
}