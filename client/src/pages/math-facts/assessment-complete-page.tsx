
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Award, Coins, Target, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function MathFactsAssessmentCompletePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  
  const operation = searchParams.get('operation') || 'addition';
  const grade = searchParams.get('grade') || 'K';
  const isAllComplete = searchParams.get('allComplete') === 'true';

  useEffect(() => {
    // Refresh user data to get updated assessment status
    refreshUser();
  }, [refreshUser]);

  const getOperationDisplay = (op: string) => {
    switch (op) {
      case 'addition': return 'Addition';
      case 'subtraction': return 'Subtraction';
      case 'multiplication': return 'Multiplication';
      case 'division': return 'Division';
      default: return 'Math Facts';
    }
  };

  const getOperationIcon = (op: string) => {
    switch (op) {
      case 'addition': return '➕';
      case 'subtraction': return '➖';
      case 'multiplication': return '✖️';
      case 'division': return '➗';
      default: return '🔢';
    }
  };

  const getGradeMessage = (gradeLevel: string) => {
    if (gradeLevel === 'K') {
      return 'Starting with kindergarten-level problems to build a strong foundation!';
    }
    if (['1', '2'].includes(gradeLevel)) {
      return 'Working on essential early elementary skills!';
    }
    if (['3', '4', '5'].includes(gradeLevel)) {
      return 'Tackling important elementary math facts!';
    }
    return 'Working at an advanced level - great job!';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              {getOperationDisplay(operation)} Assessment Complete!
            </CardTitle>
            <div className="mt-2">
              <Badge variant="default" className="text-sm">
                Skill Level Determined
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Assessment Result */}
            <div className="text-center">
              <div className="text-6xl mb-3">{getOperationIcon(operation)}</div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                Grade {grade}
              </div>
              <div className="text-lg text-gray-600 mb-4">
                Your {getOperationDisplay(operation).toLowerCase()} level
              </div>
              <div className="text-sm text-gray-600 max-w-md mx-auto">
                {getGradeMessage(grade)}
              </div>
            </div>

            {/* Tokens Earned */}
            <div className="flex justify-center">
              <div className="flex items-center bg-yellow-100 text-yellow-800 px-6 py-3 rounded-lg">
                <Coins className="h-6 w-6 mr-2" />
                <span className="font-semibold text-lg">15 tokens earned!</span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-center mb-3">
                <Target className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-semibold text-blue-800">What's Next?</span>
              </div>
              <div className="text-center text-sm text-blue-700">
                {isAllComplete ? (
                  <div>
                    <p className="mb-2">All assessments complete! 🎉</p>
                    <p>You can now practice any math facts operation at your personalized level.</p>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2">Ready to practice {getOperationDisplay(operation).toLowerCase()} at Grade {grade} level!</p>
                    <p>Complete other assessments to unlock all operations.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Achievement */}
            <div className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-4 rounded-lg text-center">
              <Award className="h-6 w-6 mx-auto mb-2" />
              <div className="font-bold">Assessment Achievement</div>
              <div className="text-sm">Completed {getOperationDisplay(operation)} skills evaluation</div>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(`/math-facts/${operation}/loading`)}
            >
              Practice Now
            </Button>
            <Button 
              className="flex-1"
              onClick={() => navigate('/modules')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Back to Modules
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
