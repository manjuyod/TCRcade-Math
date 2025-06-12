import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Trophy, Clock, Calculator, Target } from 'lucide-react';
import { useLocation } from 'wouter';
import { useSessionPrevention } from '@/hooks/use-session-prevention';

interface AlgebraProgress {
  grade_level: number;
  lesson: number;
}

export default function AlgebraSetupPage() {
  const [_, setLocation] = useLocation();
  
  // Session management
  const { endSession } = useSessionPrevention({ isActive: false });

  const { data: progressData, isLoading } = useQuery({
    queryKey: ['/api/algebra/progress'],
  });

  const progress = (progressData as any)?.progress as AlgebraProgress;

  const handleStartSession = (runType: 'practice' | 'token') => {
    setLocation(`/algebra/loading?runType=${runType}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading your algebra progress...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Calculator className="w-10 h-10 text-purple-600" />
            Pre-Algebra Basics
          </h1>
          <p className="text-lg text-gray-600">
            Master fundamental algebra skills through interactive practice
          </p>
        </div>

        {/* Progress Card */}
        {progress && (
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-600" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Current Grade Level</p>
                  <p className="text-2xl font-bold text-purple-600">Grade {progress.grade_level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Lesson</p>
                  <p className="text-2xl font-bold text-purple-600">Lesson {progress.lesson}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Run Type Selection */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Test - Disabled */}
          <Card className="bg-gray-100/80 backdrop-blur-sm border-gray-300 opacity-60 cursor-not-allowed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-500">
                <Target className="w-5 h-5" />
                Test
                <Badge variant="outline" className="text-gray-500 border-gray-400">Coming Soon</Badge>
              </CardTitle>
              <CardDescription className="text-gray-500">
                Assessment to evaluate your current skill level
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Practice Run */}
          <Card className="bg-white/80 hover:bg-purple-50/50 backdrop-blur-sm border-purple-200 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                Practice Run
                <Badge variant="secondary">No Tokens</Badge>
              </CardTitle>
              <CardDescription>
                Learn new concepts with guided practice questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => handleStartSession('practice')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Clock className="w-4 h-4 mr-2" />
                Start Practice
              </Button>
            </CardContent>
          </Card>

          {/* Token Run */}
          <Card className="bg-white/80 hover:bg-purple-50/50 backdrop-blur-sm border-purple-200 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-600" />
                Token Run
                <Badge variant="default" className="bg-purple-600">Earn Tokens</Badge>
              </CardTitle>
              <CardDescription>
                Demonstrate mastery and earn tokens for your progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => handleStartSession('token')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Start Token Run
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Key Features */}
        <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-600" />
              What You'll Practice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <p className="font-medium text-gray-700">Algebraic Expressions</p>
                <p className="text-gray-600">Simplifying and evaluating expressions with variables</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-gray-700">Basic Equations</p>
                <p className="text-gray-600">Solving simple linear equations step by step</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-gray-700">Order of Operations</p>
                <p className="text-gray-600">PEMDAS with algebraic expressions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Modules */}
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/modules')}
            size="lg"
            className="h-12"
          >
            Back to Modules
          </Button>
        </div>
      </div>
    </div>
  );
}