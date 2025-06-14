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
        results: []
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

    // Check if we've completed questions for this grade
    if (assessmentState.currentQuestionIndex === assessmentState.questions.length - 1) {
      const correctCount = newAnswers.reduce((count, answer, index) => {
        return count + (answer === assessmentState.questions[index].answer ? 1 : 0);
      }, 0);

      const passed = correctCount === assessmentState.questions.length;

      if (passed) {
        // Passed at this grade level - complete assessment
        await completeAssessment(assessmentState.currentGrade);
      } else {
        // Failed - drop down a grade level
        await dropGradeLevel();
      }
    } else {
      // Move to next question at same grade
      setAssessmentState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        answers: newAnswers
      }));
      setSelectedAnswer('');
    }
  };

  const dropGradeLevel = async () => {
    const gradeOrder = ['K', '1', '2', '3', '4', '5', '6'];
    const currentIndex = gradeOrder.indexOf(assessmentState.currentGrade);

    if (currentIndex <= 0) {
      // Already at lowest grade (K), complete with K
      await completeAssessment('K');
      return;
    }

    const newGrade = gradeOrder[currentIndex - 1];

    try {
      const response = await fetch(`/api/math-facts/assessment/${operation}?grade=${newGrade}`);
      const data = await response.json();

      setAssessmentState(prev => ({
        ...prev,
        currentGrade: newGrade,
        questions: data.questions,
        currentQuestionIndex: 0,
        answers: []
      }));
      setSelectedAnswer('');
    } catch (error) {
      console.error('Error getting questions for lower grade:', error);
      await completeAssessment(assessmentState.currentGrade);
    }
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