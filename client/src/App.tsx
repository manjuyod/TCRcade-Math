import { Switch, Route, Redirect, useLocation } from "wouter";
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
import MathRushSetupPage from "@/pages/rush/setup-page";
import MathRushPlayPage from "@/pages/rush/play-page";
import MathRushCompletePage from "@/pages/rush/complete-page";
import MathRushAssessmentPage from "@/pages/rush/assessment-page";
import FractionsSetupPage from "@/pages/fractions/setup-page";
import FractionsPlayPage from "@/pages/fractions/play-page";
import FractionsCompletePage from "@/pages/fractions/complete-page";
import DecimalDefenderSetupPage from "@/pages/decimals/setup-page";
import DecimalDefenderPlayPage from "@/pages/decimals/play-page";
import DecimalDefenderCompletePage from "@/pages/decimals/complete-page";
import RatiosSetupPage from "@/pages/ratios/setup-page";
import RatiosPlayPage from "@/pages/ratios/play-page";
import RatiosCompletePage from "@/pages/ratios/complete-page";
import MeasurementSetupPage from "@/pages/measurement/setup-page";
import MeasurementPlayPage from "@/pages/measurement/play-page";
import MeasurementCompletePage from "@/pages/measurement/complete-page";
import MeasurementLoadingPage from "@/pages/measurement/loading-page";

// Math Facts Play Pages
import AdditionPlayPage from "@/pages/math-facts/addition-play-page";
import SubtractionPlayPage from "@/pages/math-facts/subtraction-play-page";
import MultiplicationPlayPage from "@/pages/math-facts/multiplication-play-page";
import DivisionPlayPage from "@/pages/math-facts/division-play-page";
import MathFactsLoadingPage from "@/pages/math-facts/loading-page";
import MathFactsCompletePage from "@/pages/math-facts/complete-page";
import MathFactsAssessmentPlayPage from "@/pages/math-facts/assessment-play-page";
import MathFactsAssessmentCompletePage from "@/pages/math-facts/assessment-complete-page";
import AlgebraSetupPage from "@/pages/algebra/setup-page";
import AlgebraLoadingPage from "@/pages/algebra/loading-page";
import AlgebraPlayPage from "@/pages/algebra/play-page";
import AlgebraCompletePage from "@/pages/algebra/complete-page";
import AiTutorPage from "@/pages/ai-tutor-page";
import RecTutorPage from "@/pages/RecTutorPage";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { TokenSocketProvider } from "@/components/token-socket-provider";
import MultiplayerMode from "@/components/multiplayer-mode";
import AiAnalytics from "@/components/ai-analytics";
import CreateAQuiz from "@/components/create-a-quiz";
import Navigation from "@/components/navigation";
import RecommendationQuizPage from "@/pages/RecommendationQuizPage";
import ScrollToTop from "@/components/scroll-to-top";
import { sessionManager } from "@/lib/session-manager";

// Initialize global session manager
sessionManager;

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
      <ProtectedRoute path="/modules" component={ModulesPage} />
      <Route path="/">
        <Redirect to="/modules" />
      </Route>
      <ProtectedRoute path="/home" component={HomePage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/leaderboard" component={LeaderboardPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/multiplayer" component={MultiplayerPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/practice" component={CreateQuizPage} />
      <ProtectedRoute path="/recquiz" component={RecommendationQuizPage} />
      <ProtectedRoute path="/recommendations" component={RecommendationQuizPage} />
      <ProtectedRoute path="/tutor" component={AiTutorPage} />
      <ProtectedRoute path="/ai-tutor" component={AiTutorPage} />
      <ProtectedRoute path="/rectutor" component={RecTutorPage} />
      <ProtectedRoute path="/rush/setup" component={MathRushSetupPage} />
      <ProtectedRoute path="/rush/assessment" component={MathRushAssessmentPage} />
      <ProtectedRoute path="/math-rush-assessment" component={MathRushAssessmentPage} />
      <ProtectedRoute path="/rush/play" component={MathRushPlayPage} />
      <ProtectedRoute path="/rush/complete" component={MathRushCompletePage} />
      <ProtectedRoute path="/fractions/setup" component={FractionsSetupPage} />
      <ProtectedRoute path="/fractions/play" component={FractionsPlayPage} />
      <ProtectedRoute path="/fractions/complete" component={FractionsCompletePage} />
      <ProtectedRoute path="/decimals/setup" component={DecimalDefenderSetupPage} />
      <ProtectedRoute path="/decimals/play" component={DecimalDefenderPlayPage} />
      <ProtectedRoute path="/decimals/complete" component={DecimalDefenderCompletePage} />
      <ProtectedRoute path="/ratios/setup" component={RatiosSetupPage} />
      <ProtectedRoute path="/ratios/play" component={RatiosPlayPage} />
      <ProtectedRoute path="/ratios/complete" component={RatiosCompletePage} />
      <Route path="/measurement/setup" component={MeasurementSetupPage} />
      <Route path="/measurement/play" component={MeasurementPlayPage} />
      <Route path="/measurement/complete" component={MeasurementCompletePage} />
      <Route path="/measurement/loading" component={MeasurementLoadingPage} />
      
      {/* Algebra Module Routes */}
      <Route path="/algebra/setup" component={AlgebraSetupPage} />
      <Route path="/algebra/loading" component={AlgebraLoadingPage} />
      <Route path="/algebra/play" component={AlgebraPlayPage} />
      <Route path="/algebra/complete" component={AlgebraCompletePage} />

      {/* Math Facts Play Pages */}
      <Route path="/math-facts/addition/play" component={AdditionPlayPage} />
      <Route path="/math-facts/subtraction/play" component={SubtractionPlayPage} />
      <Route path="/math-facts/multiplication/play" component={MultiplicationPlayPage} />
      <Route path="/math-facts/division/play" component={DivisionPlayPage} />
      
      {/* Math Facts Loading and Complete Pages */}
      <Route path="/math-facts/:operation/loading" component={MathFactsLoadingPage} />
      <Route path="/math-facts/:operation/complete" component={MathFactsCompletePage} />
      <Route path="/math-facts/:operation/assessment" component={MathFactsAssessmentPlayPage} />
      <Route path="/math-facts/:operation/assessment/complete" component={MathFactsAssessmentCompletePage} />
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
    if (location === '/' || location === '/modules') return 'home';
    if (location === '/home') return 'play';
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
        <TokenSocketProvider>
          <ScrollToTop />
          <NavigationWrapper>
            <Router />
          </NavigationWrapper>
          <Toaster />
        </TokenSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;