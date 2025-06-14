import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Calculator, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import { FRACTIONS_PUZZLE_RULES } from "@shared/fractionsPuzzleRules";

export default function FractionsSetupPage() {
  const [, navigate] = useLocation();
  const [selectedSkill, setSelectedSkill] = useState<string>("");

  const handleStart = async () => {
    if (!selectedSkill) return;

    // Store selected skill
    localStorage.setItem("fractionsSkill", selectedSkill);

    // Force generate new questions when starting
    try {
      const response = await fetch("/api/fractions/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: selectedSkill }),
      });

      if (response.ok) {
        console.log("Questions generated successfully");
      }
    } catch (error) {
      console.error("Error generating questions:", error);
    }

    // Navigate to play page
    navigate("/fractions/play");
  };

  const getSkillInfo = (skill: string) => {
    const skillDescriptions = {
      define: {
        title: "Define Fractions",
        description: "Identify fractions from visual fraction bars",
        icon: <Puzzle className="h-5 w-5" />,
      },
      gcdSimplify: {
        title: "GCD & Simplify",
        description: "Find the GCD first, then simplify fractions",
        icon: <Calculator className="h-5 w-5" />,
      },
      simplify: {
        title: "Simplify Fractions",
        description: "Reduce fractions to their lowest terms",
        icon: <Calculator className="h-5 w-5" />,
      },
      equivalent: {
        title: "Equivalent Fractions",
        description: "Find and identify equivalent fractions",
        icon: <Puzzle className="h-5 w-5" />,
      },
      addSub: {
        title: "Add & Subtract",
        description: "Add and subtract fractions with different denominators",
        icon: <Calculator className="h-5 w-5" />,
      },
      mulDiv: {
        title: "Multiply & Divide",
        description: "Multiply and divide fractions",
        icon: <Calculator className="h-5 w-5" />,
      },
      mixedImproper: {
        title: "Mixed & Improper",
        description: "Convert between mixed numbers and improper fractions",
        icon: <Puzzle className="h-5 w-5" />,
      },
    };

    return (
      skillDescriptions[skill as keyof typeof skillDescriptions] || {
        title: skill,
        description: "Practice this fraction skill",
        icon: <Calculator className="h-5 w-5" />,
      }
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <Navigation active="home" />

      <main className="flex-1 flex items-center justify-center py-6 px-4">
        <div className="w-full max-w-4xl">
          <div className="mb-6 flex items-center">
            <Button
              variant="ghost"
              className="mr-2"
              onClick={() => navigate("/modules")}
            >
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Modules
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <Card className="w-full max-w-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-primary">
                  Fractions Puzzle
                </CardTitle>
                <CardDescription className="text-lg">
                  Choose a fraction skill to master through 10 progressively
                  challenging questions!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Select Your Skill:</h3>

                  <RadioGroup
                    value={selectedSkill}
                    onValueChange={setSelectedSkill}
                  >
                    <div className="grid gap-3">
                      {FRACTIONS_PUZZLE_RULES.skills.map((skill) => {
                        const skillInfo = getSkillInfo(skill);
                        return (
                          <div
                            key={skill}
                            className="flex items-center space-x-3"
                          >
                            <RadioGroupItem value={skill} id={skill} />
                            <Label
                              htmlFor={skill}
                              className="flex-1 cursor-pointer"
                            >
                              <Card className="p-3 hover:bg-accent transition-colors">
                                <div className="flex items-center space-x-3">
                                  <div className="text-primary">
                                    {skillInfo.icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {skillInfo.title}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {skillInfo.description}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>
                </div>

                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={handleStart}
                    disabled={!selectedSkill}
                    size="lg"
                    className="px-8 py-3 text-lg font-semibold"
                  >
                    Start{" "}
                    {selectedSkill
                      ? selectedSkill === "define"
                        ? "Fraction Definition"
                        : selectedSkill === "simplify"
                          ? "Simplify Fractions"
                          : selectedSkill === "equivalent"
                            ? "Equivalent Fractions"
                            : selectedSkill === "addSub"
                              ? "Add & Subtract"
                              : selectedSkill === "mulDiv"
                                ? "Multiply & Divide"
                                : selectedSkill === "mixedImproper"
                                  ? "Mixed & Improper"
                                  : "Fractions Puzzle"
                      : "Fractions Puzzle"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
