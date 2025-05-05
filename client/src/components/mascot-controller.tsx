import { useState, useEffect, useCallback } from 'react';
import Mascot from './mascot';
import { playSound } from '@/lib/sounds';

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
  
  // Function to check localStorage for session state changes
  const checkLocalStorage = useCallback(() => {
    // Check for streak changes
    const localStorageStreak = localStorage.getItem('currentStreak');
    if (localStorageStreak) {
      const streakValue = parseInt(localStorageStreak, 10);
      if (streakValue >= 3 && lastEventType !== 'streak') {
        triggerMascotEvent('streak');
        // Play streak sound based on streak length
        if (streakValue >= 20) {
          playSound('streak20');
        } else if (streakValue >= 10) {
          playSound('streak10');
        } else if (streakValue >= 5) {
          playSound('streak5');
        } else if (streakValue >= 3) {
          playSound('streak');
        }
      }
    }

    // Check for session completion
    const sessionCompleted = localStorage.getItem('sessionCompleted');
    if (sessionCompleted === 'true' && lastEventType !== 'session_complete') {
      triggerMascotEvent('session_complete');
    }

    // Check for correct/incorrect answers
    const lastAnswerResult = localStorage.getItem('lastAnswerResult');
    if (lastAnswerResult === 'correct' && lastEventType !== 'correct') {
      triggerMascotEvent('correct');
    } else if (lastAnswerResult === 'incorrect' && lastEventType !== 'incorrect') {
      triggerMascotEvent('incorrect');
    }
  }, [lastEventType]);

  // Set up interval to check localStorage regularly
  useEffect(() => {
    // Check immediately on mount
    checkLocalStorage();

    // Then check periodically
    const interval = setInterval(checkLocalStorage, 1000);
    return () => clearInterval(interval);
  }, [checkLocalStorage]);
  
  // React to streak changes from props
  useEffect(() => {
    if (correctStreak >= 3 && lastEventType !== 'streak') {
      triggerMascotEvent('streak');
    }
  }, [correctStreak, lastEventType]);
  
  // React to session completion from props
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
