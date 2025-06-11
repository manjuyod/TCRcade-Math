import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Loader2, Calculator } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { Card, CardContent } from '@/components/ui/card';

interface AlgebraProgress {
  grade_level: number;
  lesson: number;
}

export default function AlgebraLoadingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Checking your progress...');

  // Get the run type from URL params
  const runType = new URLSearchParams(window.location.search).get('runType') || 'practice';

  // Fetch user's algebra progress
  const { data: progressData, isLoading, error } = useQuery({
    queryKey: ['/api/algebra/progress'],
    enabled: !!user,
  });

  // Simulate loading progress
  useEffect(() => {
    const steps = [
      'Checking your progress...',
      'Loading algebra questions...',
      'Preparing your session...',
      'Ready to start!'
    ];

    let currentStepIndex = 0;
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        const newProgress = prev + 25;
        
        if (newProgress <= 100) {
          setCurrentStep(steps[currentStepIndex]);
          currentStepIndex++;
        }
        
        // Stop the interval when we reach 100%
        if (newProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        
        return newProgress;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Navigate to play page when loading is complete
  useEffect(() => {
    if (loadingProgress >= 100) {
      const timer = setTimeout(() => {
        navigate(`/algebra/play?runType=${runType}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress, navigate, runType]);

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <Calculator className="h-12 w-12 mx-auto" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Unable to Load Algebra</h2>
                <p className="text-gray-600 mb-4">
                  There was an error loading your algebra progress. Please try again.
                </p>
                <button
                  onClick={() => navigate('/algebra/setup')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Back to Setup
                </button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Navigation active="home" />
      </div>
    );
  }

  const progress = (progressData as any)?.progress as AlgebraProgress;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-white/90 backdrop-blur-sm border-purple-200">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex justify-center">
                  <Calculator className="h-16 w-16 text-purple-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Pre-Algebra Basics</h1>
                <p className="text-gray-600">Preparing your algebra session...</p>
              </div>

              {/* Progress Info */}
              {progress && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Current Grade</p>
                      <p className="font-semibold text-purple-600">Grade {progress.grade_level}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Current Lesson</p>
                      <p className="font-semibold text-purple-600">Lesson {progress.lesson}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Animation */}
              <div className="space-y-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="flex justify-center"
                >
                  <Loader2 className="h-12 w-12 text-purple-600" />
                </motion.div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    className="bg-purple-600 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Progress Text */}
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-700">{loadingProgress}%</p>
                  <p className="text-sm text-gray-600">{currentStep}</p>
                </div>
              </div>

              {/* Session Type Badge */}
              <div className="flex justify-center">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  runType === 'practice' 
                    ? 'bg-gray-100 text-gray-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {runType === 'practice' ? 'Practice Session' : 'Token Run'}
                </span>
              </div>

              {/* Loading Tips */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>💡 Tip: Take your time to read each question carefully</p>
                <p>🎯 Focus on understanding the algebraic concepts</p>
                {runType === 'token' && <p>🏆 Remember: 80%+ score earns tokens!</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Navigation active="home" />
    </div>
  );
}