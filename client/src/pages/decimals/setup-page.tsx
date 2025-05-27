import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Calculator, Shield } from "lucide-react";
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
import { DECIMAL_DEFENDER_RULES } from "@shared/decimalDefenderRules";

export default function DecimalDefenderSetupPage() {
  const [, navigate] = useLocation();
  const [selectedSkill, setSelectedSkill] = useState<string>("");

  const handleStart = async () => {
    if (!selectedSkill) return;

    // Store selected skill
    localStorage.setItem("decimalDefenderSkill", selectedSkill);

    // Force generate new questions when starting
    try {
      const response = await fetch(
        `/api/decimals/questions?skill=${selectedSkill}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        console.log("Decimal defender questions generated successfully");
      }
    } catch (error) {
      console.error("Error generating decimal questions:", error);
    }

    // Navigate to play page
    navigate("/decimals/play");
  };

  const skillDescriptions = {
    rounding: "Adjust decimals to the nearest checkpoint — whole, tenth, or hundredth!",
    comparing: "Scan and detect which decimal is greater, smaller, or the same",
    add_subtract: "Add or subtract decimal numbers to boost your team’s energy!",
    place_value: "Find the right digit in the decimal to keep your system stable"
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-8">
            <Shield className="h-16 w-16 text-cyan-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Decimal Defender</h1>
            <p className="text-muted-foreground">
              Master decimal skills through{" "}
              {DECIMAL_DEFENDER_RULES.questionsPerSession} challenging questions
            </p>
          </div>

          <div className="bg-cyan-50 border border-cyan-300 rounded-xl p-4 mb-8 shadow-sm text-center">
            <h3 className="text-md font-semibold text-cyan-800 mb-2">Mission</h3>
            <p className="text-sm text-gray-700 mb-3">
              Answer 5 decimal questions to shield your squad and secure your base.
              Victory depends on your math skills!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm text-white max-w-xl mx-auto">
              <div className="bg-blue-500 px-3 py-2 rounded-lg text-center">
                Reward: 4 tokens per correct answer
              </div>
              <div className="bg-yellow-500 px-3 py-2 rounded-lg text-center">
                Bonus: 15 tokens for a perfect score
              </div>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Pick a Decimal Mission
              </CardTitle>
              <CardDescription>
                Choose a decimal skill to get mission-ready. Each correct answer earns you tokens! 
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <RadioGroup
                value={selectedSkill}
                onValueChange={setSelectedSkill}
              >
                {DECIMAL_DEFENDER_RULES.skills.map((skill) => (
                  <motion.div
                    key={skill}
                    whileHover={{ scale: 1.02 }}
                    className={`flex items-center space-x-2 p-4 border rounded-lg cursor-pointer 
                    hover:bg-cyan-50 hover:text-cyan-800 transition-colors duration-150 ease-in-out`}
                    onClick={() => setSelectedSkill(skill)}
                  >
                    <RadioGroupItem value={skill} id={skill} />
                    <Label htmlFor={skill} className="flex-1 cursor-pointer">
                      <div className="font-medium capitalize">
                        {skill.replace("_", " & ")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {
                          skillDescriptions[
                            skill as keyof typeof skillDescriptions
                          ]
                        }
                      </div>
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
              

              <Button
                className="w-full"
                size="lg"
                onClick={handleStart}
                disabled={!selectedSkill}
              >
                Start Decimal Mission
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Navigation active="home" />
    </div>
  );
}
