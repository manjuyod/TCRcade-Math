import React from 'react';
import { useLocation, useSearch } from 'wouter';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Trophy, Coins, Target, ArrowRight } from 'lucide-react';

export default function MathFactsCompletePage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useSearch();

  const operation = new URLSearchParams(query).get('operation') || 'addition';
  const score = parseInt(new URLSearchParams(query).get('score') || '0');
  const total = parseInt(new URLSearchParams(query).get('total') || '6');
  const tokens = parseInt(new URLSearchParams(query).get('tokens') || '0');
  const percentage = Math.round((score / total) * 100);
  const gradeLevel = new URLSearchParams(query).get('gradeLevel') || 'K';
  const levelChanged = new URLSearchParams(query).get('levelChanged') === 'true';
  const levelDirection = new URLSearchParams(query).get('levelDirection');

  const getOperationDisplay = (op: string) => {
    switch (op) {
      case 'addition': return 'Addition';
      case 'subtraction': return 'Subtraction';
      case 'multiplication': return 'Multiplication';
      case 'division': return 'Division';
      default: return 'Math Facts';
    }
  };

  const getPerformanceColor = (pct: number) => {
    if (pct >= 90) return 'text-green-600';
    if (pct >= 80) return 'text-blue-600';
    if (pct >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceMessage = (pct: number) => {
    if (pct === 100) return 'Perfect! Outstanding work!';
    if (pct >= 90) return 'Excellent performance!';
    if (pct >= 80) return 'Great job! Keep it up!';
    if (pct >= 70) return 'Good work! Practice makes perfect!';
    return 'Keep practicing - you\'ve got this!';
  };

  const navigate = (path: string) => {
    setLocation(path);
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
              {getOperationDisplay(operation)} Session Complete!
            </CardTitle>
            {levelChanged && (
              <div className="mt-2">
                <Badge variant={levelDirection === 'up' ? 'default' : 'secondary'} className="text-sm">
                  {levelDirection === 'up' ? '📈 Level Up!' : '📉 Level Adjusted'}
                  {' '}Grade {gradeLevel}
                </Badge>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Score Summary */}
            <div className="text-center">
              <div className={`text-6xl font-bold ${getPerformanceColor(percentage)} mb-2`}>
                {percentage}%
              </div>
              <div className="text-lg text-gray-600 mb-2">
                {score} out of {total} correct
              </div>
              <div className="text-lg font-medium text-gray-800">
                {getPerformanceMessage(percentage)}
              </div>
            </div>

            {/* Tokens Earned */}
            <div className="flex justify-center">
              <div className="flex items-center bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                <Coins className="h-5 w-5 mr-2" />
                <span className="font-semibold">{tokens} tokens earned!</span>
              </div>
            </div>

            {/* Grade Level Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-semibold text-blue-800">Current Level</span>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-blue-600">Grade {gradeLevel}</span>
                <div className="text-sm text-blue-600 mt-1">
                  {percentage >= 80 ? 'On track for next level!' : 'Keep practicing to advance!'}
                </div>
              </div>
            </div>

            {/* Perfect Score Bonus */}
            {percentage === 100 && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-4 rounded-lg text-center">
                <Trophy className="h-6 w-6 mx-auto mb-2" />
                <div className="font-bold">Perfect Score Bonus!</div>
                <div className="text-sm">+4 extra tokens for 100% accuracy</div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(`/math-facts/${operation}/play`)}
            >
              Try Again
            </Button>
            <Button 
              className="flex-1"
              onClick={() => navigate('/modules')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Choose Module
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}