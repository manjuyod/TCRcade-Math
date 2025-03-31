import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import LeaderboardPage from "@/pages/leaderboard-page";
import AdminPage from "@/pages/admin-page";
import ModulesPage from "@/pages/modules-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import DailyChallengeComponent from "@/components/daily-challenge";
import MathStorytelling from "@/components/math-storytelling";
import AvatarCreator from "@/components/avatar-creator";
import MultiplayerMode from "@/components/multiplayer-mode";
import AiAnalytics from "@/components/ai-analytics";
import Navigation from "@/components/navigation";

// Create wrapper components for advanced features
const DailyChallengePage = () => (
  <div className="flex flex-col min-h-screen">
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Daily Challenge</h1>
      <DailyChallengeComponent />
    </div>
  </div>
);

const MathStoriesPage = () => (
  <div className="flex flex-col min-h-screen">
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Math Storytelling</h1>
      <MathStorytelling />
    </div>
  </div>
);

const AvatarPage = () => (
  <div className="flex flex-col min-h-screen">
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Avatar Creator</h1>
      <AvatarCreator />
    </div>
  </div>
);

const MultiplayerPage = () => (
  <div className="flex flex-col min-h-screen">
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Multiplayer Mode</h1>
      <MultiplayerMode />
    </div>
  </div>
);

const AnalyticsPage = () => (
  <div className="flex flex-col min-h-screen">
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">AI Analytics</h1>
      <AiAnalytics />
    </div>
  </div>
);

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/modules" component={ModulesPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/leaderboard" component={LeaderboardPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/daily-challenge" component={DailyChallengePage} />
      <ProtectedRoute path="/math-stories" component={MathStoriesPage} />
      <ProtectedRoute path="/avatar" component={AvatarPage} />
      <ProtectedRoute path="/multiplayer" component={MultiplayerPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Navigation wrapper to ensure footer navigation appears on all pages
const NavigationWrapper = ({ children }: { children: React.ReactNode }) => {
  const [location] = useLocation();
  
  // Determine active nav section based on current path
  const getActiveNav = () => {
    if (location === '/') return 'play';
    if (location === '/modules') return 'home';
    if (location === '/profile') return 'profile';
    if (location === '/leaderboard') return 'leaderboard';
    if (location.includes('/daily-challenge')) return 'daily-challenge';
    if (location.includes('/math-stories')) return 'math-stories';
    if (location.includes('/avatar')) return 'avatar';
    if (location.includes('/multiplayer')) return 'multiplayer';
    if (location.includes('/analytics')) return 'analytics';
    
    return 'home';
  };
  
  // Don't show navigation on auth page or admin page
  const shouldShowNav = !location.includes('/auth') && !location.includes('/admin');
  
  return (
    <>
      {children}
      {shouldShowNav && <Navigation active={getActiveNav() as any} />}
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationWrapper>
          <Router />
        </NavigationWrapper>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
