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

  // Fetch selected question
  const { 
    data: currentQuestion,
    isLoading: questionLoading,
    refetch: refetchQuestion
  } = useQuery({
    queryKey: ['/api/questions', currentQuestionId],
    queryFn: async () => {
      if (!currentQuestionId) return null;
      const res = await apiRequest('GET', `/api/questions/${currentQuestionId}`);
      return res.json();
    },
    enabled: !!currentQuestionId,
  });

  const fetchNewQuestion = async () => {
    try {
      const params = new URLSearchParams();
      params.append('grade', selectedGrade);
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      
      const res = await apiRequest('GET', `/api/questions/next?${params}`);
      const data = await res.json();
      
      if (data.question) {
        setCurrentQuestionId(data.question.id);
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

  // Sample question for demo (will be replaced with API data)
  const sampleQuestion = {
    id: 1,
    question: "If John has 8 apples and gives 3 to his friend, how many apples does John have left?",
    correctAnswer: "5",
    grade: "3",
    concepts: ["Subtraction"],
    category: "Operations"
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">AI Math Tutor</h1>
        <p className="text-center text-muted-foreground max-w-xl">
          Get personalized help with math problems using our AI tutor. Choose a grade level and topic, 
          then get step-by-step guidance, hints, and explanations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Select Problem</CardTitle>
              <CardDescription>Choose a grade level and category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Grade Level</h3>
                <Tabs defaultValue={selectedGrade} onValueChange={handleGradeChange}>
                  <TabsList className="grid grid-cols-7 w-full">
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
                <h3 className="text-sm font-medium mb-2">Category</h3>
                {categoriesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : categories && categories.length > 0 ? (
                  <Tabs defaultValue={selectedCategory} onValueChange={handleCategoryChange}>
                    <TabsList className="grid grid-cols-2 gap-2">
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
            <CardFooter>
              <Button onClick={fetchNewQuestion} className="w-full">
                Get New Problem
              </Button>
            </CardFooter>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Need help with:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => setSelectedCategory("Operations")}>
                  <div className="text-left">
                    <div className="font-medium">Addition</div>
                    <div className="text-xs text-muted-foreground">Adding numbers</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => setSelectedCategory("Operations")}>
                  <div className="text-left">
                    <div className="font-medium">Subtraction</div>
                    <div className="text-xs text-muted-foreground">Taking away</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => setSelectedCategory("Operations")}>
                  <div className="text-left">
                    <div className="font-medium">Multiplication</div>
                    <div className="text-xs text-muted-foreground">Times tables</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => setSelectedCategory("Operations")}>
                  <div className="text-left">
                    <div className="font-medium">Division</div>
                    <div className="text-xs text-muted-foreground">Sharing equally</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => setSelectedCategory("Fractions")}>
                  <div className="text-left">
                    <div className="font-medium">Fractions</div>
                    <div className="text-xs text-muted-foreground">Parts of a whole</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => setSelectedCategory("Measurement")}>
                  <div className="text-left">
                    <div className="font-medium">Measurement</div>
                    <div className="text-xs text-muted-foreground">Size, weight, time</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {currentQuestion ? (
            <>
              <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-2">Problem</h2>
                <p className="text-lg">{currentQuestion.question}</p>
                <div className="flex items-center mt-4 text-sm text-muted-foreground">
                  <BookOpenCheck className="h-4 w-4 mr-1" />
                  <span>Grade {currentQuestion.grade} &middot; {currentQuestion.category}</span>
                </div>
              </div>
              
              <AIMathTutor 
                question={currentQuestion.question}
                correctAnswer={currentQuestion.answer}
                grade={currentQuestion.grade}
                concept={currentQuestion.concepts?.[0]}
              />
            </>
          ) : questionLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading problem...</p>
            </div>
          ) : (
            <>
              <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-2">Problem</h2>
                <p className="text-lg">{sampleQuestion.question}</p>
                <div className="flex items-center mt-4 text-sm text-muted-foreground">
                  <BookOpenCheck className="h-4 w-4 mr-1" />
                  <span>Grade {sampleQuestion.grade} &middot; {sampleQuestion.category}</span>
                </div>
              </div>

              <AIMathTutor 
                question={sampleQuestion.question}
                correctAnswer={sampleQuestion.correctAnswer}
                grade={sampleQuestion.grade}
                concept={sampleQuestion.concepts[0]}
              />
              
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>This is a sample problem. Click "Get New Problem" to fetch a real problem from our database.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}