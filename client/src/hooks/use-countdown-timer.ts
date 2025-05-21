import { useState, useEffect, useCallback } from 'react';

export function useCountdownTimer(initialSeconds: number = 60) {
  const [timeRemaining, setTimeRemaining] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

  // Start timer function
  const startTimer = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          // Stop timer when it reaches 0
          if (prev <= 1) {
            clearInterval(timer);
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setTimerId(timer);
    }
  }, [isRunning]);

  // Stop timer function
  const stopTimer = useCallback(() => {
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }
    setIsRunning(false);
  }, [timerId]);

  // Reset timer function
  const resetTimer = useCallback((newTime?: number) => {
    stopTimer();
    setTimeRemaining(newTime !== undefined ? newTime : initialSeconds);
  }, [initialSeconds, stopTimer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [timerId]);

  return {
    timeRemaining,
    isRunning,
    startTimer,
    stopTimer,
    resetTimer
  };
}