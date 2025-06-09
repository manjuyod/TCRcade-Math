import { SessionAwareLink } from './session-aware-link'; // adjust path if needed
import { Link } from 'wouter';
import { Home, Gamepad as GamepadIcon, Trophy, User, Menu, Users, Brain, Pencil, GraduationCap, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

type NavigationProps = {
  active: 'home' | 'leaderboard' | 'profile' | 'multiplayer' | 'analytics' | 'create-a-quiz' | 'practice' | 'tutor' | 'modules';
};

export default function Navigation({ active }: NavigationProps) {
  const [isFeatureMenuOpen, setIsFeatureMenuOpen] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const { toast } = useToast();
  
  // Check for active module session
  useEffect(() => {
    const checkActiveSession = () => {
      const moduleInProgress = sessionStorage.getItem('moduleInProgress');
      setHasActiveSession(moduleInProgress === 'true');
    };
    
    checkActiveSession();
    
    // Listen for storage changes
    const handleStorageChange = () => {
      checkActiveSession();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check every second for session state changes
    const interval = setInterval(checkActiveSession, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  // Handle navigation with session check
  const handleNavigation = (href: string, e?: React.MouseEvent) => {
    if (hasActiveSession) {
      e?.preventDefault();
      toast({
        title: "Module in Progress",
        description: "Please complete your current module before navigating away.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };
  
  // Check if any of the advanced features is active
  const isAdvancedFeatureActive = ['multiplayer', 'analytics', 'create-a-quiz', 'tutor'].includes(active);
  
  return (
    <nav className="bg-white shadow-xl px-4 border-t border-gray-100 fixed bottom-0 left-0 right-0 z-[1000] print:hidden h-11">
      <div className="container mx-auto">
        <ul className="flex justify-around items-center h-full">
          <li className="flex flex-col items-center">
            <SessionAwareLink 
              href="/modules" 
              className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'home' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'} ${hasActiveSession ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Home className={`${active === 'home' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </SessionAwareLink>
            <span className={`text-[8px] ${active === 'home' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Home</span>
          </li>
          
          
          {/* Feature Menu Button */}
          <li className="flex flex-col items-center">
            {/* Custom Sheet implementation that won't shadow out the background */}
            <div className="relative">
              <button 
                onClick={() => setIsFeatureMenuOpen(!isFeatureMenuOpen)}
                className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${isAdvancedFeatureActive ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Menu className={`${isAdvancedFeatureActive ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </button>
              
              {isFeatureMenuOpen && (
                <div className="fixed inset-x-0 bottom-12 z-50 bg-white border-t border-gray-200 shadow-xl rounded-t-3xl px-4 py-4 transition-all duration-300 ease-in-out">
                  <button 
                    className="absolute right-4 top-3 text-gray-400 hover:text-gray-600" 
                    onClick={() => setIsFeatureMenuOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                  
                  <div className="flex flex-wrap justify-around py-2 mt-2">
                    <SessionAwareLink href="/multiplayer" className="flex flex-col items-center justify-center w-16">
                      <div className={`h-10 w-10 flex items-center justify-center rounded-full ${
                        active === 'multiplayer' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <span className={`text-[11px] mt-1 ${active === 'multiplayer' ? 'font-semibold text-primary' : 'text-gray-600'}`}>
                        Multiplayer
                      </span>
                    </SessionAwareLink>
                    
                    <SessionAwareLink href="/analytics" className="flex flex-col items-center justify-center w-16">
                      <div className={`h-10 w-10 flex items-center justify-center rounded-full ${
                        active === 'analytics' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        <Brain className="h-5 w-5" />
                      </div>
                      <span className={`text-[11px] mt-1 ${active === 'analytics' ? 'font-semibold text-primary' : 'text-gray-600'}`}>
                        AI Analytics
                      </span>
                    </SessionAwareLink>

                    <SessionAwareLink href="/practice" className="flex flex-col items-center justify-center w-20">
                      <div className={`h-10 w-10 flex items-center justify-center rounded-full ${
                        active === 'create-a-quiz' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        <Pencil className="h-5 w-5" />
                      </div>
                      <span className={`text-[11px] mt-1 text-center whitespace-nowrap ${active === 'create-a-quiz' ? 'font-semibold text-primary' : 'text-gray-600'}`}>
                        Create-A-Quiz
                      </span>
                    </SessionAwareLink>
                    
                    <SessionAwareLink href="/tutor" className="flex flex-col items-center justify-center w-16">
                      <div className={`h-10 w-10 flex items-center justify-center rounded-full ${
                        active === 'tutor' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <span className={`text-[11px] mt-1 ${active === 'tutor' ? 'font-semibold text-primary' : 'text-gray-600'}`}>
                        AI Tutor
                      </span>
                    </SessionAwareLink>
                  </div>
                </div>
              )}
            </div>
            <span className={`text-[8px] ${isAdvancedFeatureActive ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>More</span>
          </li>
          
          <li className="flex flex-col items-center">
            <SessionAwareLink 
              href="/leaderboard" 
              className={`p-1 rounded-full ...`}
            >
              <Trophy className={`${active === 'leaderboard' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </SessionAwareLink>
            <span className={`text-[8px] ${active === 'leaderboard' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Leaderboard</span>
          </li>
          
          <li className="flex flex-col items-center">
              <SessionAwareLink 
                href="/profile" 
                className={`p-1 rounded-full ...`}
              >
              <User className={`${active === 'profile' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </SessionAwareLink>
            <span className={`text-[8px] ${active === 'profile' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Profile</span>
          </li>
        </ul>
      </div>
    </nav>
  );
}
