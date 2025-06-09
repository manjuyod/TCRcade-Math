import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Ruler, 
  PlayCircle,
  Home,
  Clock,
  Target,
  Award
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import confetti from 'canvas-confetti';
import type { MeasurementSessionResult } from '@shared/measurementRules';

export default function MeasurementCompletePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [sessionResult, setSessionResult] = useState<MeasurementSessionResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Load session results from localStorage
  useEffect(() => {
    const storedResult = localStorage.getItem('measurementSessionResult');
    if (storedResult) {
      try {
        const result = JSON.parse(storedResult);
        setSessionResult(result);
        
        // Trigger confetti for good performance
        if (result.score >= 80) {
          setShowConfetti(true);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } catch (error) {
        console.error('Failed to parse session result:', error);
        navigate('/measurement/setup');
      }
    } else {
      navigate('/measurement/setup');
    }
  }, [navigate]);

  const handlePlayAgain = () => {
    localStorage.removeItem('measurementSessionResult');
    navigate('/measurement/setup');
  };

  const handleGoHome = () => {
    localStorage.removeItem('measurementSessionResult');
    navigate('/modules');
  };

  if (!sessionResult) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Ruler className="h-12 w-12 animate-pulse text-purple-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading results...</p>
          </div>
        </main>
        <Navigation active="practice" />
      </div>
    );
  }

  const isExcellent = sessionResult.score >= 90;
  const isGood = sessionResult.score >= 70;
  const isPassing = sessionResult.score >= 60;

  const getPerformanceColor = () => {
    if (isExcellent) return 'text-green-600';
    if (isGood) return 'text-blue-600';
    if (isPassing) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBg = () => {
    if (isExcellent) return 'bg-green-50 border-green-200';
    if (isGood) return 'bg-blue-50 border-blue-200';
    if (isPassing) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getPerformanceMessage = () => {
    if (isExcellent) return "Outstanding work! You've mastered these concepts.";
    if (isGood) return "Great job! You're doing well with measurement.";
    if (isPassing) return "Good effort! Keep practicing to improve.";
    return "Keep trying! Practice makes perfect.";
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center mb-4">
              <Ruler className="h-16 w-16 text-purple-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Session Complete!
            </h1>
            <p className="text-xl text-gray-600">
              Here's how you performed in Measurement Mastery
            </p>
          </motion.div>

          {/* Main Results Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={`mb-6 border-2 ${getPerformanceBg()}`}>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-4">
                  {isExcellent ? (
                    <Trophy className="h-20 w-20 text-yellow-500" />
                  ) : isGood ? (
                    <Star className="h-20 w-20 text-blue-500" />
                  ) : (
                    <Target className="h-20 w-20 text-gray-500" />
                  )}
                </div>
                <CardTitle className={`text-3xl font-bold ${getPerformanceColor()}`}>
                  {sessionResult.score}%
                </CardTitle>
                <p className="text-lg text-gray-700 mt-2">
                  {getPerformanceMessage()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {sessionResult.correct}
                    </div>
                    <div className="text-sm text-gray-600">Correct</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {sessionResult.total}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {sessionResult.tokensEarned}
                    </div>
                    <div className="text-sm text-gray-600">Tokens</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(sessionResult.score)}%
                    </div>
                    <div className="text-sm text-gray-600">Accuracy</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Level Change Notification */}
          {sessionResult.levelChanged && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className={`mb-6 border-2 ${
                sessionResult.levelDirection === 'up' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center">
                    {sessionResult.levelDirection === 'up' ? (
                      <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-orange-600 mr-3" />
                    )}
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${
                        sessionResult.levelDirection === 'up' 
                          ? 'text-green-800' 
                          : 'text-orange-800'
                      }`}>
                        Grade Level {sessionResult.levelDirection === 'up' ? 'Advanced' : 'Adjusted'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        You're now at Grade Level {sessionResult.newLevel}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Detailed Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid md:grid-cols-2 gap-6 mb-6"
          >
            {/* Performance Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-purple-500" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Questions Answered:</span>
                  <span className="font-semibold">{sessionResult.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Correct Answers:</span>
                  <span className="font-semibold text-green-600">{sessionResult.correct}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Accuracy Rate:</span>
                  <span className={`font-semibold ${getPerformanceColor()}`}>
                    {sessionResult.score}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tokens Earned:</span>
                  <span className="font-semibold text-amber-600">
                    +{sessionResult.tokensEarned}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                  What's Next?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isExcellent ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Excellent work! You've demonstrated strong measurement skills.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Try the token run for more challenging questions</li>
                      <li>• Explore other math modules</li>
                      <li>• Help classmates with measurement concepts</li>
                    </ul>
                  </>
                ) : isGood ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Great progress! You're developing solid measurement understanding.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Practice more to reach mastery level</li>
                      <li>• Focus on unit conversion strategies</li>
                      <li>• Try token runs to earn more rewards</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Keep practicing! Measurement skills improve with repetition.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Review measurement fundamentals</li>
                      <li>• Use practice mode to build confidence</li>
                      <li>• Ask for help when needed</li>
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              onClick={handlePlayAgain}
              className="bg-purple-600 hover:bg-purple-700 flex items-center space-x-2"
              size="lg"
            >
              <PlayCircle className="h-5 w-5" />
              <span>Play Again</span>
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex items-center space-x-2"
              size="lg"
            >
              <Home className="h-5 w-5" />
              <span>Back to Modules</span>
            </Button>
          </motion.div>
        </div>
      </main>

      <Navigation active="practice" />
    </div>
  );
}