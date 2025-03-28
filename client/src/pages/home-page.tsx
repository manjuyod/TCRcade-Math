import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import QuestionCard from '@/components/question-card';
import FeedbackMessage from '@/components/feedback-message';
import { playSound, preloadSounds } from '@/lib/sounds';
import { fetchQuestion, submitAnswer } from '@/lib/questions';
import { ProgressBar } from '@/components/progress-bar';
import { queryClient } from '@/lib/queryClient';
import { Question } from '@shared/schema';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [feedbackData, setFeedbackData] = useState<{
    correct: boolean;
    tokensEarned: number;
    correctAnswer: string;
  } | null>(null);
  
  // Preload sounds when component mounts
  useEffect(() => {
    preloadSounds();
  }, []);
  
  // Fetch a question
  const { data: question, isLoading, refetch } = useQuery<Question>({
    queryKey: ['/api/questions'],
    refetchOnWindowFocus: false,
    staleTime: Infinity
  });
  
  // Submit answer mutation
  const answerMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: number; answer: string }) => 
      submitAnswer(questionId, answer),
    onSuccess: (data) => {
      // Play sound based on result
      playSound(data.correct ? 'correct' : 'incorrect');
      
      // Show feedback
      setFeedbackData({
        correct: data.correct,
        tokensEarned: data.tokensEarned,
        correctAnswer: data.correctAnswer
      });
      setShowFeedback(true);
      
      // Update user data
      if (user) {
        queryClient.setQueryData(['/api/user'], {
          ...user,
          tokens: data.totalTokens,
          questionsAnswered: user.questionsAnswered + 1,
          correctAnswers: user.correctAnswers + (data.correct ? 1 : 0)
        });
      }
    }
  });
  
  const handleAnswerSubmit = (answer: string) => {
    if (question) {
      answerMutation.mutate({ questionId: question.id, answer });
    }
  };
  
  const handleNextQuestion = () => {
    setShowFeedback(false);
    setFeedbackData(null);
    refetch();
  };
  
  // Calculate daily goal progress
  const dailyGoal = 20;
  const questionsAnsweredToday = user?.questionsAnswered || 0;
  const dailyProgress = Math.min(100, (questionsAnsweredToday / dailyGoal) * 100);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto p-4">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-dark">Daily Goal</h2>
            <span className="text-primary font-bold">
              {Math.min(questionsAnsweredToday, dailyGoal)}/{dailyGoal} questions
            </span>
          </div>
          <ProgressBar progress={dailyProgress} />
        </div>
        
        {isLoading || answerMutation.isPending ? (
          <div className="question-card bg-white p-6 rounded-3xl shadow-md mb-6 flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : showFeedback && feedbackData ? (
          <FeedbackMessage
            correct={feedbackData.correct}
            tokensEarned={feedbackData.tokensEarned}
            correctAnswer={feedbackData.correctAnswer}
            onNextQuestion={handleNextQuestion}
          />
        ) : question ? (
          <QuestionCard
            question={question}
            onAnswerSubmit={handleAnswerSubmit}
          />
        ) : (
          <div className="question-card bg-white p-6 rounded-3xl shadow-md mb-6 text-center">
            <p className="text-gray-500">No questions available for your grade level.</p>
          </div>
        )}
      </main>
      
      <Navigation active="play" />
    </div>
  );
}
