import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Loader2, Ruler } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { Card, CardContent } from '@/components/ui/card';
import type { MeasurementProgressResult } from '@shared/measurementRules';

export default function MeasurementLoadingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Checking your progress...');

  // Get the run type from localStorage
  const runType = localStorage.getItem('measurementRunType') || 'practice';

  // Fetch user's measurement progress
  const { data: progressData, isLoading, error } = useQuery<MeasurementProgressResult>({
    queryKey: ['/api/measurement/progress'],
    enabled: !!user,
  });

  // Simulate loading progress
  useEffect(() => {
    const steps = [
      'Checking your progress...',
      'Loading measurement questions...',
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
        navigate('/measurement/play');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress, navigate]);

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
                  <Ruler className="h-12 w-12 mx-auto" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Loading Error
                </h2>
                <p className="text-gray-600 mb-4">
                  Unable to load your measurement progress. Please try again.
                </p>
                <button
                  onClick={() => navigate('/measurement/setup')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Back to Setup
                </button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Navigation active="modules" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 flex items-center justify-center container mx-auto px-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Card>
              <CardContent className="pt-8 pb-8">
                {/* Loading Icon */}
                <div className="flex items-center justify-center mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Ruler className="h-16 w-16 text-purple-500" />
                  </motion.div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Measurement Mastery
                </h2>
                
                {/* Run Type */}
                <div className="mb-6">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    runType === 'token' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {runType === 'token' ? 'Token Run' : 'Practice Run'}
                  </span>
                </div>

                {/* Current Step */}
                <p className="text-gray-600 mb-6 min-h-[1.5rem]">
                  {currentStep}
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <motion.div
                    className="bg-purple-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>

                {/* Progress Percentage */}
                <p className="text-sm text-gray-500">
                  {loadingProgress}% Complete
                </p>

                {/* Current Progress Info */}
                {progressData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between items-center">
                        <span>Current Grade Level:</span>
                        <span className="font-semibold">{progressData.grade_level}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span>Current Lesson:</span>
                        <span className="font-semibold">{progressData.lesson}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Loading Spinner */}
                {isLoading && (
                  <div className="mt-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-500" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Navigation active="modules" />
    </div>
  );
}