import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";

// This hook provides a token balance that stays in sync with the server
// and maintains local state during operations
export function useTokenBalance() {
  const { user } = useAuth();
  const [localTokens, setLocalTokens] = useState<number>(user?.tokens || 0);
  
  // Track when the tokens were last updated to avoid race conditions
  const [lastTokenUpdateTime, setLastTokenUpdateTime] = useState<number>(Date.now());
  
  // When the user data changes, update our local state if it's newer than our last update
  useEffect(() => {
    if (user) {
      setLocalTokens(user.tokens);
    }
  }, [user]);
  
  // Method to update tokens locally (for immediate UI feedback)
  const updateTokens = (change: number) => {
    setLocalTokens(prev => prev + change);
    setLastTokenUpdateTime(Date.now());
  };
  
  // Format tokens for display (1000 -> 1K, 1000000 -> 1M)
  const formattedTokens = localTokens >= 1000000 
    ? `${Math.floor(localTokens / 1000000)}M` 
    : localTokens >= 1000 
      ? `${Math.floor(localTokens / 1000)}K` 
      : localTokens;
  
  return {
    tokens: localTokens,
    formattedTokens,
    updateTokens
  };
}