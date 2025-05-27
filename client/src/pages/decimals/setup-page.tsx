
import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight, Calculator, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { DECIMAL_DEFENDER_RULES } from '@shared/decimalDefenderRules';

export default function DecimalDefenderSetupPage() {
  const [, navigate] = useLocation();
  const [selectedSkill, setSelectedSkill] = useState<string>('');

  const handleStart = async () => {
    if (!selectedSkill) return;
    
    // Store selected skill
    localStorage.setItem('decimalDefenderSkill', selectedSkill);
    
    // Force generate new questions when starting
    try {
      const response = await fetch(`/api/decimals/questions?skill=${selectedSkill}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('Decimal defender questions generated successfully');
      }
    } catch (error) {
      console.error('Error generating decimal questions:', error);
    }
    
    // Navigate to play page
    navigate('/decimals/play');
  };

  const skillDescriptions = {
    rounding: "Round decimals to specified places (whole, tenth, hundredth)",
    comparing: "Compare decimal values using <, >, or =",
    add_subtract: "Add and subtract decimal numbers with proper alignment",
    place_value: "Identify digits in specific decimal places"
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
              Master decimal skills through {DECIMAL_DEFENDER_RULES.questionsPerSession} challenging questions
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Choose Your Decimal Skill
              </CardTitle>
              <CardDescription>
                Select the decimal concept you want to practice. 
                Earn {DECIMAL_DEFENDER_RULES.tokensPerCorrectAnswer} tokens per correct answer!
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <RadioGroup value={selectedSkill} onValueChange={setSelectedSkill}>
                {DECIMAL_DEFENDER_RULES.skills.map((skill) => (
                  <motion.div
                    key={skill}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedSkill(skill)}
                  >
                    <RadioGroupItem value={skill} id={skill} />
                    <Label htmlFor={skill} className="flex-1 cursor-pointer">
                      <div className="font-medium capitalize">
                        {skill.replace('_', ' & ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {skillDescriptions[skill as keyof typeof skillDescriptions]}
                      </div>
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Session Details</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {DECIMAL_DEFENDER_RULES.questionsPerSession} decimal questions</li>
                  <li>• {DECIMAL_DEFENDER_RULES.tokensPerCorrectAnswer} tokens per correct answer</li>
                  <li>• {DECIMAL_DEFENDER_RULES.bonusTokensOnPerfect} bonus tokens for perfect score</li>
                  <li>• Multiple choice format</li>
                </ul>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleStart}
                disabled={!selectedSkill}
              >
                Start Decimal Challenge
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
