import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { playSound } from '@/lib/sounds';
import { AvatarItem } from '@shared/schema';
import { Loader2, Lock, Coins } from 'lucide-react';

// Avatar item display component
function AvatarItemDisplay({ 
  item, 
  isOwned, 
  isSelected,
  onSelect, 
  onPurchase 
}: { 
  item: AvatarItem; 
  isOwned: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onPurchase: () => void;
}) {
  return (
    <Card 
      className={`w-[140px] h-[180px] cursor-pointer transition-all duration-300 ${
        isSelected ? 'border-primary border-2 shadow-lg' : 'border-gray-200'
      } ${isOwned ? 'hover:border-primary' : 'opacity-80 hover:opacity-100'}`}
      onClick={isOwned ? onSelect : undefined}
    >
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm leading-tight">{item.name}</CardTitle>
        <div className="flex justify-between items-center">
          <Badge variant={getRarityVariant(item.rarity)} className="text-[10px] h-5">
            {item.rarity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 flex justify-center items-center h-20">
        <div className="relative w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="object-contain w-full h-full" />
          ) : (
            <div className="text-xl">{getItemEmoji(item.type)}</div>
          )}
          {!isOwned && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <Lock className="text-white w-5 h-5" />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-1">
        {isOwned ? (
          <Button 
            variant={isSelected ? "default" : "outline"} 
            size="sm" 
            className="w-full"
            onClick={onSelect}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full flex items-center gap-1"
            onClick={onPurchase}
          >
            <Coins className="w-3 h-3" />
            <span>{item.price}</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// Get appropriate badge variant based on rarity
function getRarityVariant(rarity: string): "default" | "secondary" | "destructive" | "outline" {
  switch(rarity?.toLowerCase()) {
    case 'common': return 'outline';
    case 'rare': return 'secondary';
    case 'epic': return 'default';
    case 'legendary': return 'destructive';
    default: return 'outline';
  }
}

// Get emoji for each avatar item type
function getItemEmoji(type: string): string {
  switch(type?.toLowerCase()) {
    case 'hair': return '💇';
    case 'face': return '😊';
    case 'outfit': return '👕';
    case 'accessory': return '🧢';
    case 'background': return '🖼️';
    default: return '✨';
  }
}

export default function AvatarCreator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('hair');
  const [currentAvatar, setCurrentAvatar] = useState<Record<string, string | number | null>>({
    hair: 'default',
    face: 'default',
    outfit: 'default',
    background: 'default',
    accessory: null,
  });
  const [isDirty, setIsDirty] = useState(false);

  // Fetch all available avatar items
  const { data: avatarItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/avatar/items'],
    queryFn: async () => {
      const res = await fetch('/api/avatar/items');
      if (!res.ok) throw new Error('Failed to fetch avatar items');
      return res.json() as Promise<AvatarItem[]>;
    }
  });

  // Fetch user's owned avatar items
  const { data: userAvatar, isLoading: isLoadingUserAvatar } = useQuery({
    queryKey: ['/api/user/avatar'],
    queryFn: async () => {
      const res = await fetch('/api/user/avatar');
      if (!res.ok) throw new Error('Failed to fetch user avatar');
      return res.json();
    }
  });

  // Save avatar changes
  const saveAvatarMutation = useMutation({
    mutationFn: async (avatarData: Record<string, string | number | null>) => {
      const res = await apiRequest('POST', '/api/user/avatar', { avatarData });
      if (!res.ok) throw new Error('Failed to save avatar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/avatar'] });
      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been saved successfully!',
        variant: 'default',
      });
      playSound('levelUp');
      setIsDirty(false);
    },
    onError: (error) => {
      toast({
        title: 'Error saving avatar',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Purchase avatar item
  const purchaseItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await apiRequest('POST', '/api/avatar/purchase', { itemId });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to purchase item');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/avatar'] });
      toast({
        title: 'Item purchased',
        description: 'The item has been added to your collection!',
        variant: 'default',
      });
      playSound('tokenEarned');
    },
    onError: (error) => {
      toast({
        title: 'Purchase failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Initialize avatar from user data
  useEffect(() => {
    if (userAvatar && !isLoadingUserAvatar) {
      // If avatar data exists and has the proper structure
      if (userAvatar.avatarItems && typeof userAvatar.avatarItems === 'object') {
        // Create a new object with the user's avatar items
        const newAvatarConfig = { ...currentAvatar };
        
        // Update each avatar type (hair, face, outfit, etc.)
        if (userAvatar.avatarItems.hair) newAvatarConfig.hair = userAvatar.avatarItems.hair;
        if (userAvatar.avatarItems.face) newAvatarConfig.face = userAvatar.avatarItems.face;
        if (userAvatar.avatarItems.outfit) newAvatarConfig.outfit = userAvatar.avatarItems.outfit;
        if (userAvatar.avatarItems.background) newAvatarConfig.background = userAvatar.avatarItems.background;
        if (userAvatar.avatarItems.accessory) newAvatarConfig.accessory = userAvatar.avatarItems.accessory;
        
        setCurrentAvatar(newAvatarConfig);
      }
    }
  }, [userAvatar, isLoadingUserAvatar]);

  // Handle selecting an avatar item
  const handleSelectItem = (item: AvatarItem) => {
    setCurrentAvatar(prev => {
      const newAvatar = { ...prev, [item.type]: item.id };
      setIsDirty(true);
      return newAvatar;
    });
  };

  // Handle purchasing an item
  const handlePurchaseItem = (item: AvatarItem) => {
    if (user && user.tokens >= item.price) {
      purchaseItemMutation.mutate(item.id);
    } else {
      toast({
        title: 'Not enough tokens',
        description: `You need ${item.price - (user?.tokens || 0)} more tokens to purchase this item.`,
        variant: 'destructive',
      });
    }
  };

  // Filter items by currently selected tab (type)
  const filterItemsByType = (items: AvatarItem[] = []) => {
    return items.filter(item => item.type.toLowerCase() === selectedTab.toLowerCase());
  };

  // Check if user owns an item
  const userOwnsItem = (item: AvatarItem) => {
    // Default items (price 0) are always owned
    if (item.price === 0) return true;
    
    // Check if item exists in userAvatar's unlocks array
    if (!userAvatar || !userAvatar.avatarItems || !userAvatar.avatarItems.unlocks) {
      return false;
    }
    
    const unlocks = userAvatar.avatarItems.unlocks;
    // Check if item ID exists in unlocks array (as number or string)
    return unlocks.includes(item.id) || unlocks.includes(item.id.toString());
  };

  // Check if item is currently selected
  const isItemSelected = (item: AvatarItem) => {
    if (!currentAvatar || typeof currentAvatar !== 'object') return false;
    
    // Convert both to string for comparison to handle both number and string types
    const selectedItemId = currentAvatar[item.type];
    return selectedItemId !== null && 
           selectedItemId !== undefined && 
           selectedItemId.toString() === item.id.toString();
  };

  // Handle save button click
  const handleSaveAvatar = () => {
    saveAvatarMutation.mutate(currentAvatar);
  };

  // Loading state
  if (isLoadingItems || isLoadingUserAvatar) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading avatar items...</p>
      </div>
    );
  }

  return (
    <div className="avatar-creator p-4">
      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        {/* Avatar preview */}
        <div className="flex flex-col items-center">
          <Card className="w-full mb-4">
            <CardHeader className="text-center">
              <CardTitle>Your Avatar</CardTitle>
              <CardDescription>Customize your appearance</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 mb-6 flex items-center justify-center relative overflow-hidden">
                {/* This is a placeholder for the actual avatar rendering */}
                {/* In a real implementation, this would be a composite of all the selected items */}
                <div className="text-5xl">🧒</div>
                {currentAvatar.accessory && (
                  <div className="absolute top-0 text-3xl">🧢</div>
                )}
              </div>
              <div className="mt-4 text-center">
                <Badge variant="outline" className="text-xs px-2 py-0 mr-1">
                  {user?.grade || 'K'} Grade
                </Badge>
                <Badge variant="outline" className="text-xs px-2 py-0">
                  <Coins className="w-3 h-3 mr-1" /> {user?.tokens || 0} Tokens
                </Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                disabled={!isDirty || saveAvatarMutation.isPending}
                onClick={handleSaveAvatar}
              >
                {saveAvatarMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Avatar
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Item selection */}
        <div>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="hair">Hair</TabsTrigger>
              <TabsTrigger value="face">Face</TabsTrigger>
              <TabsTrigger value="outfit">Outfit</TabsTrigger>
              <TabsTrigger value="accessory">Accessories</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
            </TabsList>
            
            {Object.entries({
              hair: 'Choose your hairstyle',
              face: 'Select your facial expression',
              outfit: 'Pick your clothing style',
              accessory: 'Add fun accessories',
              background: 'Set your profile background'
            }).map(([key, description]) => (
              <TabsContent key={key} value={key} className="m-0">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{description}</h3>
                  <p className="text-sm text-muted-foreground">
                    {key === 'accessory' 
                      ? 'You can equip up to 2 accessories at once' 
                      : `Collect unique ${key} styles by earning tokens`}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {avatarItems && filterItemsByType(avatarItems).map((item) => (
                    <AvatarItemDisplay
                      key={item.id}
                      item={item}
                      isOwned={userOwnsItem(item)}
                      isSelected={isItemSelected(item)}
                      onSelect={() => handleSelectItem(item)}
                      onPurchase={() => handlePurchaseItem(item)}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}