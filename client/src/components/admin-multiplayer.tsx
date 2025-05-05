import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RotateCcw, Trash, AlertCircle, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

type MultiplayerRoom = {
  id: number;
  name: string;
  hostId: number;
  isActive: boolean;
  createdAt: string;
  roomCode: string;
  grade?: string;
  status: string;
  participants: number[];
  players?: { id: number; username: string }[];
};

export default function AdminMultiplayer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Redirect if not admin
  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl">
        <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-500">You don't have permission to manage multiplayer rooms.</p>
      </div>
    );
  }

  // Fetch all active multiplayer rooms
  const { data: rooms, isLoading, refetch } = useQuery<MultiplayerRoom[]>({
    queryKey: ['/api/multiplayer/rooms'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Clear expired rooms mutation
  const clearExpiredMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/multiplayer/clear-expired');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Expired rooms cleared',
        description: `Successfully cleared ${data.roomsCleared} expired multiplayer rooms`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to clear expired rooms',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Clear all rooms mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/multiplayer/clear-all');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'All rooms cleared',
        description: `Successfully cleared ${data.roomsCleared} active multiplayer rooms`,
      });
      refetch();
      setConfirmClearAll(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to clear all rooms',
        description: error.message,
        variant: 'destructive',
      });
      setConfirmClearAll(false);
    },
  });

  const handleClearExpired = () => {
    clearExpiredMutation.mutate();
  };

  const handleClearAll = () => {
    clearAllMutation.mutate();
  };

  // Calculate stats
  const totalRooms = rooms?.length || 0;
  const activeGames = rooms?.filter(room => room.status === 'playing').length || 0;
  const waitingRooms = rooms?.filter(room => room.status === 'waiting').length || 0;
  
  return (
    <div className="w-full space-y-6">
      {/* Header with stats and actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Multiplayer Rooms</h2>
          <p className="text-gray-500">Manage active multiplayer game sessions</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleClearExpired}
            disabled={clearExpiredMutation.isPending}
          >
            {clearExpiredMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            Clear Expired
          </Button>
          
          <Dialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={clearAllMutation.isPending}
              >
                {clearAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash className="h-4 w-4 mr-2" />
                )}
                Clear All Rooms
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear All Active Rooms</DialogTitle>
                <DialogDescription>
                  This will end all active multiplayer games. All players will be removed from their rooms.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmClearAll(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleClearAll}>Yes, Clear All</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() => refetch()}
            className="ml-2"
            size="icon"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{totalRooms}</CardTitle>
            <CardDescription>Total Active Rooms</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-green-600">{activeGames}</CardTitle>
            <CardDescription>Games In Progress</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-blue-600">{waitingRooms}</CardTitle>
            <CardDescription>Waiting for Players</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Rooms list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {rooms && rooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <Card key={room.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg truncate">{room.name}</CardTitle>
                      <Badge className={room.status === 'playing' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {room.status === 'playing' ? 'In Progress' : 'Waiting'}
                      </Badge>
                    </div>
                    <CardDescription>Code: {room.roomCode}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Grade:</span>
                        <span>{room.grade || 'Any'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Players:</span>
                        <span>{room.participants?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created:</span>
                        <span>{formatRelativeTime(new Date(room.createdAt))}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">No active multiplayer rooms found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
