import { Link } from 'wouter';
import { Home, Gamepad as GamepadIcon, Trophy, User, Menu, Users, Brain, Pencil, GraduationCap, X } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type NavigationProps = {
  active: 'home' | 'play' | 'leaderboard' | 'profile' | 'multiplayer' | 'analytics' | 'create-a-quiz' | 'practice' | 'tutor';
};

export default function Navigation({ active }: NavigationProps) {
  const [isFeatureMenuOpen, setIsFeatureMenuOpen] = useState(false);
  
  // Check if any of the advanced features is active
  const isAdvancedFeatureActive = ['multiplayer', 'analytics', 'create-a-quiz', 'tutor'].includes(active);
  
  return (
    <nav className="bg-white shadow-xl px-4 border-t border-gray-100 fixed bottom-0 left-0 right-0 z-[1000] print:hidden h-11">
      <div className="container mx-auto">
        <ul className="flex justify-around items-center h-full">
          <li className="flex flex-col items-center">
            <Link href="/modules" className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'home' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Home className={`${active === 'home' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </Link>
            <span className={`text-[8px] ${active === 'home' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Home</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/" className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'play' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <GamepadIcon className={`${active === 'play' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </Link>
            <span className={`text-[8px] ${active === 'play' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Play</span>
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
                    <Link href="/multiplayer" className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100" onClick={() => setIsFeatureMenuOpen(false)}>
                      <div className={`p-2 rounded-full ${active === 'multiplayer' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-center">Multiplayer</span>
                    </Link>
                    
                    <Link href="/analytics" className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100" onClick={() => setIsFeatureMenuOpen(false)}>
                      <div className={`p-2 rounded-full ${active === 'analytics' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                        <Brain className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-center">AI Analytics</span>
                    </Link>

                    <Link href="/practice" className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100" onClick={() => setIsFeatureMenuOpen(false)}>
                      <div className={`p-2 rounded-full ${active === 'create-a-quiz' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                        <Pencil className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-center">Create-A-Quiz</span>
                    </Link>
                    
                    <Link href="/tutor" className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100" onClick={() => setIsFeatureMenuOpen(false)}>
                      <div className={`p-2 rounded-full ${active === 'tutor' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-center">AI Tutor</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <span className={`text-[8px] ${isAdvancedFeatureActive ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>More</span>
          </li>
          
          <li className="flex flex-col items-center">
            <Link href="/leaderboard" className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'leaderboard' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Trophy className={`${active === 'leaderboard' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </Link>
            <span className={`text-[8px] ${active === 'leaderboard' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Leaderboard</span>
          </li>
          
          <li className="flex flex-col items-center">
            <Link href="/profile" className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'profile' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <User className={`${active === 'profile' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </Link>
            <span className={`text-[8px] ${active === 'profile' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Profile</span>
          </li>
        </ul>
      </div>
    </nav>
  );
}
