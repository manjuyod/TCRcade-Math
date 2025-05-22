import { useTokenSocket } from '@/hooks/use-token-socket';

/**
 * Component that initializes the real-time token socket connection
 * This component doesn't render anything, it just establishes the socket connection
 */
export function TokenSocketProvider({ children }: { children: React.ReactNode }) {
  // Initialize the token socket connection
  useTokenSocket();
  
  // Simply render the children without any additional UI
  return <>{children}</>;
}