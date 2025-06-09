import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Ruler, Play, Trophy, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { MEASUREMENT_CONFIG } from '@shared/measurementRules';

export default function MeasurementSetupPage() {
  const [, navigate] = useLocation();
  const [selectedRunType, setSelectedRunType] = useState<'practice' | 'token' | null>(null);

  const handleRunTypeSelect = (runType: 'practice' | 'token') => {
    setSelectedRunType(runType);
    // Store the run type for the loading and play pages
    localStorage.setItem('measurementRunType', runType);
    navigate('/measurement/loading');
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
              Measurement Mastery
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Master measurement concepts including length, volume, and weight conversions.
              Choose your learning path below.
            </p>
          </motion.div>

          {/* Run Type Selection */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Test Run - Greyed Out */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full opacity-50 cursor-not-allowed">
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-3">
                    <TestTube className="h-12 w-12 text-gray-400" />
                  </div>
                  <CardTitle className="text-gray-400">Test Run</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-400 mb-4">
                    Official assessment mode for grade placement
                  </p>
                  <Button disabled className="w-full">
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Practice Run */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-200">
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-3">
                    <Play className="h-12 w-12 text-blue-500" />
                  </div>
                  <CardTitle className="text-blue-700">Practice Run</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 mb-4">
                    Practice with Try-It questions. No tokens earned, perfect for learning!
                  </p>
                  <div className="text-sm text-gray-500 mb-4">
                    • {MEASUREMENT_CONFIG.questionsPerSession} questions
                    • No consequences
                    • Immediate feedback
                  </div>
                  <Button 
                    onClick={() => handleRunTypeSelect('practice')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Start Practice
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Token Run */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-amber-200">
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-3">
                    <Trophy className="h-12 w-12 text-amber-500" />
                  </div>
                  <CardTitle className="text-amber-700">Token Run</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 mb-4">
                    Earn tokens and track progress. Challenge questions included!
                  </p>
                  <div className="text-sm text-gray-500 mb-4">
                    • {MEASUREMENT_CONFIG.questionsPerSession} questions
                    • Earn {MEASUREMENT_CONFIG.tokens.passing}-{MEASUREMENT_CONFIG.tokens.perfect} tokens
                    • Grade progression tracking
                  </div>
                  <Button 
                    onClick={() => handleRunTypeSelect('token')}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    Start Token Run
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Module Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>How Measurement Mastery Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Scoring System</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Score {MEASUREMENT_CONFIG.passingScore}% or higher to advance</li>
                      <li>• Perfect scores earn bonus tokens</li>
                      <li>• Progress tracks across grade levels</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Grade Progression</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• {MEASUREMENT_CONFIG.attempts.levelUpThreshold} good attempts = level up</li>
                      <li>• {MEASUREMENT_CONFIG.attempts.levelDownThreshold} poor attempts = level down</li>
                      <li>• Covers grades {MEASUREMENT_CONFIG.minGrade}-{MEASUREMENT_CONFIG.maxGrade}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Navigation active="modules" />
    </div>
  );
}