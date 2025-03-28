import { Link } from 'wouter';
import { Home, Gamepad as GamepadIcon, Trophy, User } from 'lucide-react';

type NavigationProps = {
  active: 'home' | 'play' | 'leaderboard' | 'profile';
};

export default function Navigation({ active }: NavigationProps) {
  return (
    <nav className="bg-white shadow-lg py-3 px-4 border-t-2 border-gray-100 fixed bottom-0 left-0 right-0 z-50">
      <div className="container mx-auto">
        <ul className="flex justify-around items-center">
          <li className="flex flex-col items-center">
            <Link href="/modules" className={`p-3 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'home' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Home className={`${active === 'home' ? 'h-6 w-6' : 'h-5 w-5'}`} />
            </Link>
            <span className={`text-xs ${active === 'home' ? 'text-primary font-bold' : 'text-gray-500'} mt-1`}>Home</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/" className={`p-3 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'play' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <GamepadIcon className={`${active === 'play' ? 'h-6 w-6' : 'h-5 w-5'}`} />
            </Link>
            <span className={`text-xs ${active === 'play' ? 'text-primary font-bold' : 'text-gray-500'} mt-1`}>Play</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/leaderboard" className={`p-3 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'leaderboard' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Trophy className={`${active === 'leaderboard' ? 'h-6 w-6' : 'h-5 w-5'}`} />
            </Link>
            <span className={`text-xs ${active === 'leaderboard' ? 'text-primary font-bold' : 'text-gray-500'} mt-1`}>Leaderboard</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/profile" className={`p-3 rounded-full transition-all duration-200 transform hover:scale-110 ${active === 'profile' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
              <User className={`${active === 'profile' ? 'h-6 w-6' : 'h-5 w-5'}`} />
            </Link>
            <span className={`text-xs ${active === 'profile' ? 'text-primary font-bold' : 'text-gray-500'} mt-1`}>Profile</span>
          </li>
        </ul>
      </div>
    </nav>
  );
}
