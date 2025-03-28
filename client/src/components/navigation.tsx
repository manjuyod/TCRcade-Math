import { Link } from 'wouter';

type NavigationProps = {
  active: 'play' | 'leaderboard' | 'profile';
};

export default function Navigation({ active }: NavigationProps) {
  return (
    <nav className="bg-white shadow-lg py-2 px-4 border-t-2 border-gray-100">
      <div className="container mx-auto">
        <ul className="flex justify-around items-center">
          <li className="flex flex-col items-center">
            <Link href="/">
              <a className={`p-2 rounded-full ${active === 'play' ? 'bg-primary text-white' : 'text-gray-400'}`}>
                <i className="ri-gamepad-line text-xl"></i>
              </a>
            </Link>
            <span className={`text-xs ${active === 'play' ? 'text-primary font-semibold' : 'text-gray-400'} mt-1`}>Play</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/leaderboard">
              <a className={`p-2 rounded-full ${active === 'leaderboard' ? 'bg-primary text-white' : 'text-gray-400'}`}>
                <i className="ri-trophy-line text-xl"></i>
              </a>
            </Link>
            <span className={`text-xs ${active === 'leaderboard' ? 'text-primary font-semibold' : 'text-gray-400'} mt-1`}>Leaderboard</span>
          </li>
          <li className="flex flex-col items-center">
            <Link href="/profile">
              <a className={`p-2 rounded-full ${active === 'profile' ? 'bg-primary text-white' : 'text-gray-400'}`}>
                <i className="ri-user-line text-xl"></i>
              </a>
            </Link>
            <span className={`text-xs ${active === 'profile' ? 'text-primary font-semibold' : 'text-gray-400'} mt-1`}>Profile</span>
          </li>
        </ul>
      </div>
    </nav>
  );
}
