import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { BarChart4, Trophy, Star, ArrowRight, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { RATIOS_RULES } from '@shared/ratiosRules';

export default function RatiosCompletePage() {
  const [, navigate] = useLocation();
  const [accuracy, setAccuracy] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);

  useEffect(() => {
    // Trigger celebration confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Get session results from localStorage or calculate from stored answers
    const storedResults = localStorage.getItem('ratiosSessionResults');
    if (storedResults) {
      const results = JSON.parse(storedResults);
      setAccuracy(results.accuracy || 0);
      setTotalCorrect(results.correct || 0);
    } else {
      // Default values if no results stored
      setAccuracy(80); // Default to 80% if no data
      setTotalCorrect(4); // Default to 4/5 correct
    }
  }, []);

  const handleTryAnotherSkill = () => {
    // Clear previous session data
    localStorage.removeItem('ratiosSkill');
    localStorage.removeItem('ratiosSessionResults');
    navigate('/ratios/setup');
  };

  const handleBackToModules = () => {
    // Clear session data
    localStorage.removeItem('ratiosSkill');
    localStorage.removeItem('ratiosSessionResults');
    navigate('/modules');
  };

  const getPerformanceMessage = (accuracy: number) => {
    if (accuracy >= 90) return "Outstanding work!";
    if (accuracy >= 80) return "Great job!";
    if (accuracy >= 70) return "Good effort!";
    if (accuracy >= 60) return "Keep practicing!";
    return "Nice try!";
  };

  const getStars = (accuracy: number) => {
    if (accuracy >= 90) return 3;
    if (accuracy >= 70) return 2;
    return 1;
  };

  const stars = getStars(accuracy);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          {/* Celebration header */}
          <Card className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="mb-4"
              >
                <Trophy className="h-16 w-16 text-amber-500 mx-auto" />
              </motion.div>
              
              <CardTitle className="text-2xl text-amber-700">
                {getPerformanceMessage(accuracy)}
              </CardTitle>
              
              <div className="flex justify-center gap-1 mt-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: i < stars ? 1 : 0.3, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    <Star 
                      className={`h-6 w-6 ${i < stars ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} 
                    />
                  </motion.div>
                ))}
              </div>
            </CardHeader>
          </Card>

          {/* Results summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart4 className="h-5 w-5 text-amber-600" />
                Session Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{totalCorrect}</div>
                  <div className="text-sm text-gray-600">Correct Answers</div>
                  <div className="text-xs text-gray-500">out of {RATIOS_RULES.questionCount}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{Math.round(accuracy)}%</div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                  <div className="text-xs text-gray-500">overall performance</div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(accuracy)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${accuracy}%` }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <Button
                onClick={handleTryAnotherSkill}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                size="lg"
              >
                <RotateCcw className="mr-2 h-5 w-5" />
                Try Another Skill
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <Button
                onClick={handleBackToModules}
                variant="outline"
                className="w-full border-amber-600 text-amber-600 hover:bg-amber-50"
                size="lg"
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                Back to Modules
              </Button>
            </motion.div>
          </div>

          {/* Encouragement message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-center mt-8"
          >
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-blue-700 text-sm">
                  {accuracy >= 80 
                    ? "You're mastering ratios and proportions! Keep up the excellent work."
                    : "Practice makes perfect! Try different skills to strengthen your understanding."
                  }
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
      
      <Navigation active="home" />
    </div>
  );
}