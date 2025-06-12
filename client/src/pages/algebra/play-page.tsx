import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calculator, Clock, Trophy, CheckCircle, XCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { parseAlgebraText, checkAlgebraAnswer } from '@shared/algebraRules';
import { useSessionPrevention } from '@/hooks/use-session-prevention';

interface AlgebraQuestion {
  id: number;
  GradeLevel: number;
  Lesson: number;
  Title: string;
  Section: string;
  Type: string;
  AnswerBank: any;
  CorrectAnswer: string;
  category: string;
  questionText: string;
  options: string[];
  correctAnswers: string[];
}

interface QuestionResult {
  questionId: number;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

export default function AlgebraPlayPage() {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Session management
  const { endSession } = useSessionPrevention({ 
    isActive: true, 
    allowedPaths: ['/algebra/complete'] 
  });
  
  // Get run type from URL params
  const runType = new URLSearchParams(window.location.search).get('runType') || 'practice';
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [sessionStartTime] = useState(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);

  // Load questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ['/api/algebra/questions', { runType }],
  });

  // Submit session mutation
  const submitSessionMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      const response = await fetch('/api/algebra/submit-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit session');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/algebra/progress'] });
      
      // Navigate to completion page with results
      setLocation(`/algebra/complete?${new URLSearchParams({
        runType,
        tokensEarned: data.tokensEarned.toString(),
        score: data.score.toString(),
        correctAnswers: data.correctAnswers.toString(),
        totalQuestions: data.totalQuestions.toString(),
        levelChanged: data.levelChange?.levelChanged ? 'true' : 'false',
        levelDirection: data.levelChange?.direction || '',
        newLevel: data.levelChange?.newLevel?.toString() || ''
      }).toString()}`);
    },
  });

  const questionsArray = (questions as AlgebraQuestion[]) || [];
  const currentQuestion = questionsArray[currentQuestionIndex];
  const totalQuestions = questionsArray.length;
  const progressPercent = totalQuestions > 0 ? (currentQuestionIndex / totalQuestions) * 100 : 0;

  useEffect(() => {
    if (currentQuestion) {
      setQuestionStartTime(Date.now());
      setUserAnswer('');
      setShowFeedback(false);
    }
  }, [currentQuestionIndex, currentQuestion]);

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    const timeSpent = Date.now() - questionStartTime;
    const isCorrect = checkAlgebraAnswer(userAnswer, currentQuestion.correctAnswers);
    
    setIsAnswerCorrect(isCorrect);
    setShowFeedback(true);

    // Record the result
    const result: QuestionResult = {
      questionId: currentQuestion.id,
      userAnswer: userAnswer.trim(),
      isCorrect,
      timeSpent,
    };

    setQuestionResults(prev => [...prev, result]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Session complete - submit results
      const sessionData = {
        runType,
        questions: questionResults.map(result => ({
          ...result,
          isCorrect: result.isCorrect
        })),
        totalTime: Date.now() - sessionStartTime,
        score: questionResults.filter(r => r.isCorrect).length / questionResults.length,
      };

      submitSessionMutation.mutate(sessionData);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading algebra questions...</div>
      </div>
    );
  }

  if (!questionsArray || questionsArray.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-lg mb-4">No questions available for this level.</p>
            <Button onClick={() => setLocation('/algebra/setup')}>
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitSessionMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-lg">Processing your session...</div>
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Pre-Algebra Basics</h1>
            <Badge variant={runType === 'practice' ? 'secondary' : 'default'} className={runType === 'token' ? 'bg-purple-600' : ''}>
              {runType === 'practice' ? 'Practice' : 'Token Run'}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              {Math.floor((Date.now() - sessionStartTime) / 1000 / 60)}:{String(Math.floor(((Date.now() - sessionStartTime) / 1000) % 60)).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            <span>{Math.round(progressPercent)}% complete</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="bg-white/90 backdrop-blur-sm border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-purple-600">Q{currentQuestionIndex + 1}</span>
              </div>
              {runType === 'token' && (
                <Badge className="bg-purple-600">
                  <Trophy className="w-3 h-3 mr-1" />
                  Token Question
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Text */}
            <div className="text-lg leading-relaxed">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: parseAlgebraText(currentQuestion?.Title || currentQuestion?.questionText || 'No question text available') 
                }} 
              />
            </div>

            {/* Answer Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer:
                </label>
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Enter your answer here..."
                  className="text-lg h-12"
                  disabled={showFeedback}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !showFeedback) {
                      handleSubmitAnswer();
                    }
                  }}
                />
              </div>

              {/* Feedback */}
              {showFeedback && (
                <div className={`p-4 rounded-lg border-2 ${
                  isAnswerCorrect 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isAnswerCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-medium ${isAnswerCorrect ? 'text-green-800' : 'text-red-800'}`}>
                      {isAnswerCorrect ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                  {!isAnswerCorrect && (
                    <p className="text-red-700 text-sm">
                      The correct answer{currentQuestion.correctAnswers.length > 1 ? 's are' : ' is'}: {currentQuestion.correctAnswers.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                {!showFeedback ? (
                  <Button 
                    onClick={handleSubmitAnswer}
                    disabled={!userAnswer.trim()}
                    className="bg-purple-600 hover:bg-purple-700 px-8"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button 
                    onClick={handleNextQuestion}
                    className="bg-purple-600 hover:bg-purple-700 px-8"
                  >
                    {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Complete Session'}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/algebra/setup')}
                >
                  Exit Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Stats */}
        <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {questionResults.filter(r => r.isCorrect).length}
                </p>
                <p className="text-sm text-gray-600">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-700">
                  {questionResults.length}
                </p>
                <p className="text-sm text-gray-600">Answered</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {questionResults.length > 0 ? Math.round((questionResults.filter(r => r.isCorrect).length / questionResults.length) * 100) : 0}%
                </p>
                <p className="text-sm text-gray-600">Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}