import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "./contexts/theme-context";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/components/LoginPage";

// Dashboard Pages
import Dashboard from "./pages/dashboard";
import Stocks from "./pages/stocks";
import Banking from "./pages/banking";
import Crypto from "./pages/crypto";
import HistoricalData from "./pages/historical-data";
import Forecast from "./pages/forecast";
import NotFound from "./pages/not-found";

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading PFT...</p>
      </div>
    </div>
  );
}

// Main app content (protected routes)
function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Welcome message for authenticated users */}
      <div className="hidden">
        Welcome back, {user?.name}! (Debug: {user?.email})
      </div>
      
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/stocks" component={Stocks} />
        <Route path="/banking" component={Banking} />
        <Route path="/crypto" component={Crypto} />
        <Route path="/historical-data" component={HistoricalData} />
        <Route path="/forecast" component={Forecast} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
