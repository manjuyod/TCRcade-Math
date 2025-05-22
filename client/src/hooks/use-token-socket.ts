import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';

/**
 * Custom hook for real-time token updates via Socket.IO
 */
export function useTokenSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
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
    socket.on('token_updated', (newTokenBalance: number) => {
      console.log(`Received real-time token update: ${newTokenBalance} tokens`);
      
      // Update the user query cache with new token balance
      queryClient.setQueryData(['/api/user'], (oldUser: any) => {
        if (oldUser) {
          return { ...oldUser, tokens: newTokenBalance };
        }
        return oldUser;
      });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from token updates namespace');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Cleanup on unmount or user change
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user?.id]);

  return socketRef.current;
}