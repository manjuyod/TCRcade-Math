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
import { AiAnalytic, ConceptMastery } from '@shared/schema';
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
  Lightbulb
} from 'lucide-react';

// Study plan generator has been moved to a separate file to fix Fast Refresh issues

export default function AiAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [customStudyPlan, setCustomStudyPlan] = useState<string[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
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
      return res.json() as Promise<{
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
      }>;
    }
  });
  
  // Extract the nested analytics data
  const analytics = analyticsData?.analytics?.analytics;
  const conceptMasteries = analyticsData?.analytics?.conceptMasteries || [];
  const recentProgress = analyticsData?.analytics?.recentProgress || [];
  
  // Generate new analytics
  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerateAnalytics = async () => {
    setIsGenerating(true);
    try {
      await apiRequest('POST', '/api/analytics/generate', {});
      await refetchAnalytics();
      toast({
        title: 'Analytics Generated',
        description: 'Your personalized learning insights are ready to view.',
        variant: 'default',
        dismissTimeout: 3000,
      });
      playSound('levelUp');
    } catch (error) {
      toast({
        title: 'Error generating analytics',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
        dismissTimeout: 3000,
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Automatically generate a study plan when analytics data changes
  useEffect(() => {
    if (analyticsData && customStudyPlan.length === 0) {
      // Only auto-generate if we don't already have a plan
      generateCustomStudyPlanFromAnalytics(
        analyticsData.analytics, 
        setCustomStudyPlan, 
        setIsGeneratingPlan, 
        setActiveTab,
        toast
      );
    }
  }, [analyticsData, customStudyPlan.length, toast]);
  
  // Function to generate a custom study plan based on user data
  const generateCustomStudyPlan = async () => {
    if (!analytics) return;
    
    setIsGeneratingPlan(true);
    
    // Notify user that generation is in progress
    toast({
      title: "Generating Study Plan",
      description: "Creating your personalized study plan based on your progress...",
      dismissTimeout: 3000,
    });
    
    // Call the helper function with the nested structure
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="analytics-tabs">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              <LineChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="mastery">
              <Star className="h-4 w-4 mr-2" />
              Mastery
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <Lightbulb className="h-4 w-4 mr-2" />
              Study Plan
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Analytics Card 1 - Learning Style */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Brain className="h-4 w-4 mr-2 text-primary" />
                    Learning Style
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {analytics.learningStyle || "Visual"}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Your preferred way of processing information
                  </p>
                </CardContent>
              </Card>
              
              {/* Analytics Card 2 - Progress */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                    Progress Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-2xl font-bold">
                        {user?.questionsAnswered || 0}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Questions Answered
                      </p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {user?.correctAnswers || 0}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Correct Answers
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Analytics Card 3 - Strengths */}
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <Star className="h-4 w-4 mr-2 text-primary" />
                  Your Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-2">
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
            
            {/* Analytics Card 4 - Areas for Improvement */}
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <TrendingDown className="h-4 w-4 mr-2 text-primary" />
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
            </Card>
            
            {/* Analytics Card 5 - Recent Progress Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <LineChart className="h-4 w-4 mr-2 text-primary" />
                  Recent Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentProgress && recentProgress.length > 0 ? (
                  <div className="h-64">
                    {/* Placeholder for chart - would use Recharts in a real implementation */}
                    <div className="relative h-full flex items-end">
                      {recentProgress.map((entry, index) => (
                        <div 
                          key={index} 
                          className="flex-1 mx-1 bg-primary-foreground hover:bg-primary/10 transition-colors relative group"
                          style={{ height: `${Math.max(10, Math.min(100, (entry.score / 10) * 100))}%` }}
                        >
                          <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-background border border-input rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md w-28 text-center">
                            <div className="font-medium">{entry.date}</div>
                            <div className="text-primary">{entry.score} points</div>
                            <div className="text-xs text-muted-foreground">{entry.questionsAnswered} questions</div>
                          </div>
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-primary"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <p className="text-muted-foreground">
                      Not enough data to display progress chart yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Mastery Tab */}
          <TabsContent value="mastery" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Star className="h-4 w-4 mr-2 text-primary" /> 
                  Concept Mastery
                </CardTitle>
                <CardDescription>
                  Track your progress across mathematical concepts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conceptMasteries && conceptMasteries.length > 0 ? (
                  <div className="space-y-4">
                    {conceptMasteries
                      .filter(mastery => 
                        mastery.concept && 
                        mastery.concept.toLowerCase() !== 'general' && 
                        mastery.attempts > 0
                      )
                      .sort((a, b) => b.masteryLevel - a.masteryLevel)
                      .map((mastery, index) => (
                        <div key={index} className="concept-mastery-item">
                          <div className="flex justify-between items-center mb-1">
                            <div className="font-medium">{mastery.concept}</div>
                            <div className="text-sm">
                              <Badge variant={mastery.masteryLevel >= 80 ? "default" : "outline"}>
                                {mastery.masteryLevel}% Mastery
                              </Badge>
                            </div>
                          </div>
                          <Progress value={mastery.masteryLevel} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{mastery.totalAttempts || 0} attempts</span>
                            <span>{mastery.correctAttempts || 0} correct</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No Mastery Data Yet</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      Complete more questions across different mathematical concepts to see your mastery levels.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
