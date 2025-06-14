import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Question {
  id: string;
  question: string;
  answer: string;
  options: string[];
  operation: string;
  gradeLevel: string;
}

interface AssessmentState {
  currentGrade: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: string[];
  completed: boolean;
  results: any[];
  gradeCache: {
    [grade: string]: {
      questionsAnswered: number;
      correctAnswers: number;
      attempts: number;
      passed: boolean;
    };
  };
  maxGradeTested: string;
}

export default function MathFactsAssessmentPlayPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/math-facts/:operation/assessment');
  const operation = params?.operation || '';
  const { user } = useAuth();

  const [assessmentState, setAssessmentState] = useState<AssessmentState>({
    currentGrade: '',
    questions: [],
    currentQuestionIndex: 0,
    answers: [],
    completed: false,
    results: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  useEffect(() => {
    if (user && operation) {
      initializeAssessment();
    }
  }, [user, operation]);

  const initializeAssessment = async () => {
    if (!user || !operation || operation === '') return;

    try {
      setIsLoading(true);

      // Determine starting grade
      const userGrade = user.grade;
      const startingGrade = ['6', '7', '8', '9', '10', '11', '12'].includes(userGrade) ? '6' : userGrade;

      // Generate initial questions
      const response = await fetch(`/api/math-facts/assessment/${operation}?grade=${startingGrade}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate assessment questions');
      }

      setAssessmentState({
        currentGrade: startingGrade,
        questions: data.questions,
        currentQuestionIndex: 0,
        answers: [],
        completed: false,
        results: [],
        gradeCache: {},
        maxGradeTested: startingGrade
      });

    } catch (error) {
      console.error('Error initializing assessment:', error);
      setLocation('/modules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!selectedAnswer) return;

    const currentQuestion = assessmentState.questions[assessmentState.currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.answer;
    const newAnswers = [...assessmentState.answers, selectedAnswer];

    // If answer is incorrect, immediately drop to lower grade
    if (!isCorrect) {
      // Update grade cache to record the failure
      const currentGradeCache = assessmentState.gradeCache[assessmentState.currentGrade] || {
        questionsAnswered: 0,
        correctAnswers: 0,
        attempts: 0,
        passed: false
      };

      const updatedGradeCache = {
        ...assessmentState.gradeCache,
        [assessmentState.currentGrade]: {
          questionsAnswered: currentGradeCache.questionsAnswered + newAnswers.length,
          correctAnswers: currentGradeCache.correctAnswers,
          attempts: currentGradeCache.attempts + 1,
          passed: false
        }
      };

      // Immediately drop to lower grade
      await evaluateGradeLevelProgression(updatedGradeCache, false);
      return;
    }

    // Update state with new answer first
    const newQuestionIndex = assessmentState.currentQuestionIndex + 1;

    // Check if we've completed ALL questions for this grade
    if (newQuestionIndex >= assessmentState.questions.length) {
      // All questions answered correctly for this grade level
      const correctCount = newAnswers.length; // All must be correct to reach here

      // Update grade cache
      const currentGradeCache = assessmentState.gradeCache[assessmentState.currentGrade] || {
        questionsAnswered: 0,
        correctAnswers: 0,
        attempts: 0,
        passed: false
      };

      const updatedGradeCache = {
        ...assessmentState.gradeCache,
        [assessmentState.currentGrade]: {
          questionsAnswered: currentGradeCache.questionsAnswered + newAnswers.length,
          correctAnswers: currentGradeCache.correctAnswers + correctCount,
          attempts: currentGradeCache.attempts + 1,
          passed: true
        }
      };

      // Move up to next grade or complete
      await evaluateGradeLevelProgression(updatedGradeCache, true);
    } else {
      // Move to next question at same grade
      setAssessmentState(prev => ({
        ...prev,
        currentQuestionIndex: newQuestionIndex,
        answers: newAnswers
      }));
      setSelectedAnswer('');
    }
  };

  const evaluateGradeLevelProgression = async (updatedGradeCache: any, passedCurrentGrade: boolean) => {
    const gradeOrder = ['K', '1', '2', '3', '4', '5', '6'];
    const currentIndex = gradeOrder.indexOf(assessmentState.currentGrade);

    if (passedCurrentGrade) {
      // Passed current grade - this is their final assessed level
      // Complete assessment at this grade level since they achieved 100%
      await completeAssessment(assessmentState.currentGrade);
      return;
    } else {
      // Failed current grade - immediately drop down
      if (currentIndex <= 0) {
        // At lowest grade (K), find highest passed grade or default to K
        const highestPassedGrade = findHighestPassedGrade(updatedGradeCache) || 'K';
        await completeAssessment(highestPassedGrade);
        return;
      }

      // Drop to next lower grade immediately
      const lowerGrade = gradeOrder[currentIndex - 1];
      await moveToGradeLevel(lowerGrade, updatedGradeCache);
    }
  };

  const moveToGradeLevel = async (newGrade: string, gradeCache: any) => {
    // Check if we've already tested this grade and passed
    if (gradeCache[newGrade]?.passed) {
      // Already passed this grade, complete assessment
      await completeAssessment(newGrade);
      return;
    }

    try {
      const response = await fetch(`/api/math-facts/assessment/${operation}?grade=${newGrade}`);
      const data = await response.json();

      setAssessmentState(prev => ({
        ...prev,
        currentGrade: newGrade,
        questions: data.questions,
        currentQuestionIndex: 0,
        answers: [],
        gradeCache: gradeCache,
        maxGradeTested: isHigherGrade(newGrade, prev.maxGradeTested) ? newGrade : prev.maxGradeTested
      }));
      setSelectedAnswer('');
    } catch (error) {
      console.error('Error getting questions for grade:', newGrade, error);
      await completeAssessment(assessmentState.currentGrade);
    }
  };

  const retryCurrentGrade = async (gradeCache: any) => {
    try {
      const response = await fetch(`/api/math-facts/assessment/${operation}?grade=${assessmentState.currentGrade}`);
      const data = await response.json();

      setAssessmentState(prev => ({
        ...prev,
        questions: data.questions,
        currentQuestionIndex: 0,
        answers: [],
        gradeCache: gradeCache
      }));
      setSelectedAnswer('');
    } catch (error) {
      console.error('Error retrying grade:', error);
      await completeAssessment(assessmentState.currentGrade);
    }
  };

  const findHighestPassedGrade = (gradeCache: any): string | null => {
    const gradeOrder = ['K', '1', '2', '3', '4', '5', '6'];
    for (let i = gradeOrder.length - 1; i >= 0; i--) {
      if (gradeCache[gradeOrder[i]]?.passed) {
        return gradeOrder[i];
      }
    }
    return null;
  };

  const isHigherGrade = (grade1: string, grade2: string): boolean => {
    const gradeOrder = ['K', '1', '2', '3', '4', '5', '6'];
    return gradeOrder.indexOf(grade1) > gradeOrder.indexOf(grade2);
  };

  const completeAssessment = async (finalGrade: string) => {
    try {
      const response = await fetch('/api/math-facts/assessment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          finalGrade,
          questionsAnswered: assessmentState.answers.length + 1,
          userId: user?.id
        })
      });

      if (response.ok) {
        setLocation(`/math-facts/assessment/complete?operation=${operation}&grade=${finalGrade}`);
      } else {
        throw new Error('Failed to save assessment results');
      }
    } catch (error) {
      console.error('Error completing assessment:', error);
      setLocation('/modules');
    }
  };

  const getOperationDisplay = (op: string = '') => {
    switch (op) {
      case 'addition': return 'Addition';
      case 'subtraction': return 'Subtraction';  
      case 'multiplication': return 'Multiplication';
      case 'division': return 'Division';
      default: return 'Math Facts';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="animate-pulse">
            <div className="text-lg font-medium">Loading Assessment...</div>
            <div className="text-sm text-gray-600 mt-2">Preparing your skill evaluation</div>
          </div>
        </Card>
      </div>
    );
  }

  const currentQuestion = assessmentState.questions[assessmentState.currentQuestionIndex];
  const progress = ((assessmentState.currentQuestionIndex) / assessmentState.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-between items-center mb-2">
              <Badge variant="outline">Assessment</Badge>
              <Badge variant="secondary">Grade {assessmentState.currentGrade}</Badge>
            </div>
            <CardTitle className="text-2xl font-bold">
              {getOperationDisplay(operation)} Skills Test
            </CardTitle>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Question {assessmentState.currentQuestionIndex + 1} of {assessmentState.questions.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800 mb-6">
                {currentQuestion?.question}
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {currentQuestion?.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={selectedAnswer === option ? "default" : "outline"}
                    className="h-12 text-lg"
                    onClick={() => setSelectedAnswer(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>We're finding your perfect starting level.</p>
              <p>Answer carefully - accuracy determines your grade level!</p>
              {Object.keys(assessmentState.gradeCache).length > 0 && (
                <div className="mt-2 text-xs">
                  <p>Grades tested: {Object.keys(assessmentState.gradeCache).map(grade => {
                    const cache = assessmentState.gradeCache[grade];
                    return `${grade}(${cache.passed ? '✓' : cache.attempts > 1 ? '✗✗' : '✗'})`;
                  }).join(', ')}</p>
                </div>
              )}
            </div>
          </CardContent>

          <div className="p-6">
            <Button 
              className="w-full"
              onClick={handleAnswerSubmit}
              disabled={!selectedAnswer}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Submit Answer
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}