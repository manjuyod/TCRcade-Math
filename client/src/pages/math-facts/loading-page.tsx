
import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Calculator, Brain, Target } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function MathFactsLoadingPage() {
  const [, setLocation] = useLocation();
  const { operation } = useParams<{ operation: string }>();
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    generateQuestions();
  }, [operation, user]);

  const generateQuestions = async () => {
    if (!user || !operation) return;

    try {
      // Check if user needs assessment first
      const needsAssessment = !user.hiddenGradeAsset?.modules?.[`${operation}_facts`]?.progress?.test_taken;
      
      if (needsAssessment) {
        setStatus('Assessment required...');
        setProgress(100);
        setTimeout(() => {
          setLocation(`/math-facts/${operation}/assessment`);
        }, 1000);
        return;
      }

      // Generate practice questions
      setStatus('Loading your skill level...');
      setProgress(20);

      const gradeLevel = user.hiddenGradeAsset?.modules?.[`${operation}_facts`]?.progress?.grade_level || user.grade;
      
      setStatus('Generating questions...');
      setProgress(40);

      const response = await fetch(`/api/math-facts/${operation}/questions?grade=${gradeLevel}&count=6`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      setQuestions(data.questions);
      setStatus('Preparing your session...');
      setProgress(80);

      // Store questions in sessionStorage for the play page
      sessionStorage.setItem('mathFactsQuestions', JSON.stringify(data.questions));
      sessionStorage.setItem('mathFactsOperation', operation);
      sessionStorage.setItem('mathFactsGradeLevel', gradeLevel);

      setStatus('Ready to start!');
      setProgress(100);

      // Navigate to play page
      setTimeout(() => {
        setLocation(`/math-facts/${operation}/play`);
      }, 500);

    } catch (error) {
      console.error('Error generating questions:', error);
      setStatus('Error loading questions. Please try again.');
      setTimeout(() => {
        setLocation('/modules');
      }, 2000);
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

  const getOperationIcon = () => {
    switch (operation) {
      case 'addition': return '➕';
      case 'subtraction': return '➖';
      case 'multiplication': return '✖️';
      case 'division': return '➗';
      default: return '🔢';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="text-4xl mb-3">{getOperationIcon()}</div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            {getOperationDisplay(operation)}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Preparing your personalized math facts practice
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{status}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded-lg">
              <Calculator className="h-6 w-6 mx-auto text-blue-600 mb-1" />
              <div className="text-xs text-blue-600 font-medium">6 Questions</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <Brain className="h-6 w-6 mx-auto text-purple-600 mb-1" />
              <div className="text-xs text-purple-600 font-medium">Adaptive</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Target className="h-6 w-6 mx-auto text-green-600 mb-1" />
              <div className="text-xs text-green-600 font-medium">Your Level</div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            Questions are being customized for your skill level
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
