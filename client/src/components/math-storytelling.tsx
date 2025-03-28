import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { playSound } from '@/lib/sounds';
import { MathStory, Question } from '@shared/schema';
import { Loader2, BookOpen, MapPin, Star, ArrowRight, CheckCircle, MapIcon, Medal } from 'lucide-react';
import QuestionCard from './question-card';
import FeedbackMessage from './feedback-message';
import confetti from 'canvas-confetti';

export default function MathStorytelling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeStoryId, setActiveStoryId] = useState<number | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showStoryText, setShowStoryText] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    correct: boolean;
    tokensEarned: number;
    correctAnswer: string;
  } | null>(null);

  // Fetch available stories
  const { 
    data: stories, 
    isLoading: isLoadingStories 
  } = useQuery({
    queryKey: ['/api/stories'],
    queryFn: async () => {
      const res = await fetch(`/api/stories${user?.grade ? `?grade=${user.grade}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch stories');
      return res.json() as Promise<{
        stories: MathStory[];
        progress: Record<number, { completedNodes: number[]; isComplete: boolean }>;
      }>;
    }
  });

  // Fetch active story
  const { 
    data: activeStory, 
    isLoading: isLoadingStory,
    refetch: refetchActiveStory 
  } = useQuery({
    queryKey: ['/api/stories', activeStoryId],
    queryFn: async () => {
      if (!activeStoryId) return null;
      const res = await fetch(`/api/stories/${activeStoryId}`);
      if (!res.ok) throw new Error('Failed to fetch story');
      return res.json() as Promise<{
        story: MathStory;
        currentNodeId: number;
        progress: { completedNodes: number[] };
        question: Question | null;
      }>;
    },
    enabled: !!activeStoryId
  });

  // Update story progress
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { storyId: number; nodeId: number; complete: boolean }) => {
      const res = await apiRequest('POST', '/api/stories/progress', data);
      if (!res.ok) throw new Error('Failed to update progress');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stories', activeStoryId] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating progress',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Load question when story node changes
  useEffect(() => {
    if (activeStory?.question) {
      setCurrentQuestion(activeStory.question);
      setShowStoryText(true);
      setShowFeedback(false);
    }
  }, [activeStory]);

  // Handle selecting a story
  const handleSelectStory = (storyId: number) => {
    setActiveStoryId(storyId);
    setCurrentNodeId(1);
    setShowFeedback(false);
    setShowStoryText(true);
  };

  // Continue to the next node in the story
  const handleContinueStory = () => {
    if (!activeStory || !activeStoryId) return;
    
    // Find the next incomplete node
    const completedNodes = activeStory.progress?.completedNodes || [];
    const totalNodes = activeStory.story.nodeCount;
    
    let nextNode = currentNodeId + 1;
    while (completedNodes.includes(nextNode) && nextNode <= totalNodes) {
      nextNode++;
    }
    
    if (nextNode <= totalNodes) {
      setCurrentNodeId(nextNode);
      refetchActiveStory();
    } else {
      // Story complete!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      playSound('levelUp');
      
      toast({
        title: 'Story Complete!',
        description: `You've completed "${activeStory.story.title}" and earned ${activeStory.story.completionReward} tokens!`,
        variant: 'default',
      });
      
      // Return to story selection
      setActiveStoryId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
    }
  };

  // Handle answering a question
  const handleAnswerSubmit = (answer: string) => {
    if (!currentQuestion) return;
    
    const isCorrect = answer.toLowerCase() === currentQuestion.answer.toLowerCase();
    
    // Play appropriate sound
    isCorrect ? playSound('correct') : playSound('incorrect');
    
    // Set feedback data
    setFeedbackData({
      correct: isCorrect,
      tokensEarned: isCorrect ? 10 : 0,
      correctAnswer: currentQuestion.answer
    });
    
    // Update progress if correct
    if (isCorrect && activeStoryId) {
      updateProgressMutation.mutate({
        storyId: activeStoryId,
        nodeId: currentNodeId,
        complete: true
      });
    }
    
    // Show feedback
    setShowFeedback(true);
    setShowStoryText(false);
  };

  // Handle continuing after feedback
  const handleAfterFeedback = () => {
    setShowFeedback(false);
    
    if (feedbackData?.correct) {
      // If correct, continue to next story node
      handleContinueStory();
    } else {
      // If incorrect, show the question again
      setShowStoryText(true);
    }
  };

  // Story selection view
  if (!activeStoryId) {
    if (isLoadingStories) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading math stories...</p>
        </div>
      );
    }
    
    return (
      <div className="math-stories space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Math Storytelling</h2>
          <p className="text-muted-foreground">
            Embark on mathematical adventures that combine narrative with problem-solving
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stories?.stories.map((story) => {
            const progress = stories.progress[story.id];
            const completedNodes = progress?.completedNodes.length || 0;
            const percentComplete = (completedNodes / story.nodeCount) * 100;
            const isComplete = progress?.isComplete || false;
            
            return (
              <Card key={story.id} className={`
                overflow-hidden transition-all duration-300 hover:shadow-md
                ${isComplete ? 'border-green-200 bg-green-50/50' : ''}
              `}>
                <div className="h-40 bg-gradient-to-r from-primary/20 to-primary/5 relative">
                  {story.coverImage && (
                    <img 
                      src={story.coverImage} 
                      alt={story.title} 
                      className="w-full h-full object-cover opacity-80" 
                    />
                  )}
                  {isComplete && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" /> Completed
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-background/80">
                        {story.grade} Grade
                      </Badge>
                      <Badge variant="outline" className="bg-background/80">
                        {story.categories?.[0] || 'Mixed'}
                      </Badge>
                      <Badge variant="outline" className="bg-background/80 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {story.nodeCount} Stops
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-primary" />
                      {story.title}
                    </span>
                    <Badge variant="outline" className="flex items-center">
                      <Star className="h-3 w-3 mr-1 text-yellow-500" />
                      {story.difficultyRange?.[0]}-{story.difficultyRange?.[1]}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {story.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{completedNodes}/{story.nodeCount} ({Math.round(percentComplete)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${percentComplete}%` }} 
                    />
                  </div>
                  
                  <div className="mt-4 flex items-center text-sm text-muted-foreground">
                    <Medal className="h-4 w-4 mr-1 text-yellow-500" />
                    <span>Reward: {story.completionReward} tokens on completion</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full"
                    variant={isComplete ? "outline" : "default"}
                    onClick={() => handleSelectStory(story.id)}
                  >
                    {isComplete ? 'Play Again' : percentComplete > 0 ? 'Continue Story' : 'Start Story'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Loading active story
  if (isLoadingStory) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading story...</p>
      </div>
    );
  }

  // No active story data
  if (!activeStory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Story Error</CardTitle>
          <CardDescription>Could not load story</CardDescription>
        </CardHeader>
        <CardContent>
          <p>There was a problem loading this story.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => setActiveStoryId(null)}>Back to Stories</Button>
        </CardFooter>
      </Card>
    );
  }

  // Feedback view
  if (showFeedback && feedbackData) {
    return (
      <Card className="story-feedback">
        <CardHeader>
          <CardTitle>{activeStory.story.title} - Node {currentNodeId}</CardTitle>
          <CardDescription>
            {activeStory.question?.storyText || 'Answer the question to continue the story'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackMessage
            correct={feedbackData.correct}
            tokensEarned={feedbackData.tokensEarned}
            correctAnswer={feedbackData.correctAnswer}
            onNextQuestion={handleAfterFeedback}
          />
        </CardContent>
      </Card>
    );
  }

  // Story view with question
  return (
    <Card className="story-view">
      <CardHeader className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute right-4 top-4"
          onClick={() => setActiveStoryId(null)}
        >
          Back to Stories
        </Button>
        <CardTitle className="flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-primary" />
          {activeStory.story.title}
        </CardTitle>
        <CardDescription>
          <div className="flex items-center mt-1">
            <MapIcon className="h-4 w-4 mr-1 text-muted-foreground" />
            <span>Node {currentNodeId} of {activeStory.story.nodeCount}</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="story-progress-map mb-4 flex items-center justify-between px-4">
          {Array.from({ length: activeStory.story.nodeCount }).map((_, i) => {
            const nodeNumber = i + 1;
            const isCompleted = activeStory.progress.completedNodes.includes(nodeNumber);
            const isCurrent = nodeNumber === currentNodeId;
            
            return (
              <div key={nodeNumber} className="flex flex-col items-center">
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-200 text-gray-600'}
                  `}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : nodeNumber}
                </div>
                {i < activeStory.story.nodeCount - 1 && (
                  <div 
                    className={`
                      h-0.5 w-12 mt-4 
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
        
        {showStoryText && activeStory.question?.storyText && (
          <Card className="mb-6 bg-muted/50">
            <CardContent className="pt-6">
              <ScrollArea className="h-40">
                <div className="space-y-4">
                  <p className="italic">{activeStory.question.storyText}</p>
                  {activeStory.question.storyImage && (
                    <div className="flex justify-center">
                      <img 
                        src={activeStory.question.storyImage} 
                        alt="Story illustration" 
                        className="max-w-full max-h-24 object-contain rounded-md"
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button 
                onClick={() => setShowStoryText(false)} 
                className="w-full"
                variant="default"
                size="sm"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Continue to Question
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {(!showStoryText && currentQuestion) && (
          <QuestionCard
            question={currentQuestion}
            onAnswerSubmit={handleAnswerSubmit}
          />
        )}
      </CardContent>
    </Card>
  );
}