import { Link } from 'wouter';
import { Home, Gamepad as GamepadIcon, Trophy, User } from 'lucide-react';

type NavigationProps = {
  active: 'home' | 'play' | 'leaderboard' | 'profile';
};

export default function Navigation({ active }: NavigationProps) {
  return (
    <nav className="bg-white shadow-lg py-2 px-4 border-t-2 border-gray-100">
      <div className="container mx-auto">
        <ul className="flex justify-around items-center">
          <li className="flex flex-col items-center">
            <Link href="/modules" className={`p-2 rounded-full ${active === 'home' ? 'bg-primary text-white' : 'text-gray-400'}`}>
              <Home className="h-5 w-5" />
            </Link>
            <span className={`text-xs ${active === 'home' ? 'text-primary font-semibold' : 'text-gray-400'} mt-1`}>Home</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/" className={`p-2 rounded-full ${active === 'play' ? 'bg-primary text-white' : 'text-gray-400'}`}>
              <GamepadIcon className="h-5 w-5" />
            </Link>
            <span className={`text-xs ${active === 'play' ? 'text-primary font-semibold' : 'text-gray-400'} mt-1`}>Play</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/leaderboard" className={`p-2 rounded-full ${active === 'leaderboard' ? 'bg-primary text-white' : 'text-gray-400'}`}>
              <Trophy className="h-5 w-5" />
            </Link>
            <span className={`text-xs ${active === 'leaderboard' ? 'text-primary font-semibold' : 'text-gray-400'} mt-1`}>Leaderboard</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/profile" className={`p-2 rounded-full ${active === 'profile' ? 'bg-primary text-white' : 'text-gray-400'}`}>
              <User className="h-5 w-5" />
            </Link>
            <span className={`text-xs ${active === 'profile' ? 'text-primary font-semibold' : 'text-gray-400'} mt-1`}>Profile</span>
          </li>
        </ul>
      </div>
    </nav>
  );
}
