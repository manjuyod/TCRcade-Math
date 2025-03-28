import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import QuestionCard from '@/components/question-card';
import FeedbackMessage from '@/components/feedback-message';
import SessionComplete from '@/components/session-complete';
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
  
  // Session stats
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [sessionStats, setSessionStats] = useState({
    questionsAnswered: 0,
    correctAnswers: 0,
    tokensEarned: 0
  });
  
  // Track answered questions to prevent repetition
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<number[]>([]);
  const sessionSize = 20; // Size of a question session
  
  // Preload sounds when component mounts
  useEffect(() => {
    preloadSounds();
  }, []);
  
  // Fetch a question
  const { data: question, isLoading, refetch } = useQuery<Question>({
    queryKey: ['/api/questions', { answeredIds: answeredQuestionIds }],
    queryFn: () => fetchQuestion(answeredQuestionIds),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: 3,
    enabled: !sessionCompleted // Don't fetch new questions when session is complete
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
      
      // Add question to answered questions
      if (question) {
        setAnsweredQuestionIds(prev => [...prev, question.id]);
      }
      
      // Update session stats
      setSessionStats(prev => ({
        questionsAnswered: prev.questionsAnswered + 1,
        correctAnswers: prev.correctAnswers + (data.correct ? 1 : 0),
        tokensEarned: prev.tokensEarned + data.tokensEarned
      }));
      
      // Update user data
      if (user) {
        queryClient.setQueryData(['/api/user'], {
          ...user,
          tokens: data.totalTokens,
          questionsAnswered: user.questionsAnswered + 1,
          correctAnswers: user.correctAnswers + (data.correct ? 1 : 0)
        });
      }
      
      // Check if session is complete (20 questions)
      if (sessionStats.questionsAnswered + 1 >= sessionSize) {
        setTimeout(() => {
          setSessionCompleted(true);
          setShowFeedback(false);
        }, 2000); // Show feedback for 2 seconds before showing session complete
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
    
    // Pass the answeredQuestionIds to the server to avoid repeated questions
    refetch();
  };
  
  const handleStartNewSession = () => {
    // Reset session
    setSessionCompleted(false);
    setSessionStats({
      questionsAnswered: 0,
      correctAnswers: 0,
      tokensEarned: 0
    });
    setAnsweredQuestionIds([]);
    refetch();
  };
  
  // Calculate daily goal progress
  const dailyGoal = 20;
  const questionsAnsweredToday = user?.questionsAnswered || 0;
  const dailyProgress = Math.min(100, (questionsAnsweredToday / dailyGoal) * 100);
  
  // Check if current question has already been answered in this session
  useEffect(() => {
    if (question && answeredQuestionIds.includes(question.id) && answeredQuestionIds.length < 100) {
      // If we've already seen this question, fetch a new one
      console.log("Duplicate question detected, fetching new one");
      refetch();
    }
  }, [question, answeredQuestionIds, refetch]);
  
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
        
        {sessionCompleted ? (
          <SessionComplete
            correctAnswers={sessionStats.correctAnswers}
            totalQuestions={sessionStats.questionsAnswered}
            tokensEarned={sessionStats.tokensEarned}
            onStartNewSession={handleStartNewSession}
          />
        ) : isLoading || answerMutation.isPending ? (
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
        
        {/* Show session progress */}
        {!sessionCompleted && (
          <div className="mt-4 text-center">
            <span className="text-gray-600 text-sm">
              Session Progress: {sessionStats.questionsAnswered}/{sessionSize} questions
            </span>
          </div>
        )}
      </main>
      
      <Navigation active="play" />
    </div>
  );
}
