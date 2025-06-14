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
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
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
  const [transitionAttempts, setTransitionAttempts] = useState(0);

  useEffect(() => {
    if (user && operation) {
      initializeAssessment();
    }
  }, [user, operation]);

  const initializeAssessment = async () => {
    if (!user || !operation || operation === '') return;

    try {
      setIsLoading(true);
      
      // Reset all state completely before starting
      setAssessmentState({
        currentGrade: '',
        questions: [],
        currentQuestionIndex: 0,
        answers: [],
        completed: false,
        results: [],
        gradeCache: {},
        maxGradeTested: '',
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0
      });
      setSelectedAnswer('');

      // Determine starting grade
      const userGrade = user.grade;
      const startingGrade = ['6', '7', '8', '9', '10', '11', '12'].includes(userGrade) ? '6' : userGrade;

      // Generate initial questions
      const response = await fetch(`/api/math-facts/assessment/${operation}?grade=${startingGrade}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(data.error || `HTTP ${response.status}: Failed to generate assessment questions`);
      }
      
      const data = await response.json();
      
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Invalid assessment data received from server');
      }

      setAssessmentState({
        currentGrade: startingGrade,
        questions: data.questions,
        currentQuestionIndex: 0,
        answers: [],
        completed: false,
        results: [],
        gradeCache: {},
        maxGradeTested: startingGrade,
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0
      });

    } catch (error) {
      console.error('Error initializing assessment:', error);
      // Show user-friendly error and redirect
      alert('Failed to load assessment. Redirecting to modules page.');
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

    console.log(`Question: ${currentQuestion.question}, Selected: ${selectedAnswer}, Correct: ${currentQuestion.answer}, Is Correct: ${isCorrect}`);

    // Update tracking data
    const newTotalQuestionsAnswered = assessmentState.totalQuestionsAnswered + 1;
    const newTotalCorrectAnswers = assessmentState.totalCorrectAnswers + (isCorrect ? 1 : 0);

    // Clear selected answer immediately
    setSelectedAnswer('');

    // If answer is incorrect, drop to lower grade immediately (don't advance question)
    if (!isCorrect) {
      console.log(`Wrong answer detected - dropping grade from ${assessmentState.currentGrade}`);
      // Update state with attempt but don't advance question index
      setAssessmentState(prev => ({
        ...prev,
        answers: newAnswers,
        totalQuestionsAnswered: newTotalQuestionsAnswered,
        totalCorrectAnswers: newTotalCorrectAnswers
      }));

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

      // Drop to lower grade immediately after recording the wrong answer
      // Use callback to ensure we get the updated state
      setAssessmentState(prev => {
        const newState = {
          ...prev,
          answers: newAnswers,
          totalQuestionsAnswered: newTotalQuestionsAnswered,
          totalCorrectAnswers: newTotalCorrectAnswers
        };
        
        // Call progression evaluation with current state after update
        setTimeout(() => {
          evaluateGradeLevelProgression(updatedGradeCache, false, newTotalQuestionsAnswered, newTotalCorrectAnswers, prev.currentGrade);
        }, 0);
        
        return newState;
      });
      return;
    }

    // Answer is correct - advance to next question
    const newQuestionIndex = assessmentState.currentQuestionIndex + 1;
    
    // Update state with correct answer and advance question
    setAssessmentState(prev => ({
      ...prev,
      currentQuestionIndex: newQuestionIndex,
      answers: newAnswers,
      totalQuestionsAnswered: newTotalQuestionsAnswered,
      totalCorrectAnswers: newTotalCorrectAnswers
    }));

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

      // Complete assessment at this grade since we got 100%
      await evaluateGradeLevelProgression(updatedGradeCache, true, newTotalQuestionsAnswered, newTotalCorrectAnswers, assessmentState.currentGrade);
    }
    // If there are more questions and the answer was correct, continue with next question
  };

  const evaluateGradeLevelProgression = async (updatedGradeCache: any, passedCurrentGrade: boolean, totalQuestionsAnswered?: number, totalCorrectAnswers?: number, currentGradeOverride?: string) => {
    const gradeOrder = ['0', '1', '2', '3', '4', '5', '6'];
    const actualCurrentGrade = currentGradeOverride || assessmentState.currentGrade;
    const currentIndex = gradeOrder.indexOf(actualCurrentGrade);

    console.log(`Evaluating progression: currentGrade=${actualCurrentGrade}, passed=${passedCurrentGrade}, currentIndex=${currentIndex}`);

    if (passedCurrentGrade) {
      // Passed current grade - this is their final assessed level
      console.log(`Assessment passed at grade ${actualCurrentGrade} - completing assessment`);
      await completeAssessment(actualCurrentGrade, totalQuestionsAnswered, totalCorrectAnswers);
      return;
    } else {
      // Failed current grade - immediately drop down
      if (currentIndex <= 0) {
        // At lowest grade (0/K), find highest passed grade or default to 0
        console.log('At lowest grade (0/K), finding highest passed grade or defaulting to 0');
        const highestPassedGrade = findHighestPassedGrade(updatedGradeCache) || '0';
        console.log(`Completing assessment at grade ${highestPassedGrade}`);
        await completeAssessment(highestPassedGrade, totalQuestionsAnswered, totalCorrectAnswers);
        return;
      }

      // Drop to next lower grade immediately
      const lowerGrade = gradeOrder[currentIndex - 1];
      console.log(`Dropping from grade ${actualCurrentGrade} to grade ${lowerGrade}`);
      await moveToGradeLevel(lowerGrade, updatedGradeCache);
    }
  };

  const moveToGradeLevel = async (newGrade: string, gradeCache: any) => {
    try {
      // Prevent infinite loops
      if (transitionAttempts >= 5) {
        console.error('Too many transition attempts, completing assessment');
        await completeAssessment(assessmentState.currentGrade, assessmentState.totalQuestionsAnswered, assessmentState.totalCorrectAnswers);
        return;
      }
      
      setTransitionAttempts(prev => prev + 1);
      
      console.log(`Moving from grade ${assessmentState.currentGrade} to grade ${newGrade} (attempt ${transitionAttempts + 1})`);
      const url = `/api/math-facts/assessment/${operation}?grade=${newGrade}`;
      console.log(`Fetching questions from: ${url}`);
      
      const response = await fetch(url);
      
      console.log(`📡 API Response status for grade ${newGrade}:`, response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`API Error for grade ${newGrade}:`, response.status, response.statusText, errorText);
        throw new Error(`Failed to get questions for grade ${newGrade}: HTTP ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`📋 Full API Response for grade ${newGrade}:`, JSON.stringify(data, null, 2));
      
      // Special handling for grade K/0
      if (newGrade === 'K' || newGrade === '0') {
        console.log(`🔍 Grade ${newGrade} Response Details:`, {
          hasQuestions: !!data.questions,
          questionsType: typeof data.questions,
          questionsLength: data.questions?.length,
          firstQuestion: data.questions?.[0]?.question,
          allQuestions: data.questions?.map(q => q.question),
          fullResponse: JSON.stringify(data)
        });
        
        // Validate the questions more thoroughly
        if (data.questions && Array.isArray(data.questions)) {
          data.questions.forEach((q, index) => {
            console.log(`   Question ${index + 1}: "${q.question}" (Answer: ${q.answer})`);
          });
        }
        
        // Force a small delay to ensure state update completes
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        console.error(`Invalid questions data for grade ${newGrade}:`, data);
        throw new Error(`Invalid questions received for grade ${newGrade} - got ${data.questions?.length || 0} questions`);
      }

      // Clear selected answer before updating state
      setSelectedAnswer('');

      console.log(`🔄 STATE TRANSITION: Moving from ${assessmentState.currentGrade} to ${newGrade}`);
      console.log(`📝 New questions for grade ${newGrade}:`, data.questions.map(q => q.question));
      console.log(`🎯 Pre-update state:`, {
        currentGrade: assessmentState.currentGrade,
        currentQuestion: assessmentState.questions[assessmentState.currentQuestionIndex]?.question
      });

      setAssessmentState(prev => {
        const newState = {
          ...prev,
          currentGrade: newGrade,
          questions: data.questions,
          currentQuestionIndex: 0,
          answers: [],
          gradeCache: gradeCache,
          maxGradeTested: isHigherGrade(newGrade, prev.maxGradeTested) ? newGrade : prev.maxGradeTested
        };
        
        console.log(`✅ STATE UPDATED: Now at grade ${newState.currentGrade}, showing question: ${newState.questions[0]?.question}`);
        console.log(`🎯 Post-update validation:`, {
          newGrade: newState.currentGrade,
          questionsCount: newState.questions.length,
          currentIndex: newState.currentQuestionIndex,
          firstQuestion: newState.questions[0]?.question,
          firstAnswer: newState.questions[0]?.answer
        });
        
        // Reset transition attempts on successful state update
        setTransitionAttempts(0);
        
        return newState;
      });
      
      // Add a post-state-update check
      setTimeout(() => {
        console.log(`🔍 Post-setState verification: currentGrade should be ${newGrade}, actually is ${assessmentState.currentGrade}`);
      }, 100);
      
      console.log(`Successfully moved to grade ${newGrade} with ${data.questions.length} questions`);
    } catch (error) {
      console.error(`Critical error moving to grade ${newGrade}:`, error);
      console.error('Completing assessment due to grade transition failure');
      await completeAssessment(assessmentState.currentGrade, assessmentState.totalQuestionsAnswered, assessmentState.totalCorrectAnswers);
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
      await completeAssessment(assessmentState.currentGrade, assessmentState.totalQuestionsAnswered, assessmentState.totalCorrectAnswers);
    }
  };

  const findHighestPassedGrade = (gradeCache: any): string | null => {
    const gradeOrder = ['0', '1', '2', '3', '4', '5', '6'];
    for (let i = gradeOrder.length - 1; i >= 0; i--) {
      if (gradeCache[gradeOrder[i]]?.passed) {
        return gradeOrder[i];
      }
    }
    return null;
  };

  const isHigherGrade = (grade1: string, grade2: string): boolean => {
    const gradeOrder = ['0', '1', '2', '3', '4', '5', '6'];
    return gradeOrder.indexOf(grade1) > gradeOrder.indexOf(grade2);
  };

  const completeAssessment = async (finalGrade: string, totalQuestions?: number, totalCorrect?: number) => {
    try {
      const questionsAnswered = totalQuestions || assessmentState.totalQuestionsAnswered;
      const correctAnswers = totalCorrect || assessmentState.totalCorrectAnswers;
      
      const response = await fetch('/api/math-facts/assessment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          finalGrade,
          questionsAnswered,
          correctAnswers,
          userId: user?.id
        })
      });

      if (response.ok) {
        setLocation(`/math-facts/assessment/complete?operation=${operation}&grade=${finalGrade}&questionsAnswered=${questionsAnswered}&correctAnswers=${correctAnswers}`);
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

  // Safety check - ensure we have valid assessment state
  if (!assessmentState.questions.length || !assessmentState.currentGrade) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="text-lg font-medium text-red-600">Assessment Error</div>
          <div className="text-sm text-gray-600 mt-2">Invalid assessment state. Redirecting...</div>
          <Button onClick={() => setLocation('/modules')} className="mt-4">
            Return to Modules
          </Button>
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
              <Badge variant="secondary">Grade {assessmentState.currentGrade === '0' ? 'K' : assessmentState.currentGrade}</Badge>
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