import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { playSound } from '@/lib/sounds';
import { AiAnalytic } from '@shared/schema';
import { generateCustomStudyPlanFromAnalytics } from '@/lib/analytics-helpers';
import { 
  Loader2, 
  Brain, 
  LineChart, 
  BarChart, 
  PieChart, 
  Zap, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ChevronUp, 
  ChevronDown,
  BookOpen,
  RotateCw,
  Lightbulb,
  Award,
  Target
} from 'lucide-react';

// Study plan generator has been moved to a separate file to fix Fast Refresh issues

export default function AiAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [customStudyPlan, setCustomStudyPlan] = useState<string[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  // Fetch user's AI analytics
  const { 
    data: analyticsData, 
    isLoading: isLoadingAnalytics,
    refetch: refetchAnalytics,
    isError: isAnalyticsError,
  } = useQuery({
    queryKey: ['/api/analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json() as {
        analytics: {
          analytics: AiAnalytic;
          conceptMasteries: ConceptMastery[];
          recentProgress: {
            date: string;
            score: number;
            questionsAnswered: number;
            timeSpent: number;
          }[];
        }
      };

      // If no analytics exist but user has enough data, automatically generate them
      if (!data.analytics?.analytics && user?.questionsAnswered && user.questionsAnswered >= 10) {
        console.log('Auto-generating analytics for user with sufficient data');
        try {
          await apiRequest('POST', '/api/analytics/generate', {});
          // Refetch after generation
          const newRes = await fetch('/api/analytics');
          if (newRes.ok) {
            return await newRes.json();
          }
        } catch (error) {
          console.error('Failed to auto-generate analytics:', error);
        }
      }

      return data;
    }
  });

  // Extract the nested analytics data
  const analytics = analyticsData?.analytics?.analytics;
  const conceptMasteries = analyticsData?.analytics?.conceptMasteries || [];
  // Process recent progress data from hiddenGradeAsset modules
  const processRecentProgressFromAsset = (hiddenGradeAsset: any) => {
    if (!hiddenGradeAsset?.modules) return { data: [], isDummy: false };

    const dailyData: { [key: string]: { date: string; totalScore: number; totalQuestions: number; sessions: number } } = {};
    const modules = hiddenGradeAsset.modules;
    let hasRealData = false;

    // Extract progress data from each module
    Object.keys(modules).forEach(moduleKey => {
      const module = modules[moduleKey];

      // Check for session history or daily tracking
      if (module.session_history) {
        module.session_history.forEach((session: any) => {
          if (session.date && session.tokens_earned) {
            const date = session.date.split('T')[0]; // Get date part only
            if (!dailyData[date]) {
              dailyData[date] = {
                date,
                totalScore: 0,
                totalQuestions: 0,
                sessions: 0
              };
            }
            dailyData[date].totalScore += session.tokens_earned || 0;
            dailyData[date].totalQuestions += session.questions_attempted || 0;
            dailyData[date].sessions += 1;
            hasRealData = true;
          }
        });
      }

      // Check for daily statistics
      if (module.daily_stats) {
        Object.keys(module.daily_stats).forEach(date => {
          const stats = module.daily_stats[date];
          if (!dailyData[date]) {
            dailyData[date] = {
              date,
              totalScore: 0,
              totalQuestions: 0,
              sessions: 0
            };
          }
          dailyData[date].totalScore += stats.tokens_earned || 0;
          dailyData[date].totalQuestions += stats.questions_attempted || 0;
          dailyData[date].sessions += stats.sessions || 1;
          hasRealData = true;
        });
      }

      // Check for progress tracking with timestamps
      if (module.progress && module.progress.completion_history) {
        module.progress.completion_history.forEach((entry: any) => {
          if (entry.timestamp && entry.score) {
            const date = new Date(entry.timestamp).toISOString().split('T')[0];
            if (!dailyData[date]) {
              dailyData[date] = {
                date,
                totalScore: 0,
                totalQuestions: 0,
                sessions: 0
              };
            }
            dailyData[date].totalScore += entry.score || 0;
            dailyData[date].totalQuestions += entry.questions_answered || 0;
            dailyData[date].sessions += 1;
            hasRealData = true;
          }
        });
      }
    });

    // If no real data found, generate dummy data for study plan generation but flag it
    let isDummy = false;
    if (Object.keys(dailyData).length === 0 && user) {
      const totalTokens = user.tokens || 0;
      const totalQuestions = user.questionsAnswered || 0;
      const today = new Date();

      // Only generate dummy data if user has some activity
      if (totalTokens > 0 || totalQuestions > 0) {
        isDummy = true;

        // Generate last 7 days with distributed data
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          // Distribute total progress over the last 7 days with some variation
          const dayWeight = Math.random() * 0.3 + 0.1; // 10-40% of average
          dailyData[dateStr] = {
            date: dateStr,
            totalScore: Math.floor((totalTokens / 7) * dayWeight),
            totalQuestions: Math.floor((totalQuestions / 7) * dayWeight),
            sessions: Math.floor(Math.random() * 3) + 1
          };
        }
      }
    }

    // Convert to array and sort by date
    const processedData = Object.values(dailyData)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Show last 7 days

    return { data: processedData, isDummy };
  };

  const recentProgressResult = processRecentProgressFromAsset(user?.hiddenGradeAsset);
  const recentProgress = recentProgressResult.data;
  const isProgressDataDummy = recentProgressResult.isDummy;

  // Extract concept mastery data from user's hiddenGradeAsset
  const conceptMasteryData = user?.hiddenGradeAsset?.concept_mastery || {};

  // Process concept mastery data for display
  const processConceptMasteryData = () => {
    return Object.entries(conceptMasteryData).map(([concept, data]: [string, any]) => ({
      concept,
      weightedScore: data.weightedScore || 0,
      accuracy: data.accuracy || 0,
      consistency: data.consistency || 0,
      practiceVolume: data.practiceVolume || 0,
      practiceVolumeRatio: data.practiceVolumeRatio || 0,
      hasMastery: data.hasMastery || false,
      modules: data.modules || [],
      breakdown: data.breakdown || {}
    })).sort((a, b) => b.weightedScore - a.weightedScore);
  };

  const processedConceptMasteries = processConceptMasteryData();

  // Generate new analytics
  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerateAnalytics = async () => {
    setIsGenerating(true);
    try {
      await apiRequest('POST', '/api/analytics/generate', {});
      await refetchAnalytics();

      // Also regenerate the study plan after analytics are updated
      await generateCustomStudyPlan();

      toast({
        title: 'Analytics Generated',
        description: 'Your personalized learning insights and study plan are ready to view.',
        variant: 'default',
        dismisstimeout: 3000,
      });
      playSound('levelUp');
    } catch (error) {
      toast({
        title: 'Error generating analytics',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
        dismisstimeout: 3000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Automatically generate a study plan when analytics data changes
  useEffect(() => {
    if (analyticsData && customStudyPlan.length === 0) {
      // Only auto-generate if we don't already have a plan, but don't change the active tab
      generateCustomStudyPlanFromAnalytics(
        analyticsData.analytics, 
        setCustomStudyPlan, 
        setIsGeneratingPlan, 
        () => {}, // Don't change active tab
        toast
      );
    }
  }, [analyticsData, customStudyPlan.length, toast]);

  // Function to generate a custom study plan based on user data
  const generateCustomStudyPlan = async () => {
    if (!analytics) {
      console.log('No analytics data available for study plan generation');
      return;
    }

    setIsGeneratingPlan(true);

    // Clear existing study plan first
    setCustomStudyPlan([]);

    // Notify user that generation is in progress
    toast({
      title: "Generating Study Plan",
      description: "Creating your personalized study plan based on your progress...",
      dismissTimeout: 3000,
    });

    try {
      // Call the new comprehensive study plan endpoint
      const response = await apiRequest('POST', '/api/analytics/study-plan', {});

      console.log('Study plan response:', response);

      if (response.studyPlan && response.studyPlan.studyPlan && response.studyPlan.studyPlan.dailyActivities) {
        // Transform the study plan into display format
        const planItems = response.studyPlan.studyPlan.dailyActivities.map((day: any) => 
          `Day ${day.day}: ${day.activities.map((activity: any) => 
            `${activity.activity} (${activity.duration})`
          ).join(', ')}`
        );

        setCustomStudyPlan(planItems);
        setActiveTab('recommendations');

        toast({
          title: "Study Plan Generated",
          description: "Your personalized 14-day study plan is ready!",
          variant: 'default',
          dismissTimeout: 3000,
        });
        playSound('levelUp');
      } else if (response.studyPlan && Array.isArray(response.studyPlan)) {
        // Handle direct array format
        setCustomStudyPlan(response.studyPlan);
        setActiveTab('recommendations');

        toast({
          title: "Study Plan Generated",
          description: "Your personalized study plan is ready!",
          variant: 'default',
          dismissTimeout: 3000,
        });
        playSound('levelUp');
      } else {
        console.log('Using fallback study plan generation');
        // Fallback to the existing helper function
        generateCustomStudyPlanFromAnalytics(
          {
            analytics,
            conceptMasteries,
            recentProgress
          },
          setCustomStudyPlan,
          setIsGeneratingPlan,
          setActiveTab,
          toast
        );
      }
    } catch (error) {
      console.error('Error generating study plan:', error);

      // Fallback to the existing helper function
      generateCustomStudyPlanFromAnalytics(
        {
          analytics,
          conceptMasteries,
          recentProgress
        },
        setCustomStudyPlan,
        setIsGeneratingPlan,
        setActiveTab,
        toast
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Loading state
  if (isLoadingAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your learning analytics...</p>
      </div>
    );
  }

  // Error or no analytics available
  if (isAnalyticsError || !analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-primary" />
            AI Learning Analytics
          </CardTitle>
          <CardDescription>
            Get personalized insights about your learning patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold text-lg mb-2">No Analytics Available</h3>
          <p className="text-muted-foreground mb-6">
            We don't have enough data yet to generate personalized insights.
            Complete more questions to unlock this feature.
          </p>
          <Button 
            onClick={handleGenerateAnalytics}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Generate Analytics
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="analytics-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-primary" />
              Learning Analytics
            </CardTitle>
            <CardDescription>
              AI-powered insights to enhance your learning journey
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateAnalytics}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RotateCw className="h-4 w-4 mr-2" />
            )}
            Refresh Analytics
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="analytics-tabs">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              <LineChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="concepts">
              <Brain className="h-4 w-4 mr-2" />
              Concept Mastery
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <Lightbulb className="h-4 w-4 mr-2" />
              Study Plan
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Performance Score */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                    Performance Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2 text-primary">
                    {analytics.performanceMetrics?.overallPerformanceScore 
                      ? Math.round(analytics.performanceMetrics.overallPerformanceScore) 
                      : Math.round(((user?.correctAnswers || 0) / Math.max(1, user?.questionsAnswered || 1)) * 100)
                    }%
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Overall learning performance
                  </p>
                </CardContent>
              </Card>

              {/* Learning Velocity */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-primary" />
                    Learning Velocity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2 text-blue-600">
                    {analytics.performanceMetrics?.learningVelocity 
                      ? Math.round(analytics.performanceMetrics.learningVelocity) 
                      : Math.round((user?.questionsAnswered || 0) / Math.max(1, recentProgress.length || 1))
                    }
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Questions per session
                  </p>
                </CardContent>
              </Card>

              {/* Consistency Index */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <BarChart className="h-4 w-4 mr-2 text-primary" />
                    Consistency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2 text-green-600">
                    {analytics.performanceMetrics?.consistencyIndex 
                      ? Math.round(analytics.performanceMetrics.consistencyIndex)
                      : 85
                    }%
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Performance stability
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Progress and Module Performance Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              {/* Recent Progress Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <LineChart className="h-4 w-4 mr-2 text-primary" />
                    Recent Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentProgress && recentProgress.length > 0 && !isProgressDataDummy ? (
                    <div className="h-64">
                      <div className="relative h-full flex items-end pb-8">
                        {recentProgress.map((entry: any, index: number) => (
                          <div 
                            key={index} 
                            className="flex-1 mx-1 bg-blue-200 hover:bg-blue-300 transition-colors relative group border border-blue-300"
                            style={{ height: `${Math.max(15, Math.min(100, (entry.totalScore / 20) * 100))}%` }}
                          >
                            <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-background border border-input rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md w-32 text-center z-10">
                              <div className="font-medium">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                              <div className="text-primary">{entry.totalScore} points</div>
                              <div className="text-xs text-muted-foreground">{entry.totalQuestions} questions</div>
                              <div className="text-xs text-muted-foreground">{entry.sessions} sessions</div>
                            </div>
                            <div className="absolute bottom-0 inset-x-0 h-2 bg-blue-500"></div>
                            {/* Date labels on x-axis */}
                            <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* X-axis title */}
                      <div className="text-center mt-2">
                        <p className="text-xs text-muted-foreground font-medium">Daily Progress (Last 7 Days)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <LineChart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Not enough real data yet</h3>
                      <p className="text-muted-foreground text-sm">
                        Complete more sessions to see your actual progress chart.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Module Performance Carousel */}
              {(() => {
                // Check if module performance data is reliable (has enough sessions for meaningful trends)
                const hasReliableModuleData = analytics.modulePerformance && 
                  analytics.modulePerformance.length > 0 && 
                  analytics.modulePerformance.some((module: any) => module.sessionCount >= 3);

                if (hasReliableModuleData) {
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center">
                          <PieChart className="h-4 w-4 mr-2 text-primary" />
                          Module Performance Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="relative min-h-[280px]">
                          <div className="overflow-hidden">
                            <div className="flex transition-transform duration-300 ease-in-out" id="module-carousel">
                              {analytics.modulePerformance.filter((module: any) => module.sessionCount >= 3).map((module: any, index: number) => (
                                <div key={index} className="w-full flex-shrink-0 px-3">
                                  <div className="p-6 min-h-[240px] bg-card">
                                    <h4 className="font-semibold mb-6 text-center capitalize text-lg text-primary">
                                      {module.moduleName.replace(/-/g, ' ').replace(/_/g, ' ')}
                                    </h4>
                                    <div className="space-y-4">
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Average Score:</span>
                                        <span className="font-medium text-base">{Math.round(module.averageScore)}%</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Accuracy:</span>
                                        <span className="font-medium text-base">{Math.round(module.accuracy)}%</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Sessions:</span>
                                        <span className="font-medium text-base">{module.sessionCount}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Trend:</span>
                                        <span className={`font-medium text-base ${
                                          module.trend === 'improving' ? 'text-green-600' :
                                          module.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                                        }`}>
                                          {module.trend === 'improving' ? '↗' : module.trend === 'declining' ? '↘' : '→'} {module.trend}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Navigation buttons */}
                          {analytics.modulePerformance.filter((module: any) => module.sessionCount >= 3).length > 1 && (
                            <div className="flex justify-center mt-4 space-x-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const carousel = document.getElementById('module-carousel');
                                  if (carousel) {
                                    const currentTransform = carousel.style.transform;
                                    const currentTranslate = currentTransform.match(/translateX\((-?\d+)%\)/);
                                    const current = currentTranslate ? parseInt(currentTranslate[1]) : 0;
                                    const newTranslate = Math.min(0, current + 100);
                                    carousel.style.transform = `translateX(${newTranslate}%)`;
                                    setCurrentModuleIndex(Math.max(0, currentModuleIndex - 1));
                                  }
                                }}
                                className="h-9 w-9 p-0"
                              >
                                <ChevronUp className="h-4 w-4 rotate-[-90deg]" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const carousel = document.getElementById('module-carousel');
                                  if (carousel) {
                                    const currentTransform = carousel.style.transform;
                                    const currentTranslate = currentTransform.match(/translateX\((-?\d+)%\)/);
                                    const current = currentTranslate ? parseInt(currentTranslate[1]) : 0;
                                    const reliableModules = analytics.modulePerformance.filter((module: any) => module.sessionCount >= 3);
                                    const maxTranslate = -(reliableModules.length - 1) * 100;
                                    const newTranslate = Math.max(maxTranslate, current - 100);
                                    carousel.style.transform = `translateX(${newTranslate}%)`;
                                    setCurrentModuleIndex(Math.min(reliableModules.length - 1, currentModuleIndex + 1));
                                  }
                                }}
                                className="h-9 w-9 p-0"
                              >
                                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                              </Button>
                            </div>
                          )}

                          {/* Indicator dots */}
                          {analytics.modulePerformance.filter((module: any) => module.sessionCount >= 3).length > 1 && (
                            <div className="flex justify-center mt-3 space-x-1">
                              {analytics.modulePerformance.filter((module: any) => module.sessionCount >= 3).map((_: any, index: number) => (
                                <div 
                                  key={index} 
                                  className="w-2 h-2 rounded-full bg-muted transition-colors duration-200"
                                  style={{
                                    backgroundColor: index === currentModuleIndex ? 'hsl(var(--primary))' : undefined
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                } else {
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center">
                          <PieChart className="h-4 w-4 mr-2 text-primary" />
                          Module Performance Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center p-8">
                          <PieChart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                          <h3 className="font-medium mb-2">Not enough real data yet</h3>
                          <p className="text-muted-foreground text-sm">
                            Complete more sessions to see meaningful module performance analysis.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
              })()}
            </div>

            {/* Enhanced Progress Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    Session Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Sessions:</span>
                      <span className="font-medium">{analytics.learningPatterns?.totalSessions || recentProgress.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Questions/Session:</span>
                      <span className="font-medium">
                        {analytics.learningPatterns?.questionsPerSession 
                          ? Number(analytics.learningPatterns.questionsPerSession).toFixed(2)
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Brain className="h-4 w-4 mr-2 text-primary" />
                    Learning Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Learning Style:</span>
                      <span className="font-medium">{analytics.learningStyle || "Visual"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Performance Trend:</span>
                      <span className={`font-medium ${
                        analytics.learningPatterns?.performanceTrend === 'improving' ? 'text-green-600' :
                        analytics.learningPatterns?.performanceTrend === 'declining' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {analytics.learningPatterns?.performanceTrend || 'stable'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Retention Rate:</span>
                      <span className="font-medium">
                        {analytics.performanceMetrics?.retentionRate 
                          ? Math.round(analytics.performanceMetrics.retentionRate)
                          : 90
                        }%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Strengths and Areas for Improvement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Star className="h-4 w-4 mr-2 text-green-600" />
                    Your Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(analytics.strengthConcepts || []).length > 0 ? (
                      [...new Set(analytics.strengthConcepts || [])].map((strength, index) => (
                        <Badge key={index} variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100">
                          {strength}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Complete more questions to identify your strengths.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const strengthConcepts = analytics.strengthConcepts || [];
                      const filteredWeaknesses = (analytics.weaknessConcepts || []).filter(
                        concept => !strengthConcepts.includes(concept)
                      );
                      return filteredWeaknesses.length > 0 ? (
                        filteredWeaknesses.map((weakness, index) => (
                          <Badge key={index} variant="outline" className="bg-red-50 text-red-700 hover:bg-red-100">
                            {weakness}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Complete more questions to identify areas for improvement.
                        </p>
                      );
                    })()}
                  </div>
                </CardContent>
              </</Card>
            </div>


          </TabsContent>

          {/* Concept Mastery Tab */}
          <TabsContent value="concepts" className="pt-4">
            {processedConceptMasteries.length > 0 ? (
              <div className="space-y-6">
                {/* Mastery Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Award className="h-4 w-4 mr-2 text-yellow-500" />
                        Mastered Concepts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {processedConceptMasteries.filter(c => c.weightedScore >= 80).length}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Score ≥ 80%
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-blue-500" />
                        In Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">
                        {processedConceptMasteries.filter(c => c.weightedScore >= 50 && c.weightedScore < 80).length}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Score 50-79%
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Target className="h-4 w-4 mr-2 text-red-500" />
                        Need Practice
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">
                        {processedConceptMasteries.filter(c => c.weightedScore < 50).length}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Score &lt; 50%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Concept Mastery Grid */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-primary" />
                      Detailed Concept Analysis
                    </CardTitle>
                    <CardDescription>
                      Weighted mastery scores based on accuracy (40%), consistency (30%), practice volume (20%), and mastery flag (10%)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {processedConceptMasteries.map((concept, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm w-full h-full">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold capitalize">
                                {concept.concept.replace(/_/g, ' ')}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Found in {concept.modules.length} module{concept.modules.length > 1 ? 's' : ''}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {concept.modules.map((module: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {module.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${
                                concept.weightedScore >= 80 ? 'text-green-600' :
                                concept.weightedScore >= 50 ? 'text-blue-600' : 'text-red-600'
                              }`}>
                                {concept.weightedScore}
                              </div>
                              {concept.hasMastery && (
                                <Badge variant="secondary" className="mt-1">
                                  <Star className="h-3 w-3 mr-1" />
                                  Mastered
                                </Badge>
                              )}
                            </div>
                          </div>

                          <Progress 
                            value={concept.weightedScore} 
                            className="h-2"
                          />

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Accuracy:</span>
                                <span className="font-medium">{concept.accuracy}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Consistency:</span>
                                <span className="font-medium">{concept.consistency}%</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Practice Vol:</span>
                                <span className="font-medium">{concept.practiceVolume}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Vol Ratio:</span>
                                <span className="font-medium">{concept.practiceVolumeRatio}x</span>
                              </div>
                            </div>
                          </div>

                          {/* Score Breakdown */}
                          <div className="text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Accuracy (40%):</span>
                              <span>{concept.breakdown.accuracyScore}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Consistency (30%):</span>
                              <span>{concept.breakdown.consistencyScore}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Practice (20%):</span>
                              <span>{concept.breakdown.practiceVolumeScore}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Mastery (10%):</span>
                              <span>{concept.breakdown.masteryFlagScore}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Concept Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart className="h-5 w-5 mr-2 text-primary" />
                      Concept Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground">
                      {processedConceptMasteries.length === 0 ? (
                        <p>Complete more modules to see detailed concept analysis.</p>
                      ) : (
                        <p>Showing {processedConceptMasteries.length} concepts across all modules with weighted mastery scoring.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Concept Data Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete some learning activities to see your concept mastery analysis.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The system tracks your performance across different math concepts and calculates weighted mastery scores.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="pt-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base flex items-center">
                      <Lightbulb className="h-4 w-4 mr-2 text-primary" />
                      Personalized Study Plan
                    </CardTitle>
                    <CardDescription>
                      Follow this plan to improve your skills
                    </CardDescription>
                  </div>

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={generateCustomStudyPlan}
                    disabled={isGeneratingPlan}
                  >
                    {isGeneratingPlan ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RotateCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customStudyPlan && customStudyPlan.length > 0 ? (
                  <div className="space-y-3">
                    {customStudyPlan.map((item, index) => (
                      <div key={index} className="flex">
                        <div className="mr-2 text-primary">{index + 1}.</div>
                        <div>{item.replace('• ', '')}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Lightbulb className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No Study Plan Yet</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                      Generate a personalized study plan based on your current analytics.
                    </p>
                    <Button 
                      onClick={generateCustomStudyPlan}
                      disabled={isGeneratingPlan}
                    >
                      {isGeneratingPlan ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Lightbulb className="h-4 w-4 mr-2" />
                      )}
                      Generate Study Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        <div className="flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Last updated: {analytics?.analysisDate ? new Date(analytics.analysisDate).toLocaleString() : 'Never'}
        </div>
      </CardFooter>
    </Card>
  );
}