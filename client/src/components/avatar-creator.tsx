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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, 
         AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
         AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Lock, Coins, Shuffle, Save } from 'lucide-react';

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

// Avatar parts interfaces
type AvatarCategory = 'hair' | 'face' | 'outfit' | 'accessory' | 'background';

type AvatarPreviewProps = {
  currentAvatar: Record<string, string | number | null>;
  avatarItems: AvatarItem[] | undefined;
  isPreview?: boolean;
};

// Avatar preview component 
function AvatarPreview({ currentAvatar, avatarItems, isPreview = false }: AvatarPreviewProps) {
  // Get the item details for each selected part
  const getItemByTypeAndId = (type: string, id: string | number | null) => {
    if (!avatarItems || !id) return null;
    return avatarItems.find(item => 
      item.type.toLowerCase() === type.toLowerCase() && 
      item.id.toString() === id.toString()
    );
  };

  // Map emoji or image for each avatar part
  const renderPart = (type: string, id: string | number | null) => {
    const item = getItemByTypeAndId(type, id);
    if (!item) return null;

    // Style varies by part type to ensure proper layering
    let className = "absolute";
    
    switch(type) {
      case 'background':
        className += " inset-0 z-0";
        break;
      case 'outfit':
        className += " inset-0 z-10 flex items-center justify-center";
        break;
      case 'hair':
        className += " inset-0 z-30 flex items-center justify-center";
        break;
      case 'face':
        className += " inset-0 z-20 flex items-center justify-center";
        break;
      case 'accessory':
        className += " inset-0 z-40 flex items-center justify-center";
        break;
    }

    return (
      <div key={`${type}-${id}`} className={className}>
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.name} 
            className={`object-contain ${type === 'background' ? 'w-full h-full' : 'w-2/3 h-2/3'}`} 
          />
        ) : (
          <div className={`text-${type === 'background' ? '4xl' : '5xl'}`}>
            {getItemEmoji(type)}
          </div>
        )}
      </div>
    );
  };

  // Size class based on whether this is the main preview or a thumbnail
  const sizeClass = isPreview 
    ? "w-20 h-20"
    : "w-52 h-52 md:w-64 md:h-64";

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden`}>
      {/* Render each part in layer order */}
      {renderPart('background', currentAvatar.background)}
      {renderPart('outfit', currentAvatar.outfit)}
      {renderPart('face', currentAvatar.face)}
      {renderPart('hair', currentAvatar.hair)}
      {renderPart('accessory', currentAvatar.accessory)}
    </div>
  );
}

export default function AvatarCreator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<AvatarCategory>('hair');
  const [currentAvatar, setCurrentAvatar] = useState<Record<string, string | number | null>>({
    hair: 'default',
    face: 'default',
    outfit: 'default',
    background: 'default',
    accessory: null,
  });
  const [previewAvatar, setPreviewAvatar] = useState<Record<string, string | number | null>>({
    hair: 'default',
    face: 'default',
    outfit: 'default',
    background: 'default',
    accessory: null,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [confirmPurchase, setConfirmPurchase] = useState<AvatarItem | null>(null);
  
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
      // Update the current avatar with our preview changes
      setCurrentAvatar({...previewAvatar});
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
      
      // Auto-select the purchased item
      if (confirmPurchase) {
        handleSelectItem(confirmPurchase);
      }
      setConfirmPurchase(null);
    },
    onError: (error) => {
      toast({
        title: 'Purchase failed',
        description: error.message,
        variant: 'destructive',
      });
      setConfirmPurchase(null);
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
        setPreviewAvatar(newAvatarConfig);
      }
    }
  }, [userAvatar, isLoadingUserAvatar]);

  // Handle selecting an avatar item for preview
  const handleSelectItem = (item: AvatarItem) => {
    setPreviewAvatar(prev => {
      const newAvatar = { ...prev, [item.type]: item.id };
      setIsDirty(true);
      return newAvatar;
    });
  };

  // Handle purchasing an item
  const handlePurchaseItem = (item: AvatarItem) => {
    if (!user) return;
    
    if (user.tokens >= item.price) {
      setConfirmPurchase(item);
    } else {
      toast({
        title: 'Not enough tokens',
        description: `You need ${item.price - (user?.tokens || 0)} more tokens to purchase this item.`,
        variant: 'destructive',
      });
    }
  };

  // Execute purchase when confirmed
  const confirmPurchaseItem = () => {
    if (confirmPurchase) {
      purchaseItemMutation.mutate(confirmPurchase.id);
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

  // Check if item is currently selected in the preview
  const isItemSelected = (item: AvatarItem) => {
    if (!previewAvatar || typeof previewAvatar !== 'object') return false;
    
    // Convert both to string for comparison to handle both number and string types
    const selectedItemId = previewAvatar[item.type];
    return selectedItemId !== null && 
           selectedItemId !== undefined && 
           selectedItemId.toString() === item.id.toString();
  };

  // Handle save button click
  const handleSaveAvatar = () => {
    saveAvatarMutation.mutate(previewAvatar);
  };

  // Handle randomize button click
  const handleRandomizeAvatar = () => {
    if (!avatarItems) return;
    
    // Prepare a new randomized avatar
    const newRandomAvatar = { ...previewAvatar };
    
    // For each category, randomly select from owned items
    ['hair', 'face', 'outfit', 'background', 'accessory'].forEach(category => {
      // Filter owned items of this category
      const ownedItemsOfType = avatarItems.filter(
        item => item.type === category && userOwnsItem(item)
      );
      
      if (ownedItemsOfType.length > 0) {
        // Pick a random owned item
        const randomIndex = Math.floor(Math.random() * ownedItemsOfType.length);
        newRandomAvatar[category] = ownedItemsOfType[randomIndex].id;
      }
    });
    
    setPreviewAvatar(newRandomAvatar);
    setIsDirty(true);
    
    toast({
      title: 'Avatar randomized',
      description: 'Your avatar has been randomly customized. Click Save to keep these changes.',
      variant: 'default',
    });
  };

  // Reset preview to current avatar
  const handleResetPreview = () => {
    setPreviewAvatar({...currentAvatar});
    setIsDirty(false);
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
      {/* Purchase confirmation dialog */}
      <AlertDialog open={!!confirmPurchase} onOpenChange={(open) => !open && setConfirmPurchase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to spend {confirmPurchase?.price} tokens to unlock "{confirmPurchase?.name}"?
              {user && (
                <p className="mt-2 font-semibold">You have {user.tokens} tokens available.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPurchaseItem}
              disabled={purchaseItemMutation.isPending}
            >
              {purchaseItemMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Purchase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="grid grid-cols-1 gap-8">
        {/* Avatar preview - Center in screen */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">Avatar Creator</h2>
            <p className="text-sm text-muted-foreground">Customize your character</p>
          </div>
          
          <AvatarPreview 
            currentAvatar={previewAvatar} 
            avatarItems={avatarItems} 
          />
          
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {user?.grade || 'K'} Grade
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1 flex items-center">
              <Coins className="w-3 h-3 mr-1" /> {user?.tokens || 0} Tokens
            </Badge>
          </div>
          
          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomizeAvatar}
              disabled={isLoadingItems}
            >
              <Shuffle className="h-4 w-4 mr-1" />
              Randomize
            </Button>
            
            <Button
              variant="outline"
              size="sm" 
              onClick={handleResetPreview}
              disabled={!isDirty}
            >
              Cancel
            </Button>
            
            <Button 
              size="sm"
              disabled={!isDirty || saveAvatarMutation.isPending}
              onClick={handleSaveAvatar}
            >
              {saveAvatarMutation.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-1" />
              Save Avatar
            </Button>
          </div>
        </div>
        
        {/* Item selection tabs */}
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle>Customize Your Avatar</CardTitle>
            <CardDescription>Select a category and choose items to add to your avatar</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as AvatarCategory)}>
              <TabsList className="mb-4 grid grid-cols-5 w-full">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}