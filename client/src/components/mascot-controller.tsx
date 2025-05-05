import { useState, useEffect } from 'react';
import Mascot from './mascot';

// Define messages the mascot can say based on different events
const MASCOT_MESSAGES = {
  welcome: [
    "Welcome to Math Facts!",
    "Let's practice some math today!",
    "Ready to solve some problems?"
  ],
  correct: [
    "Great job!",
    "You got it right!", 
    "Excellent work!",
    "That's correct!",
    "You're awesome at math!"
  ],
  incorrect: [
    "Oops, not quite right.",
    "Let's try another one!",
    "Keep practicing, you'll get it!",
    "Math takes practice!"
  ],
  streak: [
    "Wow! You're on a streak!",
    "You're on fire!",
    "Keep it up!"
  ],
  session_complete: [
    "Session complete!",
    "Great work today!",
    "Nice job finishing your session!"
  ],
  idle: [
    "Need any help?",
    "I'm here if you need me!",
    "Don't forget to practice daily!",
    "Math is fun!"
  ]
};

// Types for mascot events
type MascotEventType = keyof typeof MASCOT_MESSAGES;
type MascotControllerProps = {
  correctStreak?: number;
  isSessionComplete?: boolean;
};

export default function MascotController({
  correctStreak = 0,
  isSessionComplete = false
}: MascotControllerProps) {
  // State for mascot position, mood, and message
  const [position, setPosition] = useState(10);
  const [mood, setMood] = useState<'happy' | 'neutral' | 'thinking' | 'excited'>('neutral');
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [lastEventType, setLastEventType] = useState<MascotEventType | null>(null);
  
  // Moving mascot animation
  useEffect(() => {
    const moveInterval = setInterval(() => {
      // Move mascot around slightly for a more lively feel
      setPosition(prev => {
        // Move randomly between 5% and 95% of the screen width
        const newPosition = prev + (Math.random() * 10 - 5);
        return Math.min(Math.max(newPosition, 5), 95); // Keep within 5-95% range
      });
    }, 10000); // Move every 10 seconds
    
    return () => clearInterval(moveInterval);
  }, []);
  
  // Welcome message on first mount
  useEffect(() => {
    triggerMascotEvent('welcome');
    
    // Show idle messages occasionally
    const idleInterval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of showing idle message
        triggerMascotEvent('idle');
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(idleInterval);
  }, []);
  
  // React to streak changes
  useEffect(() => {
    if (correctStreak >= 3 && lastEventType !== 'streak') {
      triggerMascotEvent('streak');
    }
  }, [correctStreak, lastEventType]);
  
  // React to session completion
  useEffect(() => {
    if (isSessionComplete) {
      triggerMascotEvent('session_complete');
    }
  }, [isSessionComplete]);
  
  // Function to trigger mascot events
  const triggerMascotEvent = (eventType: MascotEventType) => {
    // Select a random message for this event type
    const messages = MASCOT_MESSAGES[eventType];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Set mood based on event type
    let newMood: 'happy' | 'neutral' | 'thinking' | 'excited' = 'neutral';
    switch(eventType) {
      case 'correct':
      case 'streak':
        newMood = 'happy';
        break;
      case 'incorrect':
        newMood = 'thinking';
        break;
      case 'session_complete':
        newMood = 'excited';
        break;
      default:
        newMood = 'neutral';
    }
    
    // Update mascot state
    setMood(newMood);
    setMessage(randomMessage);
    setLastEventType(eventType);
  };
  
  // Expose the triggerMascotEvent function globally so it can be called from anywhere
  // This is a bit of a hack, but it allows us to trigger mascot events from anywhere in the app
  useEffect(() => {
    // @ts-ignore - Add to window object
    window.triggerMascotEvent = triggerMascotEvent;
    
    return () => {
      // @ts-ignore - Clean up
      delete window.triggerMascotEvent;
    };
  }, []);
  
  return <Mascot position={position} mood={mood} message={message} />;
}
