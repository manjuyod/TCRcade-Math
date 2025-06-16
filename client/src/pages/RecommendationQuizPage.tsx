
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Brain, Target, Clock, Star, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface Question {
  id: number;
  question: string;
  answer: string;
  options: string[];
  category: string;
  difficulty: number;
  concepts: string[];
  grade?: string;
}

interface QuestionRecommendation {
  questionId: number;
  score: number;
  reasoning: string;
  category: string;
  difficulty: number;
  concepts: string[];
  recommendationType: 'review' | 'advance' | 'reinforce' | 'challenge' | 'remediate';
  priority: 'high' | 'medium' | 'low';
}

interface RecommendationResponse {
  recommendations: QuestionRecommendation[];
  sessionMetadata: {
    sessionId: string;
    userId: number;
    startTime: string;
    estimatedDuration: number;
    targetConcepts: string[];
    difficultyRange: [number, number];
  };
  adaptiveSettings: {
    initialDifficulty: number;
    difficultyAdjustmentRate: number;
    masteryThreshold: number;
    spacedRepetitionInterval: number;
  };
}

export default function RecommendationQuizPage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Array<{
    questionId: number;
    answer: string;
    correct: boolean;
    timeSpent: number;
    startTime: number;
  }>>([]);
  const [sessionStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGeneratingAnalytics, setIsGeneratingAnalytics] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user has analytics data - REQUIRED prerequisite
  const { data: analyticsData, isLoading: isLoadingAnalytics, error: analyticsError } = useQuery({
    queryKey: ['/api/analytics'],
    queryFn: () => apiRequest('GET', '/api/analytics'),
    enabled: !!user
  });

  // Generate analytics if needed - REQUIRED before accessing recommendations
  const generateAnalyticsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/analytics/generate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      setIsGeneratingAnalytics(false);
    },
    onError: (error) => {
      console.error('Failed to generate analytics:', error);
      setIsGeneratingAnalytics(false);
      toast({
        title: "Analytics Generation Failed",
        description: "Unable to generate analytics. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Validate modules based on total_questions_answered in hidden_grade_asset
  const validateModuleEligibility = (hiddenGradeAsset: any): string[] => {
    if (!hiddenGradeAsset || typeof hiddenGradeAsset !== 'object') {
      return [];
    }

    const validModules = Object.keys(hiddenGradeAsset).filter(moduleKey => {
      const moduleData = hiddenGradeAsset[moduleKey];
      return moduleData && 
             typeof moduleData === 'object' && 
             typeof moduleData.total_questions_answered === 'number' &&
             moduleData.total_questions_answered > 0;
    });

    console.log('Valid modules with questions answered:', validModules);
    return validModules;
  };

  // Fetch recommendations based on analytics and module validation
  const { data: recommendationData, isLoading: isLoadingRecommendations, error: recommendationError } = useQuery({
    queryKey: ['/api/recommendations', user?.id, analyticsData],
    queryFn: async () => {
      console.log('Fetching recommendations with analytics data:', analyticsData);
      
      // ANALYTICS PREREQUISITE CHECK - Block access if no analytics
      if (!analyticsData?.analytics?.analytics) {
        throw new Error('Analytics data required before accessing recommendations');
      }

      // MODULE VALIDATION - Only recommend modules with prior attempts
      const validModules = validateModuleEligibility(user?.hiddenGradeAsset);
      if (validModules.length === 0) {
        throw new Error('No modules with question attempts found');
      }

      // Extract weak concepts from analytics
      const analytics = analyticsData.analytics.analytics;
      const weakConcepts = analytics.weaknessConcepts || 
                          analytics.areasForImprovement || 
                          [];

      console.log('Fetching personalized recommendations...');
      
      // Use the new streamlined recommendation endpoint
      const response = await apiRequest('GET', '/api/recommendations');
      
      return response;
    },
    enabled: !!analyticsData?.analytics && !isGeneratingAnalytics,
    retry: 1
  });

  // Handle new API response format
  useEffect(() => {
    const processRecommendationData = async () => {
      if (!recommendationData?.questions) return;

      try {
        console.log('Processing personalized questions:', recommendationData.questions);
        
        // Questions are already provided in the new format
        const validQuestions = recommendationData.questions.filter((q: any) => q && q.question);
        
        console.log('Valid questions:', validQuestions);
        setQuestions(validQuestions);
        
        // Set session metadata
        if (recommendationData.sessionMetadata) {
          setSessionId(recommendationData.sessionMetadata.sessionId);
        }
        
        if (validQuestions.length === 0) {
          toast({
            title: "No Questions Available",
            description: "Unable to load questions. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast({
          title: "Question Loading Error",
          description: "Failed to load questions. Please try again.",
          variant: "destructive"
        });
      }
    };

    processRecommendationData();
  }, [recommendationData, toast]);

  // Submit feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: (feedback: any) => apiRequest('POST', '/api/monolith/feedback', feedback),
    onSuccess: () => {
      console.log('Feedback submitted successfully');
    },
    onError: (error) => {
      console.error('Failed to submit feedback:', error);
    }
  });

  // Auto-generate analytics if needed (disabled to prevent loops)
  // useEffect(() => {
  //   if (!isLoadingAnalytics && !analyticsData?.analytics && !isGeneratingAnalytics && !generateAnalyticsMutation.isPending) {
  //     console.log('No analytics data found, generating...');
  //     setIsGeneratingAnalytics(true);
  //     generateAnalyticsMutation.mutate();
  //   }
  // }, [analyticsData, isLoadingAnalytics, isGeneratingAnalytics, generateAnalyticsMutation.isPending]);

  // Set session ID when recommendation data is available
  useEffect(() => {
    if (recommendationData?.sessionMetadata) {
      setSessionId(recommendationData.sessionMetadata.sessionId);
    }
  }, [recommendationData]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentRecommendation = recommendationData?.recommendations?.[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = () => {
    if (!currentQuestion || !selectedAnswer) return;

    const timeSpent = (Date.now() - questionStartTime) / 1000;
    const isCorrect = selectedAnswer === currentQuestion.answer;

    // Record answer
    const answerRecord = {
      questionId: currentQuestion.id,
      answer: selectedAnswer,
      correct: isCorrect,
      timeSpent,
      startTime: questionStartTime
    };

    setUserAnswers(prev => [...prev, answerRecord]);

    // Submit feedback to recommendation system
    if (currentRecommendation) {
      feedbackMutation.mutate({
        sessionId,
        questionId: currentQuestion.id,
        correct: isCorrect,
        timeSpent,
        difficultyRating: currentRecommendation.difficulty,
        engagementRating: timeSpent > 5 && timeSpent < 120 ? 5 : 3
      });
    }

    // Move to next question or complete session
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setQuestionStartTime(Date.now());
    } else {
      setIsComplete(true);
    }
  };

  const calculateResults = () => {
    const correct = userAnswers.filter(a => a.correct).length;
    const accuracy = userAnswers.length > 0 ? (correct / userAnswers.length) * 100 : 0;
    const totalTime = userAnswers.reduce((sum, a) => sum + a.timeSpent, 0);
    const avgTime = userAnswers.length > 0 ? totalTime / userAnswers.length : 0;

    return { correct, accuracy, totalTime, avgTime };
  };

  const getRecommendationTypeIcon = (type: string) => {
    switch (type) {
      case 'review': return <Target className="h-4 w-4" />;
      case 'advance': return <Star className="h-4 w-4" />;
      case 'challenge': return <Brain className="h-4 w-4" />;
      case 'reinforce': return <CheckCircle className="h-4 w-4" />;
      case 'remediate': return <Clock className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getRecommendationTypeColor = (type: string) => {
    switch (type) {
      case 'review': return 'bg-blue-100 text-blue-800';
      case 'advance': return 'bg-green-100 text-green-800';
      case 'challenge': return 'bg-purple-100 text-purple-800';
      case 'reinforce': return 'bg-orange-100 text-orange-800';
      case 'remediate': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading state for analytics generation
  if (isGeneratingAnalytics || isLoadingAnalytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Analyzing Your Learning Pattern</h3>
            <p className="text-gray-600">
              Generating personalized analytics to create the perfect quiz for you...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state for recommendations
  if (isLoadingRecommendations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Preparing Your Personalized Quiz</h3>
            <p className="text-gray-600">
              Analyzing your learning patterns and selecting optimal questions...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (recommendationError || (!questions || questions.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Personalized Questions Available</h3>
            <p className="text-gray-600 mb-4">
              Complete a few practice sessions in different modules to unlock personalized recommendations.
            </p>
            <Button onClick={() => window.location.href = '/modules'}>
              Explore Modules
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    const results = calculateResults();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Quiz Complete!
            </h1>
            <p className="text-gray-600">
              Great work on your personalized learning session
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Results Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Questions Answered:</span>
                    <span className="font-semibold">{userAnswers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correct Answers:</span>
                    <span className="font-semibold text-green-600">{results.correct}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accuracy:</span>
                    <span className="font-semibold">{results.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Time:</span>
                    <span className="font-semibold">{results.avgTime.toFixed(1)}s</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Recommendation Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recommendationData?.recommendations.slice(0, userAnswers.length).map((rec, index) => (
                    <div key={rec.questionId} className="flex items-center gap-2">
                      <Badge className={getRecommendationTypeColor(rec.recommendationType)}>
                        {getRecommendationTypeIcon(rec.recommendationType)}
                        {rec.recommendationType}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {userAnswers[index]?.correct ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button size="lg" onClick={() => window.location.href = '/'}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Personalized Quiz
            </h1>
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                {currentQuestionIndex + 1} of {totalQuestions}
              </Badge>
              {currentRecommendation && (
                <Badge className={getRecommendationTypeColor(currentRecommendation.recommendationType)}>
                  {getRecommendationTypeIcon(currentRecommendation.recommendationType)}
                  {currentRecommendation.recommendationType}
                </Badge>
              )}
            </div>
          </div>
          
          <Progress value={progress} className="w-full" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Question {currentQuestionIndex + 1}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Difficulty: {currentQuestion?.difficulty || currentRecommendation?.difficulty || 1}
                    </Badge>
                    <Badge variant="outline">
                      {currentQuestion?.category || currentRecommendation?.category || 'General'}
                    </Badge>
                  </div>
                </div>
                {currentRecommendation && (
                  <p className="text-sm text-gray-600 mt-2">
                    {currentRecommendation.reasoning}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-xl mb-4">
                    {currentQuestion?.question}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentQuestion?.options.map((option, index) => (
                    <Button
                      key={index}
                      variant={selectedAnswer === option ? "default" : "outline"}
                      className="h-auto p-4 text-left justify-start"
                      onClick={() => handleAnswerSelect(option)}
                    >
                      <span className="w-6 h-6 rounded-full border flex items-center justify-center mr-3 text-xs">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {currentRecommendation?.concepts.length > 0 && (
              <span>
                Concepts: {currentRecommendation.concepts.join(', ')}
              </span>
            )}
          </div>
          
          <Button
            onClick={handleNextQuestion}
            disabled={!selectedAnswer || feedbackMutation.isPending}
            size="lg"
          >
            {currentQuestionIndex === totalQuestions - 1 ? 'Complete Quiz' : 'Next Question'}
          </Button>
        </div>
      </div>
    </div>
  );
}
