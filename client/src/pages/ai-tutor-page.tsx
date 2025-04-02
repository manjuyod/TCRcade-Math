import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AIMathTutor } from '@/components/ai-math-tutor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpenCheck } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AiTutorPage() {
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState("3");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  // Fetch categories for this grade
  const { 
    data: categories,
    isLoading: categoriesLoading
  } = useQuery({
    queryKey: ['/api/categories', selectedGrade],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/categories?grade=${selectedGrade}`);
      return res.json();
    }
  });

  // Fetch selected question with a refetch key to prevent stale data
  const [refetchKey, setRefetchKey] = useState(0);
  
  const { 
    data: currentQuestion,
    isLoading: questionLoading,
  } = useQuery({
    queryKey: ['/api/questions', currentQuestionId, refetchKey],
    queryFn: async () => {
      if (!currentQuestionId) return null;
      console.log(`Actually fetching question ID: ${currentQuestionId} with refetch key ${refetchKey}`);
      const res = await apiRequest('GET', `/api/questions/${currentQuestionId}`);
      const data = await res.json();
      console.log("API returned question data:", data);
      return data;
    },
    enabled: !!currentQuestionId,
    refetchOnWindowFocus: false,
  });

  const fetchNewQuestion = async () => {
    try {
      // First show loading state
      setCurrentQuestionId(null);
      
      // Construct parameters for the API request
      const params = new URLSearchParams();
      params.append('grade', selectedGrade);
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      
      // Add timestamp to force a fresh request every time
      params.append('t', Date.now().toString());
      
      // Force dynamic question generation for variety
      params.append('forceDynamic', 'true');
      
      // Avoid getting the same question by tracking previous IDs
      if (currentQuestionId) {
        params.append('exclude', currentQuestionId.toString());
      }
      
      console.log(`AI Tutor: Fetching new question with params: ${params.toString()}`);
      
      // Show loading feedback
      toast({
        title: "Generating question",
        description: "Creating a new math problem for you...",
      });
      
      const res = await apiRequest('GET', `/api/questions/next?${params}`);
      const data = await res.json();
      
      // Debug the response
      console.log("AI Tutor API response:", data);
      
      // Check if we received a valid question
      if (data && data.id) {
        console.log("New question received:", data);
        
        // Increase refetch key to force a new fetch from API
        setRefetchKey(prev => prev + 1);
        
        // Delay slightly to ensure UI state change is visible
        setTimeout(() => {
          setCurrentQuestionId(data.id);
          
          toast({
            title: "New problem ready!",
            description: "A fresh math problem has been generated for you.",
          });
        }, 500);
      } else {
        toast({
          title: "No questions found",
          description: "We couldn't find any questions matching your criteria. Try selecting a different grade or category.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching question:", error);
      toast({
        title: "Error",
        description: "Failed to fetch a question. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    setSelectedCategory(undefined);
    setCurrentQuestionId(null);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentQuestionId(null);
  };

  // No longer using a static sample question

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-3xl font-bold text-center mb-2 text-primary">AI Math Tutor</h1>
        <p className="text-center text-muted-foreground max-w-xl">
          Get personalized help with math problems using our AI tutor. Choose a grade level and topic, 
          then get step-by-step guidance, hints, and explanations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="shadow-md">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center">
                <BookOpenCheck className="h-5 w-5 mr-2 text-primary" />
                Select Problem
              </CardTitle>
              <CardDescription>Choose a grade level and category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <span className="bg-primary/10 text-primary rounded-full w-5 h-5 inline-flex items-center justify-center mr-2 text-xs">1</span>
                  Grade Level
                </h3>
                <Tabs defaultValue={selectedGrade} onValueChange={handleGradeChange}>
                  <TabsList className="grid grid-cols-7 w-full bg-muted/30">
                    <TabsTrigger value="K">K</TabsTrigger>
                    <TabsTrigger value="1">1</TabsTrigger>
                    <TabsTrigger value="2">2</TabsTrigger>
                    <TabsTrigger value="3">3</TabsTrigger>
                    <TabsTrigger value="4">4</TabsTrigger>
                    <TabsTrigger value="5">5</TabsTrigger>
                    <TabsTrigger value="6">6</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <span className="bg-primary/10 text-primary rounded-full w-5 h-5 inline-flex items-center justify-center mr-2 text-xs">2</span>
                  Category
                </h3>
                {categoriesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : categories && categories.length > 0 ? (
                  <Tabs defaultValue={selectedCategory} onValueChange={handleCategoryChange}>
                    <TabsList className="grid grid-cols-2 gap-2 bg-muted/30">
                      {categories.map((category: string) => (
                        <TabsTrigger 
                          key={category} 
                          value={category}
                          className="text-xs"
                        >
                          {category}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                ) : (
                  <p className="text-sm text-muted-foreground">No categories available for this grade</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button onClick={fetchNewQuestion} className="w-full bg-primary hover:bg-primary/90 font-medium">
                Get New Problem
              </Button>
            </CardFooter>
          </Card>

          <Card className="mt-4 shadow-md">
            <CardHeader className="pb-2 bg-muted/30">
              <CardTitle className="text-base flex items-center">
                <BookOpenCheck className="h-4 w-4 mr-2 text-primary" />
                Need help with:
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-2 px-3 w-full overflow-hidden hover:bg-primary/5 border-primary/20" 
                  onClick={() => {
                    setSelectedCategory("addition");
                    fetchNewQuestion();
                  }}
                >
                  <div className="text-left truncate w-full">
                    <div className="font-medium truncate">Addition</div>
                    <div className="text-xs text-muted-foreground truncate">Adding numbers</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-2 px-3 w-full overflow-hidden hover:bg-primary/5 border-primary/20" 
                  onClick={() => {
                    setSelectedCategory("subtraction");
                    fetchNewQuestion();
                  }}
                >
                  <div className="text-left truncate w-full">
                    <div className="font-medium truncate">Subtraction</div>
                    <div className="text-xs text-muted-foreground truncate">Taking away</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-2 px-3 w-full overflow-hidden hover:bg-primary/5 border-primary/20" 
                  onClick={() => {
                    setSelectedCategory("multiplication");
                    fetchNewQuestion();
                  }}
                >
                  <div className="text-left truncate w-full">
                    <div className="font-medium truncate">Multiplication</div>
                    <div className="text-xs text-muted-foreground truncate">Times tables</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-2 px-3 w-full overflow-hidden hover:bg-primary/5 border-primary/20" 
                  onClick={() => {
                    setSelectedCategory("division");
                    fetchNewQuestion();
                  }}
                >
                  <div className="text-left truncate w-full">
                    <div className="font-medium truncate">Division</div>
                    <div className="text-xs text-muted-foreground truncate">Sharing equally</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-2 px-3 w-full overflow-hidden hover:bg-primary/5 border-primary/20" 
                  onClick={() => {
                    setSelectedCategory("fractions");
                    fetchNewQuestion();
                  }}
                >
                  <div className="text-left truncate w-full">
                    <div className="font-medium truncate">Fractions</div>
                    <div className="text-xs text-muted-foreground truncate">Parts of a whole</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-2 px-3 w-full overflow-hidden hover:bg-primary/5 border-primary/20" 
                  onClick={() => {
                    setSelectedCategory("measurement");
                    fetchNewQuestion();
                  }}
                >
                  <div className="text-left truncate w-full">
                    <div className="font-medium truncate">Measurement</div>
                    <div className="text-xs text-muted-foreground truncate">Size, weight, time</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {currentQuestion ? (
            <>
              <Card className="shadow-md mb-6 overflow-hidden">
                <CardHeader className="bg-primary/10 pb-4">
                  <CardTitle className="text-xl flex items-center">
                    <BookOpenCheck className="h-5 w-5 mr-2 text-primary" />
                    Current Problem
                  </CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                      Grade {currentQuestion.grade}
                    </span>
                    <span className="mx-2 text-muted-foreground">&bull;</span>
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                      {currentQuestion.category}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-lg font-medium">{currentQuestion.question}</p>
                </CardContent>
              </Card>
              
              <AIMathTutor 
                question={currentQuestion.question}
                correctAnswer={currentQuestion.answer}
                grade={currentQuestion.grade}
                concept={currentQuestion.concepts?.[0]}
              />
            </>
          ) : questionLoading ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white/50 rounded-lg shadow-sm">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground font-medium">Loading your math problem...</p>
            </div>
          ) : (
            <>
              <Card className="shadow-md mb-6 overflow-hidden" id="problem-card">
                <CardHeader className="bg-primary/10 pb-4">
                  <CardTitle className="text-xl flex items-center">
                    <BookOpenCheck className="h-5 w-5 mr-2 text-primary" />
                    Get Started
                  </CardTitle>
                  <CardDescription>
                    Select a grade level and category, then click "Get New Problem" to begin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center justify-center h-32">
                    <p className="text-muted-foreground mb-3">
                      Click the "Get New Problem" button to generate a math problem
                    </p>
                    <Button 
                      onClick={fetchNewQuestion} 
                      className="bg-primary hover:bg-primary/90"
                    >
                      Get New Problem
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Empty AI Math Tutor shows instructions */}
              <AIMathTutor 
                question=""
                correctAnswer=""
                grade="3"
                concept="waiting"
              />
              
              <div className="mt-4 text-center text-sm flex flex-col items-center justify-center bg-muted/30 p-3 rounded-lg">
                <p className="text-muted-foreground mb-2">This is a sample problem to show you how the AI Math Tutor works.</p>
                <Button 
                  onClick={fetchNewQuestion} 
                  variant="outline"
                  className="border-primary/20 text-primary bg-white hover:bg-primary/10"
                >
                  <BookOpenCheck className="h-4 w-4 mr-2" />
                  Get a New Problem
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}