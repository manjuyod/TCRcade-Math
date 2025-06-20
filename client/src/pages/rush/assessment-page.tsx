import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { tokenManager } from '@/lib/token-manager';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCountdownTimer } from '@/hooks/use-countdown-timer';
import { 
  ArrowRight, 
  Timer,
  Calculator,
  Minus,
  X,
  Divide,
  Check,
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

type AssessmentQuestion = {
  id: number;
  question: string;
  answer: string;
  options: string[];
  operator: string;
};

export default function MathRushAssessmentPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Get operator from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const operator = urlParams.get('operator') || 'addition';

  // State for assessment
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [answers, setAnswers] = useState<Array<{questionId: number, selectedAnswer: string, correctAnswer: string, isCorrect: boolean}>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showResults, setShowResults] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Timer for 1-minute assessment
  const { timeRemaining, isRunning, startTimer, stopTimer, resetTimer } = useCountdownTimer(60);

  // Fetch assessment questions
  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: ['/api/rush/assessment-questions', operator],
    queryFn: async () => {
      const response = await fetch(`/api/rush/assessment-questions?operator=${operator}`);
      if (!response.ok) {
        throw new Error('Failed to fetch assessment questions');
      }
      return response.json();
    },
    enabled: !!operator,
  });

  // Complete assessment mutation
  const completeAssessmentMutation = useMutation({
    mutationFn: async (data: { operator: string; score: number; answers: any[] }) => {
      return apiRequest('POST', '/api/rush/complete-assessment', data);
    },
    onSuccess: () => {
      const operatorName = operator.charAt(0).toUpperCase() + operator.slice(1);
      toast({
        title: "Assessment Complete!",
        description: `Math Rush ${operatorName} is now unlocked! You can access token runs and practice sessions.`,
      });
      // Navigate back to modules page
      setTimeout(() => {
        navigate('/modules');
      }, 2000);
    },
    onError: (error) => {
      console.error('Error completing assessment:', error);
      toast({
        title: "Error",
        description: "Failed to complete assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const questions = questionsData?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  // Handle time expiration
  const handleTimeExpired = () => {
    if (showResults || assessmentComplete) return;

    // Complete assessment with current answers
    const score = Math.round((answers.filter(a => a.isCorrect).length / Math.max(answers.length, 1)) * 100);
    setShowResults(true);

    // Submit assessment results
    completeAssessmentMutation.mutate({
      operator,
      score,
      answers
    });
  };

  // Handle timer completion
  useEffect(() => {
    if (timeRemaining <= 0 && isRunning && !timeExpired) {
      setTimeExpired(true);
      handleTimeExpired();
    }
  }, [timeRemaining, isRunning, timeExpired]);

  // Start assessment when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && !assessmentStarted && !showResults) {
      setAssessmentStarted(true);
      startTimer();
    }
  }, [questions, assessmentStarted, showResults, startTimer]);

  // Get icon for operator
  const getOperatorIcon = (op: string) => {
    switch (op) {
      case 'addition':
        return <Calculator className="h-6 w-6 text-blue-500" />;
      case 'subtraction':
        return <Minus className="h-6 w-6 text-red-500" />;
      case 'multiplication':
        return <X className="h-6 w-6 text-green-500" />;
      case 'division':
        return <Divide className="h-6 w-6 text-purple-500" />;
      default:
        return <Calculator className="h-6 w-6" />;
    }
  };

  // Handle answer submission
  const handleAnswerSubmit = () => {
    if (!userAnswer.trim() || timeExpired) return;

    const isCorrect = userAnswer.trim() === currentQuestion.answer.trim();
    const newAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: userAnswer.trim(),
      correctAnswer: currentQuestion.answer,
      isCorrect
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    // Update score and check for micro-token award
    if (isCorrect) {
      const newCorrectCount = correctCount + 1;
      setCorrectCount(newCorrectCount);

      // Award micro-tokens only every 3 correct answers (3, 6, 9, 12, etc.)
      if (newCorrectCount % 3 === 0) {
        const tokensEarned = tokenManager.updateTokens(operator, newCorrectCount);
        if (tokensEarned > 0) {
          toast({
            title: "Tokens Earned!",
            description: `+${tokensEarned} token${tokensEarned > 1 ? 's' : ''} for ${newCorrectCount} correct answers!`,
            duration: 2000,
          });
        }
      }
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer('');
      // Focus the input for next question
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Assessment complete
      stopTimer();
      const score = Math.round((newAnswers.filter(a => a.isCorrect).length / newAnswers.length) * 100);
      setShowResults(true);

      // Submit assessment results
      completeAssessmentMutation.mutate({
        operator,
        score,
        answers: newAnswers
      });
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnswerSubmit();
    }
  };

  if (questionsLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <Navigation active="home" />

        <main className="flex-1 container max-w-4xl py-6 px-4 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-center text-muted-foreground">
                  Loading assessment questions...
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (showResults) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalCount = answers.length;
    const score = Math.round((correctCount / totalCount) * 100);

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <Navigation active="home" />

        <main className="flex-1 container max-w-4xl py-6 px-4 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  {getOperatorIcon(operator)}
                </div>
                <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
                <CardDescription>
                  {operator.charAt(0).toUpperCase() + operator.slice(1)} Assessment Results (24 questions, 1 minute)
                  {timeExpired && (
                    <div className="text-red-600 mt-1 text-sm">Time expired!</div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {score}%
                  </div>
                  <p className="text-muted-foreground">
                    {correctCount} out of {totalCount} correct
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span>Assessment completed successfully</span>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  You can now access Math Rush token runs for {operator}!
                </p>

                {completeAssessmentMutation.isPending && (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Saving results...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <Navigation active="home" />

        <main className="flex-1 container max-w-4xl py-6 px-4 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-center text-muted-foreground">
                  No assessment questions available. Please try again.
                </p>
                <Button onClick={() => navigate('/modules')}>
                  Back to Modules
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <Navigation active="home" />

      <main className="flex-1 container max-w-4xl py-6 px-4">
        <div className="mb-6 flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => navigate('/modules')}
          >
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Modules
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full">
            <CardHeader className="bg-primary text-primary-foreground">
              <CardTitle className="text-xl flex items-center">
                {getOperatorIcon(operator)}
                <span className="ml-2">
                  {operator.charAt(0).toUpperCase() + operator.slice(1)} Assessment
                </span>
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Complete this assessment to unlock Math Rush token runs
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Timer and Progress indicator */}
                <div className="space-y-4">
                  {/* Timer */}
                  <div className="flex items-center justify-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <Clock className={`h-5 w-5 ${timeRemaining <= 10 ? 'text-red-600 animate-pulse' : 'text-red-500'}`} />
                    <span className={`font-bold text-lg ${timeRemaining <= 10 ? 'text-red-600' : 'text-red-500'}`}>
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-sm text-red-600">remaining</span>
                  </div>

                  {/* Progress indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                      <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Question */}
                <div className="text-center">
                  <div className="text-3xl font-bold mb-6 p-4 bg-secondary rounded-lg">
                    {currentQuestion.question}
                  </div>
                </div>

                {/* Answer input */}
                <div className="space-y-4">
                  <div className="text-center">
                    <label htmlFor="answer-input" className="block text-lg font-medium mb-2">
                      Type your answer:
                    </label>
                    <Input
                      id="answer-input"
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9-]*"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter your answer"
                      className="text-center text-2xl h-16 max-w-xs mx-auto"
                      disabled={timeExpired}
                      autoFocus
                    />
                  </div>

                  {/* Submit button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={handleAnswerSubmit}
                      disabled={!userAnswer.trim() || timeExpired}
                      className="min-w-32 h-12 text-lg"
                    >
                      {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Complete'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}