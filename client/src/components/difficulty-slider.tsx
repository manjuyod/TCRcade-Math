import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Award, Trophy, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface DifficultySliderProps {
  userId: number;
  currentDifficulty?: number;
}

export function DifficultySlider({ userId, currentDifficulty = 3 }: DifficultySliderProps) {
  const [difficulty, setDifficulty] = useState<number>(currentDifficulty);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const { toast } = useToast();

  // Update when prop changes (when component first loads)
  useEffect(() => {
    if (currentDifficulty) {
      setDifficulty(currentDifficulty);
    }
  }, [currentDifficulty]);

  const difficultyLabels = {
    1: { label: "Easy", color: "bg-green-500", icon: <Brain className="h-4 w-4 mr-1" /> },
    2: { label: "Moderate", color: "bg-blue-500", icon: <Zap className="h-4 w-4 mr-1" /> },
    3: { label: "Standard", color: "bg-purple-500", icon: <Star className="h-4 w-4 mr-1" /> },
    4: { label: "Challenging", color: "bg-orange-500", icon: <Award className="h-4 w-4 mr-1" /> },
    5: { label: "Expert", color: "bg-red-500", icon: <Trophy className="h-4 w-4 mr-1" /> }
  };

  // Throttle updates to avoid too many API calls
  useEffect(() => {
    const updateDifficulty = async () => {
      try {
        setIsUpdating(true);
        const response = await fetch(`/api/user/difficulty`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ difficulty }),
        });

        if (!response.ok) {
          throw new Error("Failed to update difficulty preference");
        }

        // Invalidate user queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        toast({
          title: "Difficulty Updated",
          description: `Learning difficulty set to ${difficultyLabels[difficulty as keyof typeof difficultyLabels].label}`,
          variant: "default",
        });
      } catch (error) {
        console.error("Error updating difficulty:", error);
        toast({
          title: "Update Failed",
          description: "Could not update difficulty preference. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUpdating(false);
      }
    };

    // Set a timer to update after the user has stopped moving the slider
    const timer = setTimeout(() => {
      // Only update if user is authenticated and the value has changed
      if (userId && difficulty !== currentDifficulty) {
        updateDifficulty();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [difficulty, userId, currentDifficulty, toast]);

  // Calculate token bonus based on difficulty level
  const tokenBonus = Math.max(0, difficulty - 2); // 0 bonus for levels 1-2, then +1 per level above

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Adaptive Difficulty</CardTitle>
        <CardDescription>
          Adjust the difficulty level of your learning experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Badge className={`${difficultyLabels[difficulty as keyof typeof difficultyLabels].color} flex items-center`}>
              {difficultyLabels[difficulty as keyof typeof difficultyLabels].icon}
              {difficultyLabels[difficulty as keyof typeof difficultyLabels].label}
            </Badge>
            {tokenBonus > 0 && (
              <Badge variant="outline" className="border-orange-500 text-orange-500">
                +{tokenBonus} token{tokenBonus > 1 ? 's' : ''} bonus per correct answer
              </Badge>
            )}
          </div>

          <Slider
            value={[difficulty]}
            min={1}
            max={5}
            step={1}
            onValueChange={(value) => setDifficulty(value[0])}
            disabled={isUpdating}
            className="py-4"
          />

          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Easier Questions</span>
            <span>Harder Questions</span>
          </div>

          <div className="text-sm mt-4 text-muted-foreground">
            {difficulty <= 2 && (
              <p>Learning at an easier pace with more frequent success.</p>
            )}
            {difficulty === 3 && (
              <p>Balanced learning with a mix of familiar and challenging content.</p>
            )}
            {difficulty >= 4 && (
              <p>Accelerated learning with more difficult questions and higher token rewards.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}