import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight, Calculator, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { FRACTIONS_PUZZLE_RULES } from '@shared/fractionsPuzzleRules';

export default function FractionsSetupPage() {
  const [, navigate] = useLocation();
  const [selectedSkill, setSelectedSkill] = useState<string>('');

  const handleStart = () => {
    if (!selectedSkill) return;
    
    // Store selected skill
    localStorage.setItem('fractionsSkill', selectedSkill);
    
    // Navigate to play page
    navigate('/fractions/play');
  };

  const getSkillInfo = (skill: string) => {
    const skillDescriptions = {
      define: {
        title: 'Define Fractions',
        description: 'Identify fractions from visual fraction bars',
        icon: <Puzzle className="h-5 w-5" />
      },
      gcdSimplify: {
        title: 'GCD & Simplify',
        description: 'Find the GCD first, then simplify fractions',
        icon: <Calculator className="h-5 w-5" />
      },
      simplify: {
        title: 'Simplify Fractions',
        description: 'Reduce fractions to their lowest terms',
        icon: <Calculator className="h-5 w-5" />
      },
      equivalent: {
        title: 'Equivalent Fractions',
        description: 'Find and identify equivalent fractions',
        icon: <Puzzle className="h-5 w-5" />
      },
      addSub: {
        title: 'Add & Subtract',
        description: 'Add and subtract fractions with different denominators',
        icon: <Calculator className="h-5 w-5" />
      },
      mulDiv: {
        title: 'Multiply & Divide',
        description: 'Multiply and divide fractions',
        icon: <Calculator className="h-5 w-5" />
      },
      mixedImproper: {
        title: 'Mixed & Improper',
        description: 'Convert between mixed numbers and improper fractions',
        icon: <Puzzle className="h-5 w-5" />
      }
    };
    
    return skillDescriptions[skill as keyof typeof skillDescriptions] || {
      title: skill,
      description: 'Practice this fraction skill',
      icon: <Calculator className="h-5 w-5" />
    };
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <Navigation active="home" />
      
      <main className="flex-1 container max-w-4xl py-6 px-4">
        <div className="mb-6 flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => navigate('/modules')}
          >
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Modules
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
            <CardHeader className="text-center pb-8 pt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <Puzzle className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl font-bold mb-2">
                Fractions Puzzle
              </CardTitle>
              <CardDescription className="text-blue-100 text-lg font-medium">
                Master fraction skills through adaptive learning
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-blue-600 mb-1">20</div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-purple-600 mb-1">5</div>
                  <div className="text-sm text-muted-foreground">Difficulty Levels</div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-green-600 mb-1">32</div>
                  <div className="text-sm text-muted-foreground">Max Tokens</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-8">
                <p className="text-sm text-center text-yellow-800 dark:text-yellow-200">
                  <strong>Token System:</strong> Earn 3 tokens per 5 correct answers, plus 20 bonus tokens for a perfect score!
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-xl text-center text-gray-800 dark:text-gray-200">
                  Choose Your Challenge
                </h3>
                
                <RadioGroup value={selectedSkill} onValueChange={setSelectedSkill}>
                  <div className="grid gap-4">
                    {FRACTIONS_PUZZLE_RULES.skills.map((skill, index) => {
                      const skillInfo = getSkillInfo(skill);
                      const isSelected = selectedSkill === skill;
                      return (
                        <motion.div 
                          key={skill}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative"
                        >
                          <RadioGroupItem value={skill} id={skill} className="sr-only" />
                          <Label 
                            htmlFor={skill} 
                            className="cursor-pointer block"
                          >
                            <Card className={`p-5 transition-all duration-300 hover:shadow-lg border-2 ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg' 
                                : 'border-gray-200 hover:border-blue-300 bg-white dark:bg-gray-800'
                            }`}>
                              <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-full ${
                                  isSelected 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}>
                                  {skillInfo.icon}
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                    {skillInfo.title}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {skillInfo.description}
                                  </div>
                                </div>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                                  >
                                    <ArrowRight className="h-3 w-3 text-white" />
                                  </motion.div>
                                )}
                              </div>
                            </Card>
                          </Label>
                        </motion.div>
                      );
                    })}
                  </div>
                </RadioGroup>
              </div>

              <div className="mt-10 flex justify-center">
                <Button
                  onClick={handleStart}
                  disabled={!selectedSkill}
                  size="lg"
                  className="px-12 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {selectedSkill ? 'Begin Challenge' : 'Select a Skill First'}
                  {selectedSkill && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}