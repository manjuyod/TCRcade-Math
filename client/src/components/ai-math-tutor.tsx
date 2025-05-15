import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, LightbulbIcon, HelpCircle, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type TutorProps = {
  question: string;
  correctAnswer: string;
  grade: string;
  concept?: string;
}

export function AIMathTutorComponent({ question, correctAnswer, grade, concept }: TutorProps) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("help");
  const [loading, setLoading] = useState<"feedback" | "hint" | "explanation" | null>(null);
  const [attempts, setAttempts] = useState(0);
  const { toast } = useToast();

  // Handle both string and object question formats
  const questionObject = typeof question === 'string' ? 
    (question.startsWith('{') ? JSON.parse(question) : { text: question }) : 
    question;
  const questionText = typeof questionObject === 'object' ? questionObject.text : question;

  const handleCheckAnswer = async () => {
    if (!answer.trim()) {
      toast({
        title: "Please enter an answer",
        description: "Try solving the problem before checking your answer.",
        variant: "destructive",
      });
      return;
    }

    setLoading("feedback");
    try {
      const response = await apiRequest("POST", "/api/tutor/feedback", {
        question,
        studentAnswer: answer,
        correctAnswer
      });

      const data = await response.json();
      setFeedback(data.feedback);
      setIsCorrect(data.isCorrect);

      if (!data.isCorrect) {
        setAttempts(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error getting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to get feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleGetHint = async () => {
    setLoading("hint");
    try {
      const response = await apiRequest("POST", "/api/tutor/hint", {
        question,
        grade,
        previousAttempts: attempts
      });

      const data = await response.json();
      setHint(data.hint);
    } catch (error) {
      console.error("Error getting hint:", error);
      toast({
        title: "Error",
        description: "Failed to get a hint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleGetExplanation = async () => {
    if (!concept) {
      toast({
        title: "No concept specified",
        description: "Cannot provide explanation without a specified math concept.",
        variant: "destructive",
      });
      return;
    }

    setLoading("explanation");
    try {
      const response = await apiRequest("POST", "/api/tutor/explain", {
        concept,
        grade
      });

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (error) {
      console.error("Error getting explanation:", error);
      toast({
        title: "Error",
        description: "Failed to get an explanation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">AI Math Tutor</CardTitle>
        <CardDescription>Get personalized help for this math problem</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle size={16} /> Help
            </TabsTrigger>
            <TabsTrigger value="hint" className="flex items-center gap-2">
              <LightbulbIcon size={16} /> Hint
            </TabsTrigger>
            {concept && (
              <TabsTrigger value="learn" className="flex items-center gap-2">
                <BookOpen size={16} /> Learn
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="help">
            <div className="space-y-4">
              <div>
                <Label htmlFor="answer">Your Answer:</Label>
                <div className="flex gap-2 mt-1">
                <div className="mb-4 text-2xl font-bold text-center">
                {questionText}
              </div>
                  <Input
                    id="answer"
                    placeholder="Enter your answer here"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                  <Button onClick={handleCheckAnswer} disabled={loading === "feedback"}>
                    {loading === "feedback" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Check"
                    )}
                  </Button>
                </div>
              </div>

              {isCorrect !== null && (
                <Alert className={isCorrect ? "bg-green-50" : "bg-amber-50"}>
                  <AlertCircle className={isCorrect ? "text-green-500" : "text-amber-500"} />
                  <AlertTitle>{isCorrect ? "Correct!" : "Not quite right"}</AlertTitle>
                  <AlertDescription className="whitespace-pre-line">
                    {feedback}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="hint">
            <div className="space-y-4">
              <Button onClick={handleGetHint} disabled={loading === "hint"} className="w-full">
                {loading === "hint" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Hint...
                  </>
                ) : (
                  <>
                    <LightbulbIcon className="mr-2 h-4 w-4" />
                    Get a Hint
                  </>
                )}
              </Button>

              {hint && (
                <Alert className="bg-blue-50">
                  <LightbulbIcon className="h-4 w-4 text-blue-500" />
                  <AlertTitle>Hint</AlertTitle>
                  <AlertDescription className="whitespace-pre-line">
                    {hint}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {concept && (
            <TabsContent value="learn">
              <div className="space-y-4">
                <Button onClick={handleGetExplanation} disabled={loading === "explanation"} className="w-full">
                  {loading === "explanation" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Explanation...
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Explain {concept}
                    </>
                  )}
                </Button>

                {explanation && (
                  <Alert className="bg-purple-50">
                    <BookOpen className="h-4 w-4 text-purple-500" />
                    <AlertTitle>Learn about {concept}</AlertTitle>
                    <AlertDescription className="whitespace-pre-line">
                      {explanation}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          AI tutoring powered by GPT-4o
        </div>
        <div className="text-xs text-muted-foreground">
          {attempts > 0 && `Attempts: ${attempts}`}
        </div>
      </CardFooter>
    </Card>
  );
}

export default function AiMathTutor() {
  return (
    <div className="w-full">
      <Card className="w-full mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">AI Math Tutor</CardTitle>
          <CardDescription>
            Get personalized help with your math problems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">
            The AI Math Tutor helps you with step-by-step explanations, hints, and personalized
            assistance for any math problem you're working on.
          </p>
          <Button className="w-full" onClick={() => window.location.href = '/tutor'}>
            <BookOpen className="mr-2 h-4 w-4" />
            Go to AI Math Tutor
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}