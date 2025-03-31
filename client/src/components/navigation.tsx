import { Link } from 'wouter';
import { Home, Gamepad as GamepadIcon, Trophy, User, Menu, Book, Palette, Users, Brain, Calendar } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type NavigationProps = {
  active: 'home' | 'play' | 'leaderboard' | 'profile' | 'daily-challenge' | 'math-stories' | 'avatar' | 'multiplayer' | 'analytics';
};

export default function Navigation({ active }: NavigationProps) {
  const [isFeatureMenuOpen, setIsFeatureMenuOpen] = useState(false);
  
  // Check if any of the advanced features is active
  const isAdvancedFeatureActive = ['daily-challenge', 'math-stories', 'avatar', 'multiplayer', 'analytics'].includes(active);
  
  return (
    <nav className="bg-white shadow-xl py-1 px-4 border-t-2 border-gray-100 fixed bottom-0 left-0 right-0 z-[1000] print:hidden">
      <div className="container mx-auto">
        <ul className="flex justify-around items-center">
          <li className="flex flex-col items-center">
            <Link href="/modules" className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'home' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Home className={`${active === 'home' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </Link>
            <span className={`text-[10px] ${active === 'home' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Home</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/" className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'play' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <GamepadIcon className={`${active === 'play' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </Link>
            <span className={`text-[10px] ${active === 'play' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Play</span>
          </li>
          
          {/* Feature Menu Button */}
          <li className="flex flex-col items-center">
            <Sheet>
              <SheetTrigger asChild>
                <button className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${isAdvancedFeatureActive ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <Menu className={`${isAdvancedFeatureActive ? 'h-5 w-5' : 'h-4 w-4'}`} />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto rounded-t-3xl pt-4">
                <div className="grid grid-cols-3 gap-2 py-2">
                  <Link href="/daily-challenge" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100">
                    <div className={`p-1.5 rounded-full ${active === 'daily-challenge' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] text-center">Daily Challenge</span>
                  </Link>
                  
                  <Link href="/math-stories" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100">
                    <div className={`p-1.5 rounded-full ${active === 'math-stories' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <Book className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] text-center">Math Stories</span>
                  </Link>
                  
                  <Link href="/avatar" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100">
                    <div className={`p-1.5 rounded-full ${active === 'avatar' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <Palette className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] text-center">Avatar</span>
                  </Link>
                  
                  <Link href="/multiplayer" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100">
                    <div className={`p-1.5 rounded-full ${active === 'multiplayer' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] text-center">Multiplayer</span>
                  </Link>
                  
                  <Link href="/analytics" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100">
                    <div className={`p-1.5 rounded-full ${active === 'analytics' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <Brain className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] text-center">AI Analytics</span>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
            <span className={`text-[10px] ${isAdvancedFeatureActive ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>More</span>
          </li>
          
          <li className="flex flex-col items-center">
            <Link href="/leaderboard" className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'leaderboard' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Trophy className={`${active === 'leaderboard' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </Link>
            <span className={`text-[10px] ${active === 'leaderboard' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Leaderboard</span>
          </li>
          
          <li className="flex flex-col items-center">
            <Link href="/profile" className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'profile' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <User className={`${active === 'profile' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </Link>
            <span className={`text-[10px] ${active === 'profile' ? 'text-primary font-bold' : 'text-gray-500'} mt-0.5`}>Profile</span>
          </li>
        </ul>
      </div>
    </nav>
  );
}
