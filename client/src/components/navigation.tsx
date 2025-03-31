import { Link } from 'wouter';
import { Home, Gamepad as GamepadIcon, Trophy, User, Menu, Palette, Users, Brain, Calendar } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type NavigationProps = {
  active: 'home' | 'play' | 'leaderboard' | 'profile' | 'daily-challenge' | 'avatar' | 'multiplayer' | 'analytics';
};

export default function Navigation({ active }: NavigationProps) {
  const [isFeatureMenuOpen, setIsFeatureMenuOpen] = useState(false);
  
  // Check if any of the advanced features is active
  const isAdvancedFeatureActive = ['daily-challenge', 'avatar', 'multiplayer', 'analytics'].includes(active);
  
  return (
    <nav className="bg-white shadow-xl py-0 px-4 border-t border-gray-100 fixed bottom-0 left-0 right-0 z-[1000] print:hidden">
      <div className="container mx-auto">
        <ul className="flex justify-around items-end h-[32px] pb-0.5">
          <li className="flex flex-col items-center">
            <Link href="/modules" className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'home' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Home className={`${active === 'home' ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
            </Link>
            <span className={`text-[8px] ${active === 'home' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Home</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/" className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'play' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <GamepadIcon className={`${active === 'play' ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
            </Link>
            <span className={`text-[8px] ${active === 'play' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Play</span>
          </li>
          
          {/* Feature Menu Button */}
          <li className="flex flex-col items-center">
            <Sheet>
              <SheetTrigger asChild>
                <button className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${isAdvancedFeatureActive ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <Menu className={`${isAdvancedFeatureActive ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto rounded-t-3xl pt-3">
                <div className="grid grid-cols-3 gap-1 py-1">
                  <Link href="/daily-challenge" className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-gray-100">
                    <div className={`p-1 rounded-full ${active === 'daily-challenge' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <Calendar className="h-3 w-3" />
                    </div>
                    <span className="text-[8px] text-center">Daily Challenge</span>
                  </Link>
                  
                  <Link href="/avatar" className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-gray-100">
                    <div className={`p-1 rounded-full ${active === 'avatar' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <Palette className="h-3 w-3" />
                    </div>
                    <span className="text-[8px] text-center">Avatar</span>
                  </Link>
                  
                  <Link href="/multiplayer" className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-gray-100">
                    <div className={`p-1 rounded-full ${active === 'multiplayer' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <Users className="h-3 w-3" />
                    </div>
                    <span className="text-[8px] text-center">Multiplayer</span>
                  </Link>
                  
                  <Link href="/analytics" className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-gray-100">
                    <div className={`p-1 rounded-full ${active === 'analytics' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <Brain className="h-3 w-3" />
                    </div>
                    <span className="text-[8px] text-center">AI Analytics</span>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
            <span className={`text-[8px] ${isAdvancedFeatureActive ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>More</span>
          </li>
          
          <li className="flex flex-col items-center">
            <Link href="/leaderboard" className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'leaderboard' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Trophy className={`${active === 'leaderboard' ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
            </Link>
            <span className={`text-[8px] ${active === 'leaderboard' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Leaderboard</span>
          </li>
          
          <li className="flex flex-col items-center">
            <Link href="/profile" className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'profile' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <User className={`${active === 'profile' ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
            </Link>
            <span className={`text-[8px] ${active === 'profile' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Profile</span>
          </li>
        </ul>
      </div>
    </nav>
  );
}
