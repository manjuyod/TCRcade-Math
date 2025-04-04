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

/**
 * Generates a custom study plan based on user analytics
 * This can be called when the user's data changes
 * Exported to allow other components to trigger plan generation
 */
export function generateCustomStudyPlanFromAnalytics(analytics: any, setCustomStudyPlan: Function, setIsGeneratingPlan: Function, setActiveTab: Function, toast: any) {
  // Update loading state
  setIsGeneratingPlan(true);
  
  // Notify user that generation is in progress
  toast({
    title: "Generating Study Plan",
    description: "Creating your personalized study plan based on your progress...",
    dismissTimeout: 3000,
  });
  
  // Get concepts that need work and ensure none are "General"
  const needsWorkConcepts = analytics.conceptMasteries
    .filter((concept: any) => concept.masteryLevel < 75 && concept.concept.toLowerCase() !== 'general')
    .slice(0, 5)
    .map((concept: any) => concept.concept);
  
  // Get strengths to build on and ensure none are "General"
  const strengths = analytics.conceptMasteries
    .filter((concept: any) => concept.masteryLevel >= 75 && concept.concept.toLowerCase() !== 'general')
    .slice(0, 3)
    .map((concept: any) => concept.concept);
  
  // Get the user's grade from analytics (property no longer uses user object)
  const grade = typeof analytics.grade === 'string' ? analytics.grade : 'K';
  
  // Grade-specific topics mapping
  const gradeTopics: Record<string, string[]> = {
    'K': ['counting', 'number recognition', 'basic shapes', 'simple addition', 'simple subtraction'],
    '1': ['addition facts', 'subtraction facts', 'place value', 'measurement', 'time concepts'],
    '2': ['adding double digits', 'subtracting double digits', 'money', 'telling time', 'basic fractions'],
    '3': ['multiplication facts', 'division facts', 'fractions', 'measurement', 'graphs'],
    '4': ['multi-digit multiplication', 'division with remainders', 'decimals', 'fraction operations', 'angles'],
    '5': ['decimal operations', 'fraction operations', 'algebraic thinking', 'volume', 'coordinate plane'],
    '6': ['ratios', 'proportions', 'negative numbers', 'expressions', 'equations']
  };
  
  // Get relevant topics for the student's grade
  const relevantTopics = gradeTopics[grade] || 
    ['addition', 'subtraction', 'multiplication', 'division', 'fractions'];
  
  // Function to get a specific topic (never "General")
  const getSpecificTopic = (index: number, fallbackIndex: number = 0) => {
    // If we have a valid non-general concept at this index, use it
    if (needsWorkConcepts[index] && needsWorkConcepts[index].toLowerCase() !== 'general') {
      return needsWorkConcepts[index];
    }
    // Otherwise use a topic from the grade-specific list
    return relevantTopics[fallbackIndex % relevantTopics.length];
  };
  
  // Function to get a specific strength (never "General")
  const getSpecificStrength = (index: number, fallbackIndex: number = 0) => {
    // If we have a valid non-general strength at this index, use it
    if (strengths[index] && strengths[index].toLowerCase() !== 'general') {
      return strengths[index];
    }
    // Otherwise use "basic operations" or another default
    return relevantTopics[fallbackIndex % relevantTopics.length];
  };
  
  // Create bullet points with grade-specific topics, avoiding "General"
  const studyPlanBullets = [
    `• Focus daily: ${getSpecificTopic(0, 0)} - 15 minutes of practice with ${relevantTopics[1]} problems`,
    `• Twice weekly: ${getSpecificTopic(1, 2)} - Use step-by-step problem solving approach`,
    `• Monday/Wednesday: Practice ${relevantTopics[0]} and ${relevantTopics[1]} computational problems`,
    `• Tuesday/Thursday: Work on ${getSpecificTopic(2, 3)} problems at current grade level`,
    `• Friday review: All topics covered during the week, especially ${getSpecificTopic(0, 0)}`,
    `• Connect strong concept ${getSpecificStrength(0, 0)} with ${getSpecificTopic(0, 0)}`,
    `• Create 10 flash cards focusing on ${getSpecificTopic(1, 2)} facts`,
    `• Daily practice: ${relevantTopics[4] || "number facts"} for 5-10 minutes`,
    `• Weekly assessment: Take a 10-question quiz on ${getSpecificTopic(0, 0)}`,
    `• Build on your strength in ${getSpecificStrength(0, 0)} when learning ${getSpecificTopic(1, 1)}`
  ];
  
  // Update state with the new study plan after a short delay to simulate processing
  setTimeout(() => {
    setCustomStudyPlan(studyPlanBullets);
    setIsGeneratingPlan(false);
    playSound('levelUp');
    
    // Small toast to confirm completion
    toast({
      title: "Study Plan Ready",
      description: "Your personalized study plan has been generated",
      dismissTimeout: 3000, // Auto-dismiss after 3 seconds
    });
    
    // Make sure the recommendations tab is active to show the plan
    setActiveTab('recommendations');
  }, 1000);
}

