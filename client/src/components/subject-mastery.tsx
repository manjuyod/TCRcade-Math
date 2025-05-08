import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SubjectMastery as SubjectMasteryType } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Define grade levels for the application
const GRADE_LEVELS = ['K', '1', '2', '3', '4', '5', '6'];

// Grade-specific subjects
const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  'K': ['addition', 'subtraction', 'counting'],
  '1': ['addition', 'subtraction', 'counting'],
  '2': ['addition', 'subtraction', 'place-value'],
  '3': ['addition', 'subtraction', 'multiplication', 'division'],
  '4': ['multiplication', 'division', 'fractions'],
  '5': ['decimals', 'fractions', 'geometry'],
  '6': ['algebra', 'percentages', 'ratios']
};

// Friendly display names for subjects
const SUBJECT_DISPLAY_NAMES: Record<string, string> = {
  'addition': 'Addition',
  'subtraction': 'Subtraction',
  'counting': 'Counting',
  'place-value': 'Place Value',
  'multiplication': 'Multiplication',
  'division': 'Division',
  'fractions': 'Fractions',
  'decimals': 'Decimals',
  'geometry': 'Geometry',
  'algebra': 'Algebra',
  'percentages': 'Percentages',
  'ratios': 'Ratios'
};

export function SubjectMastery({ userId, currentGrade }: { userId: number, currentGrade: string }) {
  const { toast } = useToast();
  const [selectedGrade, setSelectedGrade] = useState(currentGrade || '5');

  // Get all subject masteries for the user
  const { data: allMasteries, isLoading: masteriesLoading } = useQuery({
    queryKey: ['/api/subject-masteries'],
    retry: 1,
  });

  // Get available subjects for the selected grade
  const { data: availableSubjects, isLoading: subjectsLoading, refetch: refetchSubjects } = useQuery({
    queryKey: ['/api/subjects/available', selectedGrade],
    queryFn: async () => {
      const res = await fetch(`/api/subjects/available/${selectedGrade}`);
      if (!res.ok) throw new Error('Failed to fetch available subjects');
      return res.json();
    },
    retry: 1,
  });

  // Initialize subject masteries for a user
  const initializeMutation = useMutation({
    mutationFn: async (grade: string) => {
      const res = await fetch('/api/subject-mastery/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade })
      });
      
      if (!res.ok) throw new Error('Failed to initialize subject masteries');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subject-masteries'] });
      refetchSubjects();
      toast({
        title: 'Subjects Initialized',
        description: `Subjects for grade ${selectedGrade} are now available.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Initialization Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Reset all subject masteries for a user
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/subject-mastery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) throw new Error('Failed to reset subject masteries');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subject-masteries'] });
      refetchSubjects();
      toast({
        title: 'Reset Complete',
        description: 'All subject masteries have been reset successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Reset Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Filter masteries by the selected grade
  const gradeSpecificMasteries = allMasteries?.filter(
    (mastery: SubjectMasteryType) => mastery.grade === selectedGrade
  ) || [];

  // Get locked/unlocked status for all subjects in the current grade
  const getSubjectStatus = (subject: string) => {
    const mastery = gradeSpecificMasteries.find(
      (m: SubjectMasteryType) => m.subject === subject
    );
    
    if (!mastery) return { unlocked: false, proficiencyScore: 0 };
    
    // Calculate proficiency score (0-1) based on correctAttempts / totalAttempts
    const proficiencyScore = mastery.totalAttempts > 0 
      ? mastery.correctAttempts / mastery.totalAttempts 
      : 0;
    
    return { 
      unlocked: mastery.isUnlocked, 
      proficiencyScore: proficiencyScore,
      attempts: mastery.totalAttempts || 0,
      correct: mastery.correctAttempts || 0
    };
  };

  // Handle grade change
  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
  };

  // Initialize subjects for the current grade if none are available
  const handleInitializeSubjects = () => {
    initializeMutation.mutate(selectedGrade);
  };
  
  // Reset all subject masteries
  const handleResetMasteries = () => {
    if (window.confirm("Are you sure you want to reset all subject masteries? This will delete all progress tracking data.")) {
      resetMutation.mutate();
    }
  };

  if (masteriesLoading || subjectsLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Math Subject Mastery</CardTitle>
        <CardDescription>
          Track your progress across different math subjects and grade levels.
          {!availableSubjects?.length && (
            <div className="mt-2">
              <Button 
                onClick={handleInitializeSubjects}
                disabled={initializeMutation.isPending}
                size="sm"
              >
                {initializeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  'Initialize Grade Subjects'
                )}
              </Button>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <Tabs defaultValue={selectedGrade} onValueChange={handleGradeChange} className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <TabsList>
                  {GRADE_LEVELS.map((grade) => (
                    <TabsTrigger key={grade} value={grade}>
                      Grade {grade}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleResetMasteries}
                  disabled={resetMutation.isPending}
                  className="ml-2"
                >
                  {resetMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset All Masteries'
                  )}
                </Button>
              </div>

              {GRADE_LEVELS.map((grade) => (
                <TabsContent key={grade} value={grade}>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Grade {grade} Subjects</h3>
                    
                    {availableSubjects?.length ? (
                      <Accordion type="single" collapsible className="w-full">
                        {SUBJECTS_BY_GRADE[grade]?.map((subject) => {
                          const status = getSubjectStatus(subject);
                          return (
                            <AccordionItem key={subject} value={subject}>
                              <AccordionTrigger className="px-4 py-2 bg-muted/50 rounded-md">
                                <div className="flex justify-between items-center w-full pr-4">
                                  <span>{SUBJECT_DISPLAY_NAMES[subject] || subject}</span>
                                  {status.unlocked ? (
                                    <Badge className="ml-2 bg-green-500">Unlocked</Badge>
                                  ) : (
                                    <Badge className="ml-2 bg-gray-500">Locked</Badge>
                                  )}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 py-2">
                                {status.unlocked ? (
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                      <span>Proficiency</span>
                                      <span>{Math.round(status.proficiencyScore * 100)}%</span>
                                    </div>
                                    <Progress value={status.proficiencyScore * 100} className="h-2" />
                                    
                                    <div className="flex justify-between mt-2 text-sm">
                                      <span>Problems Attempted: {status.attempts}</span>
                                      {status.attempts > 0 && (
                                        <span>Success Rate: {Math.round((status.correct / status.attempts) * 100)}%</span>
                                      )}
                                    </div>
                                    
                                    {status.attempts >= 30 && status.proficiencyScore >= 0.8 && (
                                      <div className="mt-2 p-2 bg-green-100 text-green-800 rounded-md text-sm">
                                        You've mastered this subject! The next grade level has been unlocked.
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground text-sm">
                                    This subject is locked. Complete earlier grade subjects to unlock.
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    ) : (
                      <div className="p-4 text-center border rounded-md bg-muted/50">
                        No subjects available for Grade {grade}.
                        {grade === selectedGrade && (
                          <Button
                            onClick={handleInitializeSubjects}
                            className="mt-2"
                            disabled={initializeMutation.isPending}
                            size="sm"
                          >
                            {initializeMutation.isPending ? "Initializing..." : "Initialize Subjects"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}