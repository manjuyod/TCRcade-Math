import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart4, Eye, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { RATIOS_RULES, type RatiosSkill } from '@shared/ratiosRules';

export default function RatiosSetupPage() {
  const [, navigate] = useLocation();
  const [selectedSkill, setSelectedSkill] = useState<RatiosSkill | ''>('');

  const handleStart = async () => {
    if (!selectedSkill) return;
    
    // Store selected skill
    localStorage.setItem('ratiosSkill', selectedSkill);
    
    // Force generate new questions when starting
    try {
      const response = await fetch('/api/ratios/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: selectedSkill })
      });
      
      if (response.ok) {
        console.log('Questions generated successfully');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
    }
    
    // Navigate to play page
    navigate('/ratios/play');
  };

  const getSkillInfo = (skill: RatiosSkill) => {
    const skillDescriptions = {
      write_form: {
        title: 'Write Ratios in Different Forms',
        description: 'Practice writing ratios as "a to b", "a:b", and "a/b"',
        icon: <Edit3 className="h-5 w-5" />
      },
      equivalents: {
        title: 'Equivalent Ratios',
        description: 'Find missing values in equivalent ratio pairs',
        icon: <BarChart4 className="h-5 w-5" />
      },
      visual_identification: {
        title: 'Identify Ratios from Visual Elements',
        description: 'Determine ratios by counting shapes and colors',
        icon: <Eye className="h-5 w-5" />
      }
    };
    return skillDescriptions[skill];
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="mb-6">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <BarChart4 className="h-6 w-6 text-amber-600" />
                Ratios & Proportions
              </CardTitle>
              <CardDescription>
                Choose a skill to practice with {RATIOS_RULES.questionCount} targeted questions
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <RadioGroup 
                value={selectedSkill} 
                onValueChange={(value) => setSelectedSkill(value as RatiosSkill)}
                className="space-y-4"
              >
                {RATIOS_RULES.skills.map((skill) => {
                  const skillInfo = getSkillInfo(skill);
                  return (
                    <div key={skill} className="flex items-center space-x-2">
                      <RadioGroupItem value={skill} id={skill} />
                      <Label 
                        htmlFor={skill} 
                        className="flex-1 cursor-pointer p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-amber-600 mt-1">
                            {skillInfo.icon}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{skillInfo.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{skillInfo.description}</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
              
              <div className="mt-6 pt-4 border-t">
                <Button 
                  onClick={handleStart}
                  disabled={!selectedSkill}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Start Practice
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      
      <Navigation active="home" />
    </div>
  );
}