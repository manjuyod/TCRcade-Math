import { useAuth } from '@/hooks/use-auth';
import { useTokenBalance } from '@/hooks/use-token-balance';
import { StreakBadge } from './streak-badge';
import { Link } from 'wouter';
import { Coins } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// Create interactive smiley face component that tracks cursor movement
function TrackingSmile() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const smileRef = useRef<HTMLDivElement>(null);
  const [eyePosition, setEyePosition] = useState({ leftX: 0, leftY: 0, rightX: 0, rightY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Track mouse position globally for eye movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (smileRef.current) {
        const rect = smileRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate direction from smiley to mouse
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        
        // Normalize movement to limit eye movement range
        const maxMovement = 3; // max pixels eyes can move
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        const distance = Math.sqrt(distanceSquared);
        
        // Calculate normalized movement vectors
        const normalizedX = distance > 0 ? (deltaX / distance) * Math.min(distance, maxMovement) : 0;
        const normalizedY = distance > 0 ? (deltaY / distance) * Math.min(distance, maxMovement) : 0;
        
        // Update eye positions
        setEyePosition({
          leftX: normalizedX,
          leftY: normalizedY,
          rightX: normalizedX,
          rightY: normalizedY
        });
        
        // Set mouse position for smile curvature
        setMousePosition({
          x: e.clientX,
          y: e.clientY
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Calculate smile curvature based on cursor proximity
  const getSmilePath = () => {
    // Default smile is slightly curved upward
    const baseSmile = "M 10,20 Q 20,27 30,20";
    
    if (!smileRef.current) return baseSmile;
    
    const rect = smileRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate distance from smiley center to mouse
    const deltaX = mousePosition.x - centerX;
    const deltaY = mousePosition.y - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Smile gets bigger when mouse is closer or when hovered
    const proximity = isHovered ? 1 : Math.max(0, 1 - distance / 300);
    const smileHeight = 27 + (proximity * 5); // 27 is default, max height is 32
    
    return `M 10,20 Q 20,${smileHeight} 30,20`;
  };

  return (
    <Link href="/modules">
      <div 
        ref={smileRef}
        className="w-10 h-10 bg-orange-500 rounded-full flex justify-center items-center cursor-pointer relative transition-all duration-200 hover:scale-110"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Home"
      >
        {/* Left eye */}
        <div className="absolute bg-white w-2.5 h-2.5 rounded-full" style={{ 
          top: '10px', 
          left: '11px',
          transform: `translate(${eyePosition.leftX}px, ${eyePosition.leftY}px)`
        }}>
          <div className="absolute bg-black w-1.5 h-1.5 rounded-full" style={{ 
            top: '0.5px', 
            left: '0.5px',
            transform: `translate(${eyePosition.leftX * 0.5}px, ${eyePosition.leftY * 0.5}px)`
          }}></div>
        </div>
        
        {/* Right eye */}
        <div className="absolute bg-white w-2.5 h-2.5 rounded-full" style={{ 
          top: '10px', 
          right: '11px',
          transform: `translate(${eyePosition.rightX}px, ${eyePosition.rightY}px)`
        }}>
          <div className="absolute bg-black w-1.5 h-1.5 rounded-full" style={{ 
            top: '0.5px', 
            left: '0.5px',
            transform: `translate(${eyePosition.rightX * 0.5}px, ${eyePosition.rightY * 0.5}px)`
          }}></div>
        </div>
        
        {/* Smile */}
        <svg width="40" height="40" viewBox="0 0 40 40" className="absolute top-0 left-0">
          <path 
            d={getSmilePath()} 
            stroke="white" 
            strokeWidth="2.5" 
            fill="none" 
            strokeLinecap="round"
          />
        </svg>
      </div>
    </Link>
  );
}

export default function Header() {
  const { user } = useAuth();
  const { formattedTokens } = useTokenBalance();
  
  if (!user) return null;
  
  return (
    <header className="bg-white shadow-sm py-1.5 px-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <TrackingSmile />
          <span className="text-base font-bold text-primary hidden sm:block">tcRCADE</span>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center mr-3">
            <div className="flex items-center bg-amber-100 rounded-full px-2 py-1">
              <Coins className="h-4 w-4 text-amber-700 mr-1" />
              <span className="text-sm font-bold text-amber-700" data-testid="token-display">
                {formattedTokens}
              </span>
            </div>
          </div>
          
          <StreakBadge streakDays={user.streakDays} size="sm" />
        </div>
      </div>
    </header>
  );
}
