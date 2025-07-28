import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvestmentTable } from "@/components/investment-table";
import { PortfolioChart } from "@/components/portfolio-chart";
import { WebSocketStatus } from "@/components/websocket-status";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { BarChart3, TrendingUp, RefreshCw, CreditCard, Activity, ExternalLink } from "lucide-react";
import { apiRequest, queryClient, createUserQueryKey } from "@/lib/queryClient";
import { SecureStorage } from "@/lib/crypto";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGains: number;
  totalGainsPercent: number;
}

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated?: string;
}

interface BankAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

export default function Dashboard() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isBankDataLoading, setIsBankDataLoading] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, clearUserData } = useAuth();
  const [, setLocation] = useLocation();

  // User-specific query keys
  const portfolioQueryKey = createUserQueryKey(user?.id || null, ["portfolio", "summary"]);
  const sp500QueryKey = createUserQueryKey(user?.id || null, ["market", "sp500"]);

  const { data: portfolioSummary, isLoading: summaryLoading } = useQuery<PortfolioSummary>({
    queryKey: portfolioQueryKey,
    queryFn: () => apiRequest("GET", "/api/portfolio/summary"),
    enabled: isAuthenticated,
  });

  const { data: sp500Data, isLoading: sp500Loading } = useQuery<MarketData>({
    queryKey: sp500QueryKey,
    queryFn: () => apiRequest("GET", "/api/market/sp500"),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Clear all data when user changes
  useEffect(() => {
    if (user) {
      // User logged in, load their data
      loadMonobankData();
    } else {
      // User logged out, clear all data
      setBankAccounts([]);
      setIsBankDataLoading(false);
    }
  }, [user?.id]); // Trigger when user ID changes

  const loadMonobankData = async () => {
    if (!user) return;
    
    try {
      setIsBankDataLoading(true);
      const savedToken = await SecureStorage.getItem('monobank_token');
      if (savedToken) {
        await fetchBankAccounts(savedToken);
      }
    } catch (error) {
      console.error('Failed to load Monobank data:', error);
      // Clear invalid token
      await SecureStorage.removeItem('monobank_token');
    } finally {
      setIsBankDataLoading(false);
    }
  };

  const fetchBankAccounts = async (token: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/banking/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ provider: 'monobank', token }),
      });

      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.accounts || []);
      } else if (response.status === 401) {
        // Authentication error, clear data and redirect
        await clearUserData();
        window.location.href = '/auth/google';
      } else {
        // Invalid token or other error
        console.error('Failed to fetch bank accounts:', response.status);
        await SecureStorage.removeItem('monobank_token');
        setBankAccounts([]);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
      await SecureStorage.removeItem('monobank_token');
      setBankAccounts([]);
    }
  };

  const handleRefreshData = async () => {
    if (!user) return;

    try {
      // Invalidate user-specific queries
      await queryClient.invalidateQueries({ 
        queryKey: ['user', user.id] 
      });
      
      // Refresh Monobank data
      await loadMonobankData();
      
      toast({
        title: "Data Refreshed",
        description: "Market and banking data have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTotalBankBalance = () => {
    if (bankAccounts.length === 0) return 0;
    
    // Convert all balances to UAH for display (Monobank amounts are in cents)
    return bankAccounts.reduce((total, account) => {
      if (account.currency === 'UAH') {
        return total + account.balance;
      }
      // For other currencies, we'd normally need exchange rates
      // For now, just convert USD to UAH using approximate rate
      if (account.currency === 'USD') {
        return total + (account.balance * 4100); // Approximate USD to UAH rate
      }
      if (account.currency === 'EUR') {
        return total + (account.balance * 4400); // Approximate EUR to UAH rate
      }
      return total + account.balance; // Fallback
    }, 0);
  };

  const formatBankCurrency = (amount: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100); // Monobank amounts are in cents
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  // Don't render dashboard if not authenticated
  if (!isAuthenticated || !user) {
    return null; // AuthProvider will handle showing login page
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back, {user.name}! Here's your portfolio overview.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <WebSocketStatus />
            <ThemeToggle />
            <Button onClick={handleRefreshData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryLoading ? "Loading..." : formatCurrency(portfolioSummary?.totalValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {portfolioSummary && formatPercent(portfolioSummary.totalGainsPercent)} from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryLoading ? "Loading..." : formatCurrency(portfolioSummary?.totalInvested || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total amount invested</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gains</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryLoading ? "Loading..." : formatCurrency(portfolioSummary?.totalGains || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {portfolioSummary && formatPercent(portfolioSummary.totalGainsPercent)} overall return
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">S&P 500 Today</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sp500Loading ? "Loading..." : (sp500Data?.price?.toFixed(2) || "N/A")}
              </div>
              <p className="text-xs text-muted-foreground">
                {sp500Data && formatPercent(sp500Data.changePercent)} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monobank Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isBankDataLoading ? "Loading..." : 
                 bankAccounts.length > 0 ? formatBankCurrency(getTotalBankBalance()) : "Not Connected"}
              </div>
              <p className="text-xs text-muted-foreground">
                {bankAccounts.length > 0 ? `${bankAccounts.length} account${bankAccounts.length !== 1 ? 's' : ''}` : "Connect in Banking"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <PortfolioChart />
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setLocation('/stocks')} 
                className="w-full"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Manage Stocks
              </Button>
              <Button 
                onClick={() => setLocation('/banking')} 
                variant="outline" 
                className="w-full"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Banking
              </Button>
              <Button 
                onClick={() => setLocation('/forecast')} 
                variant="outline" 
                className="w-full"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Forecast
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Investment Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Investment Holdings</CardTitle>
              <Button 
                onClick={() => setLocation('/stocks')} 
                variant="outline" 
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <InvestmentTable />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
