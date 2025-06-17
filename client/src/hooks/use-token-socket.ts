import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';

/**
 * Custom hook for real-time token updates via Socket.IO
 */
export function useTokenSocket() {
  // Use try-catch to handle cases where auth context might not be ready
  let user = null;
  try {
    const auth = useAuth();
    user = auth?.user;
  } catch (error) {
    console.log('Auth context not ready, skipping token socket initialization');
    return null;
  }
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Don't proceed if user is not authenticated
    if (!user) {
      // Disconnect if user is not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Create Socket.IO connection to tokens namespace
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/tokens`;
    
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
    });

    socketRef.current = socket;

    // Join user-specific room for token updates
    socket.on('connect', () => {
      console.log('Connected to token updates namespace');
      socket.emit('join', `user_${user.id}`);
    });

    // Listen for real-time token updates
    const handleTokenUpdate = (newTokenBalance: number) => {
      console.log(`Received real-time token update: ${newTokenBalance} tokens`);
      
      // Update the user query cache with new token balance
      queryClient.setQueryData(['/api/user'], (oldUser: any) => {
        if (oldUser) {
          return { ...oldUser, tokens: newTokenBalance };
        }
        return oldUser;
      });
    };

    socket.on('token_updated', handleTokenUpdate);
    
    // Force refetch when a real-time update comes in
    queryClient.invalidateQueries({
      queryKey: ['/api/user'],
      exact: true,
    });
    // Reconcile token balance every 30 seconds
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ['/api/user'],
        exact: true,
      });
    }, 30_000);

    socket.on('disconnect', () => {
      console.log('Disconnected from token updates namespace');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Cleanup on unmount or user change
    return () => {
      if (socket) {
        socket.off('token_updated', handleTokenUpdate);
        socket.disconnect();
      }
      clearInterval(intervalId);
    };
  }, [user?.id]);

  return socketRef.current;
}