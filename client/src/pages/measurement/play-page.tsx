import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ruler, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Timer, 
  Trophy,
  Play,
  Home
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import type { MeasurementQuestion, MeasurementSessionResult } from '@shared/measurementRules';

interface QuestionState {
  question: MeasurementQuestion;
  selectedAnswer: string | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  showFeedback: boolean;
}

export default function MeasurementPlayPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get the run type from localStorage
  const runType = localStorage.getItem('measurementRunType') || 'practice';

  // Session state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [sessionStartTime] = useState(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Date.now() - sessionStartTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Format time display
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Fetch questions for the session
  const { data: fetchedQuestions, isLoading } = useQuery<MeasurementQuestion[]>({
    queryKey: ['/api/measurement/questions', runType],
    enabled: !!user && questions.length === 0,
  });

  // Initialize questions when data arrives
  useEffect(() => {
    if (fetchedQuestions && questions.length === 0) {
      setQuestions(fetchedQuestions.map(q => ({
        question: q,
        selectedAnswer: null,
        isAnswered: false,
        isCorrect: null,
        showFeedback: false
      })));
    }
  }, [fetchedQuestions, questions.length]);

  // Submit session mutation
  const submitSessionMutation = useMutation({
    mutationFn: async (sessionData: any): Promise<MeasurementSessionResult> => {
      return apiRequest('/api/measurement/submit-session', {
        method: 'POST',
        body: sessionData
      });
    },
    onSuccess: (result: MeasurementSessionResult) => {
      // Store results for the complete page
      localStorage.setItem('measurementSessionResult', JSON.stringify(result));
      navigate('/measurement/complete');
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/measurement/progress'] });
    },
    onError: (error) => {
      toast({
        title: "Session Error",
        description: "Failed to submit session. Please try again.",
        variant: "destructive"
      });
      console.error('Session submission error:', error);
    }
  });

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion || currentQuestion.isAnswered) return;

    const updatedQuestions = [...questions];
    const isCorrect = answer === currentQuestion.question.CorrectAnswer;
    
    updatedQuestions[currentQuestionIndex] = {
      ...currentQuestion,
      selectedAnswer: answer,
      isAnswered: true,
      isCorrect,
      showFeedback: true
    };
    
    setQuestions(updatedQuestions);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeSession();
    }
  };

  const completeSession = () => {
    const correctAnswers = questions.filter(q => q.isCorrect).length;
    const totalQuestions = questions.length;
    
    const sessionData = {
      runType,
      questions: questions.map(q => ({
        questionId: q.question.id,
        selectedAnswer: q.selectedAnswer,
        isCorrect: q.isCorrect,
        timeSpent: Math.floor(timeElapsed / questions.length) // Average time per question
      })),
      totalTime: Math.floor(timeElapsed / 1000),
      score: Math.round((correctAnswers / totalQuestions) * 100)
    };

    submitSessionMutation.mutate(sessionData);
    setIsSessionComplete(true);
  };

  // Loading state
  if (isLoading || questions.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Ruler className="h-12 w-12 animate-pulse text-purple-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading questions...</p>
          </div>
        </main>
        <Navigation active="practice" />
      </div>
    );
  }

  // Session complete state
  if (isSessionComplete && submitSessionMutation.isPending) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="h-12 w-12 animate-pulse text-amber-500 mx-auto mb-4" />
            <p className="text-gray-600">Submitting your results...</p>
          </div>
        </main>
        <Navigation active="practice" />
      </div>
    );
  }

  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Session Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Ruler className="h-8 w-8 text-purple-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Measurement Mastery</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    runType === 'token' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {runType === 'token' ? 'Token Run' : 'Practice Run'}
                  </span>
                  <span className="flex items-center">
                    <Timer className="h-4 w-4 mr-1" />
                    {formatTime(timeElapsed)}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/modules')}
              className="flex items-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>Exit</span>
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(progressPercentage)}% Complete
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {currentQuestion.question.AnswerBank.question.text}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* SVG Display */}
                    {currentQuestion.question.AnswerBank.question.svg && (
                      <div className="mb-6 flex justify-center">
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: currentQuestion.question.AnswerBank.question.svg 
                          }}
                          className="max-w-full"
                        />
                      </div>
                    )}

                    {/* Answer Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      {currentQuestion.question.AnswerBank.options.map((option, index) => {
                        const isSelected = currentQuestion.selectedAnswer === option.label;
                        const isCorrect = option.label === currentQuestion.question.CorrectAnswer;
                        const showResult = currentQuestion.showFeedback;
                        
                        let buttonClass = "p-4 text-left border-2 rounded-lg transition-all duration-200 ";
                        
                        if (!showResult) {
                          buttonClass += isSelected 
                            ? "border-purple-500 bg-purple-50" 
                            : "border-gray-200 hover:border-purple-300 hover:bg-purple-25";
                        } else {
                          if (isCorrect) {
                            buttonClass += "border-green-500 bg-green-50";
                          } else if (isSelected && !isCorrect) {
                            buttonClass += "border-red-500 bg-red-50";
                          } else {
                            buttonClass += "border-gray-200 bg-gray-50";
                          }
                        }

                        return (
                          <button
                            key={index}
                            onClick={() => handleAnswerSelect(option.label)}
                            disabled={currentQuestion.isAnswered}
                            className={buttonClass}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">
                                  {option.label}. {option.text}
                                </div>
                                {option.svg && (
                                  <div 
                                    dangerouslySetInnerHTML={{ __html: option.svg }}
                                    className="mt-2"
                                  />
                                )}
                              </div>
                              {showResult && (
                                <div className="ml-4">
                                  {isCorrect ? (
                                    <CheckCircle className="h-6 w-6 text-green-500" />
                                  ) : isSelected ? (
                                    <XCircle className="h-6 w-6 text-red-500" />
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback and Next Button */}
                    {currentQuestion.showFeedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                      >
                        <div className={`p-4 rounded-lg mb-4 ${
                          currentQuestion.isCorrect 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {currentQuestion.isCorrect ? (
                            <div className="flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 mr-2" />
                              Correct! Well done.
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <XCircle className="h-5 w-5 mr-2" />
                              Incorrect. The correct answer is {currentQuestion.question.CorrectAnswer}.
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={handleNextQuestion}
                          className="bg-purple-600 hover:bg-purple-700"
                          disabled={submitSessionMutation.isPending}
                        >
                          {currentQuestionIndex < questions.length - 1 ? (
                            <>
                              Next Question
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          ) : (
                            'Complete Session'
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Navigation active="practice" />
    </div>
  );
}