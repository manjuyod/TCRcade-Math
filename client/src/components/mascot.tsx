import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '@/lib/sounds';

type MascotProps = {
  position?: number; // 0-100 representing position along bottom of screen
  mood?: 'happy' | 'neutral' | 'thinking' | 'excited';
  message?: string; // Optional message to display in speech bubble
  size?: 'small' | 'medium' | 'large';
};

export default function Mascot({ 
  position = 20, 
  mood = 'neutral', 
  message,
  size = 'medium'
}: MascotProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showMessage, setShowMessage] = useState(!!message);
  
  // Auto-hide message after a few seconds
  useEffect(() => {
    if (message) {
      // Show the message
      setShowMessage(true);
      
      // Play appropriate sound based on mood
      if (mood === 'happy' || mood === 'excited') {
        playSound('correct');
      } else if (mood === 'thinking') {
        playSound('incorrect');
      } else {
        // Neutral mood - just a subtle notification sound
        playSound('tokenEarned');
      }
      
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [message, mood]);
  
  // Define size in pixels based on size prop
  const sizeMap = {
    small: { width: 40, height: 40 },
    medium: { width: 60, height: 60 },
    large: { width: 80, height: 80 }
  };
  
  const { width, height } = sizeMap[size];
  
  // Get the appropriate face based on mood
  const getFace = () => {
    switch (mood) {
      case 'happy':
        return '😄';
      case 'thinking':
        return '🤔';
      case 'excited':
        return '🎉';
      case 'neutral':
      default:
        return '😊';
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{ left: `${position}%`, bottom: '70px', transform: 'translateX(-50%)' }}
        >
          {/* Speech bubble for messages */}
          <AnimatePresence>
            {showMessage && message && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl p-3 mb-2 shadow-md relative pointer-events-auto"
                style={{ 
                  maxWidth: '200px',
                  minWidth: '120px',
                  transform: 'translateX(-30%)'
                }}
              >
                <div className="text-sm font-medium">{message}</div>
                {/* Speech bubble pointer */}
                <div 
                  className="absolute w-4 h-4 bg-white rotate-45" 
                  style={{ bottom: '-5px', left: '40%' }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Mascot character */}
          <motion.div
            initial={{ y: height }}
            animate={{ y: 0 }}
            transition={{ 
              type: 'spring',
              bounce: 0.5,
            }}
            whileHover={{ y: -5 }}
            className="select-none cursor-pointer pointer-events-auto"
            onClick={() => {
              playSound('tokenEarned');
              setShowMessage(prev => !prev);
            }}
            style={{ width, height }}
          >
            {/* Simple emoji mascot - can be replaced with an image */}
            <div 
              className="bg-primary text-white rounded-full flex items-center justify-center shadow-lg"
              style={{ width, height, fontSize: width * 0.7 }}
            >
              {getFace()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
