import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Trophy, Target, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import { useLocation } from 'wouter';
import { useSessionPrevention } from '@/hooks/use-session-prevention';

export default function AlgebraComplete() {
  const [_, setLocation] = useLocation();
  const { endSession } = useSessionPrevention();

  // Get results from URL params
  const params = new URLSearchParams(window.location.search);
  const runType = params.get('runType') || 'practice';
  const tokensEarned = parseInt(params.get('tokensEarned') || '0');
  const score = parseFloat(params.get('score') || '0');
  const correctAnswers = parseInt(params.get('correctAnswers') || '0');
  const totalQuestions = parseInt(params.get('totalQuestions') || '0');
  const levelChanged = params.get('levelChanged') === 'true';
  const levelDirection = params.get('levelDirection');
  const newLevel = parseInt(params.get('newLevel') || '0');

  const scorePercent = Math.round(score * 100);
  const isPassing = score >= 0.8;
  const isPerfect = score >= 1.0;

  // End session when component mounts
  useEffect(() => {
    endSession();
  }, [endSession]);

  const getScoreColor = () => {
    if (isPerfect) return 'text-green-600';
    if (isPassing) return 'text-blue-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = () => {
    if (isPerfect) return 'default';
    if (isPassing) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Calculator className="w-10 h-10 text-purple-600" />
            Session Complete!
          </h1>
          <p className="text-lg text-gray-600">
            {runType === 'practice' ? 'Practice' : 'Token'} session completed
          </p>
        </div>

        {/* Level Change Alert */}
        {levelChanged && (
          <Card className={`border-2 ${levelDirection === 'up' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {levelDirection === 'up' ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-orange-600" />
                )}
                <span className={`text-lg font-bold ${levelDirection === 'up' ? 'text-green-800' : 'text-orange-800'}`}>
                  Grade Level {levelDirection === 'up' ? 'Increased' : 'Decreased'}!
                </span>
              </div>
              <p className={`${levelDirection === 'up' ? 'text-green-700' : 'text-orange-700'}`}>
                You've moved to Grade {newLevel} based on your recent performance.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Score Card */}
          <Card className="bg-white/90 backdrop-blur-sm border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Your Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className={`text-5xl font-bold ${getScoreColor()}`}>
                  {scorePercent}%
                </div>
                <Badge variant={getScoreBadgeVariant()} className="mt-2">
                  {isPerfect ? 'Perfect!' : isPassing ? 'Passing' : 'Needs Practice'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-purple-600">{correctAnswers}</p>
                  <p className="text-sm text-gray-600">Correct</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-700">{totalQuestions}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rewards Card */}
          <Card className="bg-white/90 backdrop-blur-sm border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-600" />
                Rewards Earned
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {runType === 'token' ? (
                <div className="text-center">
                  <div className="text-5xl font-bold text-purple-600">
                    {tokensEarned}
                  </div>
                  <p className="text-lg text-gray-600 mt-2">Tokens Earned</p>
                  
                  {tokensEarned > 0 && (
                    <div className="mt-4 space-y-1 text-sm text-gray-600">
                      {isPerfect && <p>• Perfect score bonus!</p>}
                      {isPassing && !isPerfect && <p>• Passing score reward</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-gray-600">
                    Practice Mode
                  </div>
                  <p className="text-gray-600">No tokens in practice mode</p>
                  <p className="text-sm text-gray-500">
                    Try a Token Run to earn rewards!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights */}
        <Card className="bg-white/90 backdrop-blur-sm border-purple-200">
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {isPerfect ? (
                <p className="text-green-700">
                  🎯 Excellent work! You've mastered these algebra concepts.
                </p>
              ) : isPassing ? (
                <p className="text-blue-700">
                  👍 Good job! You're understanding the key concepts well.
                </p>
              ) : (
                <p className="text-red-700">
                  📚 Keep practicing! Review the concepts and try again.
                </p>
              )}
              
              <p className="text-gray-600">
                {runType === 'practice' 
                  ? "Practice runs help you learn without pressure. When you're ready, try a Token Run!"
                  : score >= 0.8 
                    ? "Great performance in your Token Run! Continue building your skills."
                    : "Consider doing some practice runs to strengthen your understanding before your next Token Run."
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <Button 
            onClick={() => setLocation('/algebra/setup')}
            size="lg" 
            className="bg-purple-600 hover:bg-purple-700 text-white h-14 text-lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Practice Again
          </Button>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/modules')}
              size="lg"
              className="h-12"
            >
              Back to Modules
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setLocation('/dashboard')}
              size="lg"
              className="h-12"
            >
              View Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}