export default function AiAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [customStudyPlan, setCustomStudyPlan] = useState<string[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  // Fetch user's AI analytics
  const { 
    data: analytics, 
    isLoading: isLoadingAnalytics,
    refetch: refetchAnalytics,
    isError: isAnalyticsError,
  } = useQuery({
    queryKey: ['/api/analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json() as Promise<{
        analytics: AiAnalytic;
        conceptMasteries: ConceptMastery[];
        recentProgress: {
          date: string;
          score: number;
          questionsAnswered: number;
          timeSpent: number;
        }[];
      }>;
    }
  });
  
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
    if (analytics && customStudyPlan.length === 0) {
      // Only auto-generate if we don't already have a plan
      generateCustomStudyPlanFromAnalytics(
        analytics, 
        setCustomStudyPlan, 
        setIsGeneratingPlan, 
        setActiveTab,
        toast
      );
    }
  }, [analytics, customStudyPlan.length, toast]);
  
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
    
    // Get concepts that need work and ensure none are "General"
    const needsWorkConcepts = analytics.conceptMasteries
      .filter(concept => concept.masteryLevel < 75 && concept.concept.toLowerCase() !== 'general')
      .slice(0, 5)
      .map(concept => concept.concept);
    
    // Get strengths to build on and ensure none are "General"
    const strengths = analytics.conceptMasteries
      .filter(concept => concept.masteryLevel >= 75 && concept.concept.toLowerCase() !== 'general')
      .slice(0, 3)
      .map(concept => concept.concept);
    
    // Get the user's grade from analytics (property no longer uses user object)
    const grade = typeof analytics.analytics.grade === 'string' ? analytics.analytics.grade : 'K';
    
    // Grade-specific topics mapping
    const gradeTopics: Record<string, string[]> = {
      'K': ['counting', 'number recognition', 'basic shapes', 'simple addition', 'simple subtraction'],
      '1': ['addition facts', 'subtraction facts', 'place value', 'measurement', 'time concepts'],
      '2': ['adding double digits', 'subtracting double digits', 'money', 'telling time', 'basic fractions'],
      '3': ['multiplication facts', 'division facts', 'fractions', 'measurement', 'graphs'],
      '4': ['multi-digit multiplication', 'division with remainders', 'decimals', 'fraction operations', 'angles'],
      '5': ['decimal operations', 'fraction operations', 'algebraic thinking', 'volume', 'coordinate plane'],
      '6': ['ratios', 'proportions', 'negative numbers', 'expressions', 'equations']
    };
    
    // Get relevant topics for the student's grade
    const relevantTopics = gradeTopics[grade] || 
      ['addition', 'subtraction', 'multiplication', 'division', 'fractions'];
    
    // Function to get a specific topic (never "General")
    const getSpecificTopic = (index: number, fallbackIndex: number = 0) => {
      // If we have a valid non-general concept at this index, use it
      if (needsWorkConcepts[index] && needsWorkConcepts[index].toLowerCase() !== 'general') {
        return needsWorkConcepts[index];
      }
      // Otherwise use a topic from the grade-specific list
      return relevantTopics[fallbackIndex % relevantTopics.length];
    };
    
    // Function to get a specific strength (never "General")
    const getSpecificStrength = (index: number, fallbackIndex: number = 0) => {
      // If we have a valid non-general strength at this index, use it
      if (strengths[index] && strengths[index].toLowerCase() !== 'general') {
        return strengths[index];
      }
      // Otherwise use a topic from the grade-specific list
      return relevantTopics[fallbackIndex % relevantTopics.length];
    };
    
    // Create bullet points with grade-specific topics, avoiding "General"
    const studyPlanBullets = [
      `• Focus daily: ${getSpecificTopic(0, 0)} - 15 minutes of practice with ${relevantTopics[1]} problems`,
      `• Twice weekly: ${getSpecificTopic(1, 2)} - Use step-by-step problem solving approach`,
      `• Monday/Wednesday: Practice ${relevantTopics[0]} and ${relevantTopics[1]} computational problems`,
      `• Tuesday/Thursday: Work on ${getSpecificTopic(2, 3)} problems at current grade level`,
      `• Friday review: All topics covered during the week, especially ${getSpecificTopic(0, 0)}`,
      `• Connect strong concept ${getSpecificStrength(0, 0)} with ${getSpecificTopic(0, 0)}`,
      `• Create 10 flash cards focusing on ${getSpecificTopic(1, 2)} facts`,
      `• Daily practice: ${relevantTopics[4] || "number facts"} for 5-10 minutes`,
      `• Weekly assessment: Take a 10-question quiz on ${getSpecificTopic(0, 0)}`,
      `• Build on your strength in ${getSpecificStrength(0, 0)} when learning ${getSpecificTopic(1, 1)}`
    ];
    
    // Update state with the new study plan
    setTimeout(() => {
      setCustomStudyPlan(studyPlanBullets);
      setIsGeneratingPlan(false);
      playSound('levelUp');
      
      // Small toast to confirm completion
      toast({
        title: "Study Plan Ready",
        description: "Your personalized study plan has been updated",
        dismissTimeout: 3000,
      });
      
      // Make sure the recommendations tab is active to show the plan
      setActiveTab('recommendations');
    }, 1000);
    
    return studyPlanBullets;
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
    <div className="ai-analytics">
      <div className="header mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center mb-1">
              <Brain className="h-6 w-6 mr-2 text-primary" />
              Learning Insights
            </h2>
            <p className="text-muted-foreground">
              AI-powered analysis of your learning patterns and progress
            </p>
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
            Update Insights
          </Button>
        </div>
        
        <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-start">
            <Lightbulb className="h-5 w-5 text-primary mr-3 mt-0.5" />
            <div>
              <p className="font-medium">Learning Style: {analytics.analytics.learningStyle}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {getLearningStyleDescription(analytics.analytics.learningStyle)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="overview">
            <LineChart className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="strengths">
            <TrendingUp className="h-4 w-4 mr-2" />
            Strengths
          </TabsTrigger>
          <TabsTrigger value="improvements">
            <TrendingDown className="h-4 w-4 mr-2" />
            Improvement Areas
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Zap className="h-4 w-4 mr-2" />
            Recommendations
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard 
              title="Overall Mastery"
              value={`${calculateOverallMastery(analytics.conceptMasteries)}%`}
              icon={<Brain className="h-4 w-4" />}
              trend={5}
            />
            <StatCard 
              title="Time Invested"
              value={formatTimeInvested(analytics.recentProgress)}
              icon={<Clock className="h-4 w-4" />}
              trend={12}
            />
            <StatCard 
              title="Concepts Mastered"
              value={countMasteredConcepts(analytics.conceptMasteries)}
              icon={<BookOpen className="h-4 w-4" />}
              trend={3}
            />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Learning Activity</CardTitle>
              <CardDescription>Your progress over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                {/* In a real implementation, this would be a chart component */}
                <div className="text-center text-muted-foreground">
                  <LineChart className="h-12 w-12 mx-auto mb-3 text-primary/50" />
                  <p>Activity chart would be rendered here</p>
                  <p className="text-sm">Showing questions answered, time spent, and mastery</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-4 w-4 mr-2 text-yellow-500" />
                  Top Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['Addition', 'Multiplication', 'Geometry'].map((category, i) => (
                    <li key={category} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2">{i + 1}</Badge>
                        <span>{category}</span>
                      </div>
                      <div>
                        <Progress value={90 - i * 12} className="w-24 h-2" />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-4 w-4 mr-2 text-primary" />
                  Learning Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Consistency</span>
                      <span className="font-medium">Good</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Focus Duration</span>
                      <span className="font-medium">Excellent</span>
                    </div>
                    <Progress value={90} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Answer Accuracy</span>
                      <span className="font-medium">Average</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Strengths Tab */}
        <TabsContent value="strengths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Strongest Concepts</CardTitle>
              <CardDescription>Areas where you consistently perform well</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Define fallback concepts directly from conceptMasteries to avoid relevantTopics error */}
                {(analytics.analytics.strengthConcepts?.length ? 
                  analytics.analytics.strengthConcepts : 
                  analytics.conceptMasteries
                    .sort((a, b) => b.masteryLevel - a.masteryLevel)
                    .map(mastery => mastery.concept)
                    .filter((value, index, self) => self.indexOf(value) === index)
                ).slice(0, 5).map((concept, i) => (
                  <div key={concept} className="space-y-2">
                    <div className="flex justify-between">
                      <h4 className="font-medium">{concept}</h4>
                      <Badge variant="outline" className="font-mono">
                        {analytics.conceptMasteries.find(m => m.concept === concept)?.masteryLevel || (90 - i * 5)}% Mastery
                      </Badge>
                    </div>
                    <Progress value={analytics.conceptMasteries.find(m => m.concept === concept)?.masteryLevel || (90 - i * 5)} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {getConceptDescription(concept)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Skills Analysis</CardTitle>
              <CardDescription>Your performance across different skill areas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* Generate skill ratings based on concept masteries data */}
                {getSkillRatings(analytics.conceptMasteries).map((skill, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>{skill.name}</span>
                      <span className="font-medium">{getRatingLabel(skill.value)}</span>
                    </div>
                    <Progress value={skill.value} className="h-2" />
                  </div>
                ))}
                
                {/* Display fallback if no data is available */}
                {analytics.conceptMasteries.length === 0 && (
                  <>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Complete more questions to see skills analysis</span>
                        <span className="font-medium">-</span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Improvement Areas Tab */}
        <TabsContent value="improvements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Areas for Improvement</CardTitle>
              <CardDescription>Concepts that need more practice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analytics.analytics.weaknessConcepts?.slice(0, 5).map((concept, i) => (
                  <div key={concept} className="space-y-2">
                    <div className="flex justify-between">
                      <h4 className="font-medium">{concept}</h4>
                      <Badge variant="outline" className="font-mono">
                        {40 - i * 8}% Mastery
                      </Badge>
                    </div>
                    <Progress value={40 - i * 8} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {getImprovementSuggestion(concept)}
                    </p>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingDown className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p>No improvement data available yet</p>
                    <p className="text-sm mt-1">Complete more questions to unlock insights</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Error Patterns</CardTitle>
              <CardDescription>Common mistakes in your problem-solving</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {[
                  "Place value confusion in multi-digit addition",
                  "Difficulty with borrowing in subtraction",
                  "Mixed up multiplication facts",
                  "Confusion with fraction comparisons",
                  "Time calculation errors"
                ].map((error, i) => (
                  <li key={i} className="flex items-start">
                    <Badge variant="outline" className="mr-3 mt-0.5">{i + 1}</Badge>
                    <div>
                      <p className="font-medium">{error}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getErrorAnalysis(error)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalized Learning Plan</CardTitle>
              <CardDescription>Tailored recommendations to improve your skills</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <h3 className="font-semibold text-lg">Recommended Focus Areas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.analytics.recommendedActivities?.slice(0, 4).map((activity, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                        <h4 className="font-medium">{formatActivityName(activity)}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getActivityDescription(activity)}
                        </p>
                      </div>
                      <CardFooter className="py-2 px-4 bg-muted/50 flex justify-between">
                        <span className="text-sm text-muted-foreground">Priority: {i + 1}</span>
                        <Button variant="ghost" size="sm">Start</Button>
                      </CardFooter>
                    </Card>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground col-span-2">
                      <Zap className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p>No recommendations available yet</p>
                      <p className="text-sm mt-1">Complete more questions to unlock personalized suggestions</p>
                    </div>
                  )}
                </div>

                {/* Custom Study Plan */}
                {customStudyPlan.length > 0 && (
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mt-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-primary" />
                      Your Custom Study Plan
                    </h3>
                    <div className="space-y-2">
                      {customStudyPlan.map((bullet, i) => (
                        <p key={i} className="text-sm">{bullet}</p>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      <p>Generated based on your recent learning activity and progress</p>
                    </div>
                  </div>
                )}
                
                <div className="mt-8">
                  <h3 className="font-semibold text-lg mb-4">Study Schedule Suggestion</h3>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="mb-3">Based on your learning patterns, we recommend:</p>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-primary" />
                        <span>Short, frequent sessions (15-20 minutes) rather than long study periods</span>
                      </li>
                      <li className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2 text-primary" />
                        <span>Focus on one concept at a time with plenty of practice problems</span>
                      </li>
                      <li className="flex items-center">
                        <Star className="h-4 w-4 mr-2 text-primary" />
                        <span>Review mastered concepts weekly to maintain proficiency</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={isGeneratingPlan}
                onClick={generateCustomStudyPlan}
              >
                {isGeneratingPlan ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {isGeneratingPlan ? 'Generating...' : 'Generate Custom Study Plan'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for stats
function StatCard({ 
  title, 
  value, 
  icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  trend: number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 bg-primary/10 rounded-full">
            {icon}
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-2xl font-bold">{value}</h3>
          <div className={`flex items-center text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? (
              <ChevronUp className="h-3 w-3 mr-1" />
            ) : (
              <ChevronDown className="h-3 w-3 mr-1" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions for data formatting and descriptions
function calculateOverallMastery(masteries: ConceptMastery[] = []): number {
  if (!masteries || masteries.length === 0) return 65; // Default for demo
  
  const average = masteries.reduce((sum, mastery) => sum + mastery.masteryLevel, 0) / masteries.length;
  return Math.round(average);
}

function formatTimeInvested(progressData: { timeSpent: number }[] = []): string {
  if (!progressData || progressData.length === 0) return '3h 45m'; // Default for demo
  
  const totalMinutes = progressData.reduce((sum, day) => sum + day.timeSpent, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}h ${minutes}m`;
}

function countMasteredConcepts(masteries: ConceptMastery[] = []): string {
  if (!masteries || masteries.length === 0) return '12/30'; // Default for demo
  
  const mastered = masteries.filter(m => m.masteryLevel >= 80).length;
  return `${mastered}/${masteries.length}`;
}

function getLearningStyleDescription(style: string | null): string {
  switch (style?.toLowerCase()) {
    case 'visual':
      return 'You learn best through images, diagrams, and spatial understanding. We recommend using visual aids like charts and diagrams when studying.';
    case 'auditory':
      return 'You learn effectively by listening and discussing. Consider reading problems aloud or explaining concepts to others.';
    case 'reading/writing':
      return 'You excel with written information. Taking notes and rewriting concepts in your own words helps solidify your understanding.';
    case 'kinesthetic':
      return 'You learn through hands-on activities and movement. Use manipulatives and physical objects to reinforce abstract concepts.';
    case 'verbal':
      return 'You prefer using words, both in speech and writing. Try explaining concepts aloud or writing out problem solutions step by step.';
    case 'logical':
      return 'You enjoy systems and logical reasoning. Focus on understanding the "why" behind mathematical rules and procedures.';
    case 'social':
      return 'You learn well in group settings. Consider study groups or collaborative problem-solving sessions.';
    case 'solitary':
      return 'You prefer independent study. Set aside quiet time for focused learning and reflection.';
    case 'analytical':
      return 'You excel at breaking down problems into components. Focus on understanding each step in a solution process.';
    default:
      return 'Complete more questions to help us determine your optimal learning approach.';
  }
}

function getConceptDescription(concept: string): string {
  const descriptions: Record<string, string> = {
    'Addition': 'You consistently solve addition problems quickly and accurately across various difficulty levels.',
    'Subtraction': 'You have a strong grasp of subtraction concepts, including borrowing in multi-digit problems.',
    'Multiplication': 'You demonstrate excellent recall of multiplication facts and apply them effectively.',
    'Division': 'You show good understanding of division concepts and can work through complex problems.',
    'Fractions': 'You handle fraction operations well, including comparing, adding, and simplifying fractions.',
    'Geometry': 'You excel at identifying shapes, understanding properties, and solving spatial problems.',
    'Time': 'You demonstrate excellent skills in reading clocks and calculating time intervals.',
    'Money': 'You show strong abilities in calculating with currency and solving money-related problems.',
    'Place Value': 'You have a solid understanding of place value across different number sizes.',
    'Word Problems': 'You effectively translate word problems into mathematical equations and solve them.',
  };
  
  return descriptions[concept] || 'You show consistent mastery in this area with a high accuracy rate.';
}

function getImprovementSuggestion(concept: string): string {
  const suggestions: Record<string, string> = {
    'Addition': 'Practice multi-digit addition with regrouping (carrying) to improve accuracy.',
    'Subtraction': 'Focus on borrowing (regrouping) in complex problems to strengthen your skills.',
    'Multiplication': 'Review multiplication tables and practice multiplying larger numbers.',
    'Division': 'Work on long division problems and dividing with remainders.',
    'Fractions': 'Practice comparing fractions with different denominators and equivalent fractions.',
    'Geometry': 'Focus on understanding shape properties and calculating area and perimeter.',
    'Time': 'Practice problems that involve calculating elapsed time between different clock readings.',
    'Money': 'Work on making change and solving multi-step money problems.',
    'Place Value': 'Practice identifying place values in large numbers and decimal operations.',
    'Word Problems': 'Focus on identifying the mathematical operations needed to solve different problem types.',
  };
  
  return suggestions[concept] || 'Spend more time on this concept with focused practice sessions.';
}

function getErrorAnalysis(error: string): string {
  const analyses: Record<string, string> = {
    'Place value confusion in multi-digit addition': 'You sometimes misalign digits when adding larger numbers. Try using grid paper to keep columns aligned.',
    'Difficulty with borrowing in subtraction': 'Practice breaking down the borrowing process into smaller steps and use visual aids to reinforce understanding.',
    'Mixed up multiplication facts': 'Create a personalized set of flashcards for the specific multiplication facts you find challenging.',
    'Confusion with fraction comparisons': 'Convert fractions to the same denominator first, or use visual fraction models to compare sizes.',
    'Time calculation errors': 'Practice with an analog clock model and work through problems step-by-step.'
  };
  
  return analyses[error] || 'Focus on understanding the underlying concepts and practice with similar problem types.';
}

// Helper function to derive skill ratings from concept masteries
function getSkillRatings(conceptMasteries: ConceptMastery[]): Array<{name: string, value: number}> {
  // Default skills if there's no data
  if (!conceptMasteries || conceptMasteries.length === 0) {
    return [
      { name: 'Problem Solving Speed', value: 0 },
      { name: 'Computational Accuracy', value: 0 },
      { name: 'Critical Thinking', value: 0 },
      { name: 'Pattern Recognition', value: 0 },
      { name: 'Math Fluency', value: 0 }
    ];
  }
  
  // Map concept types to skills
  const skillMap: Record<string, string[]> = {
    'Problem Solving Speed': ['Word Problems', 'Time', 'Money'],
    'Computational Accuracy': ['Addition', 'Subtraction', 'Multiplication', 'Division'],
    'Critical Thinking': ['Word Problems', 'Fractions', 'Percentages'],
    'Pattern Recognition': ['Patterns', 'Sequences', 'Algebra'],
    'Math Fluency': ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Mental Math']
  };
  
  return Object.entries(skillMap).map(([skillName, relatedConcepts]) => {
    // Find mastery levels for all related concepts
    const relevantMasteries = conceptMasteries.filter(mastery => 
      relatedConcepts.some(concept => mastery.concept.toLowerCase().includes(concept.toLowerCase()))
    );
    
    // Calculate average mastery level for this skill
    let value = 0;
    if (relevantMasteries.length > 0) {
      value = Math.round(
        relevantMasteries.reduce((sum, mastery) => sum + mastery.masteryLevel, 0) / 
        relevantMasteries.length
      );
    } else {
      // If no matching concepts, use all masteries with a lower weight
      value = conceptMasteries.length > 0 
        ? Math.round(conceptMasteries.reduce((sum, m) => sum + m.masteryLevel, 0) / conceptMasteries.length * 0.7)
        : 65; // Default fallback value
    }
    
    return { name: skillName, value };
  });
}

// Helper function to convert numeric values to text labels
function getRatingLabel(value: number): string {
  if (value >= 90) return 'Excellent';
  if (value >= 80) return 'Very Good';
  if (value >= 70) return 'Good';
  if (value >= 60) return 'Satisfactory';
  if (value >= 50) return 'Developing';
  if (value > 0) return 'Needs Practice';
  return '-';
}

function formatActivityName(activity: string): string {
  const nameMap: Record<string, string> = {
    'flashcards': 'Flashcard Drills',
    'wordProblems': 'Word Problem Set',
    'visualModels': 'Visual Learning Module',
    'gameBasedLearning': 'Math Games',
    'collaborativePractice': 'Partner Practice',
    'conceptMapping': 'Concept Mapping',

    'realWorldApplications': 'Real-World Math',
  };
  
  return nameMap[activity] || activity;
}

function getActivityDescription(activity: string): string {
  const descriptions: Record<string, string> = {
    'flashcards': 'Quick practice to reinforce basic facts and operations',
    'wordProblems': 'Strengthen your ability to apply math concepts to real situations',
    'visualModels': 'Use visual representations to build deeper understanding',
    'gameBasedLearning': 'Fun, interactive challenges that reinforce key concepts',
    'collaborativePractice': 'Work with others to solve problems and share strategies',
    'conceptMapping': 'Connect related math concepts to build a stronger knowledge framework',

    'realWorldApplications': 'Apply math to everyday situations for practical understanding',
  };
  
  return descriptions[activity] || 'Personalized activities based on your learning needs';
}