import { useState, useEffect } from 'react';

// Key for storing time data in localStorage
const TIME_STORAGE_KEY = 'math_app_time_tracking';
const DAILY_GOAL_MINUTES = 20;

// Interface for time tracking data
interface TimeTrackingData {
  todayMinutes: number;
  lastUpdate: string; // ISO string date
  dailyGoal: number;
}

// Default initial data
const defaultTimeData: TimeTrackingData = {
  todayMinutes: 0,
  lastUpdate: new Date().toISOString(),
  dailyGoal: DAILY_GOAL_MINUTES
};

/**
 * Hook to track session time across the application
 * Returns current minutes played, progress percentage, and daily goal
 */
export function useSessionTimer() {
  const [timeData, setTimeData] = useState<TimeTrackingData>(defaultTimeData);
  
  // Initialize time tracking data from localStorage
  useEffect(() => {
    const loadTimeData = () => {
      try {
        const storedData = localStorage.getItem(TIME_STORAGE_KEY);
        if (storedData) {
          const parsedData = JSON.parse(storedData) as TimeTrackingData;
          
          // Check if we need to reset (new day)
          const lastUpdateDate = new Date(parsedData.lastUpdate);
          const today = new Date();
          const isNewDay = 
            lastUpdateDate.getDate() !== today.getDate() ||
            lastUpdateDate.getMonth() !== today.getMonth() ||
            lastUpdateDate.getFullYear() !== today.getFullYear();
          
          if (isNewDay) {
            // It's a new day, reset the counter
            setTimeData({
              ...defaultTimeData,
              lastUpdate: today.toISOString()
            });
          } else {
            setTimeData(parsedData);
          }
        } else {
          // No stored data, use defaults
          setTimeData(defaultTimeData);
        }
      } catch (error) {
        console.error('Error loading time data:', error);
        setTimeData(defaultTimeData);
      }
    };
    
    loadTimeData();
  }, []);
  
  // Start a timer to update time spent
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    // Only track time when the user is active on the page
    const startTracking = () => {
      if (interval) return; // Already tracking
      
      interval = setInterval(() => {
        setTimeData(prevData => {
          // Add 1/6 of a minute (10 seconds) to the counter
          const newMinutes = prevData.todayMinutes + (1/6);
          const newData = {
            ...prevData,
            todayMinutes: newMinutes,
            lastUpdate: new Date().toISOString()
          };
          
          // Save to localStorage
          localStorage.setItem(TIME_STORAGE_KEY, JSON.stringify(newData));
          
          return newData;
        });
      }, 10000); // Update every 10 seconds
    };
    
    const stopTracking = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    
    // Track visibility changes to pause/resume timer
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTracking();
      } else {
        startTracking();
      }
    };
    
    // Start tracking on mount
    startTracking();
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      stopTracking();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Calculate progress percentage
  const progressPercentage = Math.min(100, (timeData.todayMinutes / timeData.dailyGoal) * 100);
  
  return {
    minutesPlayed: timeData.todayMinutes,
    displayMinutes: Math.floor(timeData.todayMinutes),
    progressPercentage,
    dailyGoal: timeData.dailyGoal
  };
}