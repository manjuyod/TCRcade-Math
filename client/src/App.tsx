import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import ProfilePage from "@/pages/profile-page";
import LeaderboardPage from "@/pages/leaderboard-page";
import AdminPage from "@/pages/admin-page";
import ModulesPage from "@/pages/modules-page";
import AiTutorPage from "@/pages/ai-tutor-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import MultiplayerMode from "@/components/multiplayer-mode";
import AiAnalytics from "@/components/ai-analytics";
import CreateAQuiz from "@/components/create-a-quiz";
import Navigation from "@/components/navigation";
import ScrollToTop from "@/components/scroll-to-top";
import MascotController from "@/components/mascot-controller";


// Avatar functionality has been removed

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

const CreateQuizPage = () => (
  <div className="flex flex-col min-h-screen">
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create-A-Quiz</h1>
      <CreateAQuiz />
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
      <ProtectedRoute path="/multiplayer" component={MultiplayerPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/practice" component={CreateQuizPage} />
      <ProtectedRoute path="/tutor" component={AiTutorPage} />
      <ProtectedRoute path="/ai-tutor" component={AiTutorPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/reset/:token" component={ResetPasswordPage} />
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
    if (location.includes('/multiplayer')) return 'multiplayer';
    if (location.includes('/analytics')) return 'analytics';
    if (location.includes('/practice')) return 'create-a-quiz';
    if (location.includes('/tutor')) return 'tutor';
    
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
        <ScrollToTop />
        <NavigationWrapper>
          <Router />
        </NavigationWrapper>
        {/* Our friendly mascot character with a global state listener */}
        <MascotController 
          correctStreak={Number(localStorage.getItem('currentStreak') || 0)}
          isSessionComplete={localStorage.getItem('sessionCompleted') === 'true'}
        />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
