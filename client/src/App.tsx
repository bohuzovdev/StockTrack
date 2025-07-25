import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/theme-context";
import Dashboard from "@/pages/dashboard";
import AddInvestment from "@/pages/add-investment";
import Banking from "@/pages/banking";
import HistoricalData from "@/pages/historical-data";
import Forecast from "@/pages/forecast";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/add-investment" component={AddInvestment} />
        <Route path="/banking" component={Banking} />
        <Route path="/historical" component={HistoricalData} />
        <Route path="/forecast" component={Forecast} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
