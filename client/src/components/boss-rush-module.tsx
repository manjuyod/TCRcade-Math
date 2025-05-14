/**
 * Boss Rush Module
 * 
 * This module provides a launcher for the Boss Rush game with instructions
 * and a start button. It's designed to be integrated into the main application.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skull, Trophy, Shield, Timer, Brain, Zap } from 'lucide-react';
import BossRushGame from './boss-rush-game';
import { useAuth } from '@/hooks/use-auth';

export default function BossRushModule() {
  // State to track if the game is active
  const [isPlaying, setIsPlaying] = useState(false);
  const { user } = useAuth();
  
  // Return to menu
  const handleExitGame = () => {
    setIsPlaying(false);
  };
  
  // Start the game
  const handleStartGame = () => {
    setIsPlaying(true);
  };
  
  // If the game is active, render the game component
  if (isPlaying) {
    return <BossRushGame onExit={handleExitGame} userName={user?.username} />;
  }
  
  // Otherwise, render the menu/launcher
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <Skull className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl">Boss Rush Challenge</CardTitle>
          </div>
          <CardDescription>
            Test your math skills against increasingly difficult bosses!
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm">
              In Boss Rush mode, you'll face a series of boss enemies with increasing health.
              Answer math questions correctly to deal damage based on how quickly you respond!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-2">
                <Timer className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Beat the Clock</h4>
                  <p className="text-sm text-muted-foreground">
                    You have 10 seconds per question. The faster you answer correctly, 
                    the more damage you deal!
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Stay Alert</h4>
                  <p className="text-sm text-muted-foreground">
                    Every two questions, the boss moves one step closer. 
                    After 10 steps, it's game over!
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Level Up</h4>
                  <p className="text-sm text-muted-foreground">
                    Defeat the boss to advance to the next level. Each level's boss has 
                    twice as much HP as the previous one!
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Brain className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Mix of Operations</h4>
                  <p className="text-sm text-muted-foreground">
                    Face random questions from all four operations: addition, subtraction, 
                    multiplication, and division.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            onClick={handleStartGame} 
            className="w-full"
            size="lg"
          >
            <Zap className="mr-2 h-4 w-4" />
            Start Boss Rush
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}