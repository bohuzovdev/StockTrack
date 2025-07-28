import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Plus,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Unlink,
  BarChart3,
  Calendar,
  PieChart,
  Activity
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient, createUserQueryKey } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertInvestmentSchema } from "@shared/schema";
import type { InsertInvestment } from "@shared/schema";
import { z } from "zod";

const formSchema = insertInvestmentSchema;
type FormData = z.infer<typeof formSchema>;

interface UserToken {
  id: string;
  provider: string;
  tokenName: string;
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
}

interface Investment {
  id: string;
  symbol: string;
  amount: number;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  createdAt: string;
  currentPrice?: number;
  currentValue?: number;
  totalGain?: number;
  totalGainPercent?: number;
}

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

export default function Stocks() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // API Connection states
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [showApiForm, setShowApiForm] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  
  // Investment form states
  const [showAddForm, setShowAddForm] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      purchaseDate: new Date(),
    },
  });

  // User-specific query keys
  const portfolioQueryKey = createUserQueryKey(user?.id || null, ["portfolio", "summary"]);
  const investmentsQueryKey = createUserQueryKey(user?.id || null, ["investments"]);
  const sp500QueryKey = createUserQueryKey(user?.id || null, ["market", "sp500"]);

  // Queries
  const { data: portfolioSummary, isLoading: summaryLoading } = useQuery<PortfolioSummary>({
    queryKey: portfolioQueryKey,
    queryFn: () => apiRequest("GET", "/api/portfolio/summary"),
    enabled: isAuthenticated,
  });

  const { data: investments, isLoading: investmentsLoading } = useQuery<Investment[]>({
    queryKey: investmentsQueryKey,
    queryFn: () => apiRequest("GET", "/api/investments"),
    enabled: isAuthenticated,
  });

  const { data: sp500Data, isLoading: sp500Loading } = useQuery<MarketData>({
    queryKey: sp500QueryKey,
    queryFn: () => apiRequest("GET", "/api/market/sp500"),
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  // Load user's API tokens when authenticated
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      loadUserTokens();
    } else if (!authLoading && !isAuthenticated) {
      setIsApiConnected(false);
      setShowApiForm(true);
    }
  }, [isAuthenticated, user, authLoading]);

  const loadUserTokens = async () => {
    try {
      const response = await apiRequest('GET', '/api/user/tokens');
      const tokens = response.tokens || [];
      
      // Check if user has an Alpha Vantage token
      const alphaToken = tokens.find((token: UserToken) => token.provider === 'alpha_vantage' && token.isActive);
      
      if (alphaToken) {
        console.log('📈 Found existing Alpha Vantage token');
        setIsApiConnected(true);
        setShowApiForm(false);
        await testApiConnection();
      } else {
        console.log('📈 No Alpha Vantage token found, showing connection form');
        setShowApiForm(true);
        setIsApiConnected(false);
      }
    } catch (error) {
      console.error('Failed to load user tokens:', error);
      setShowApiForm(true);
      setIsApiConnected(false);
    }
  };

  // Clear all tokens for recovery
  const clearAllTokens = async () => {
    try {
      setIsLoadingApi(true);
      const result = await apiRequest('DELETE', '/api/user/tokens/clear-all');
      
      if (result.success) {
        setIsApiConnected(false);
        setShowApiForm(true);
        setApiError(null);
        console.log(`✅ Cleared ${result.removedCount} tokens for recovery`);
        
        // Invalidate React Query cache
        queryClient.invalidateQueries({ queryKey: ["portfolio", "summary"] });
        queryClient.invalidateQueries({ queryKey: ["investments"] });
      }
    } catch (error: any) {
      console.error('Failed to clear tokens:', error);
      setApiError('Failed to clear tokens: ' + error.message);
    } finally {
      setIsLoadingApi(false);
    }
  };

  // Recovery function for persistent connection issues
  const recoverConnection = async () => {
    try {
      setIsLoadingApi(true);
      console.log('🔄 Attempting Alpha Vantage connection recovery...');
      
      // First, clear any corrupted tokens
      await clearAllTokens();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to reload tokens
      await loadUserTokens();
      
      console.log('✅ Alpha Vantage connection recovery completed');
    } catch (error: any) {
      console.error('Recovery failed:', error);
      setApiError('Recovery failed: ' + error.message);
    } finally {
      setIsLoadingApi(false);
    }
  };

  const testApiConnection = async () => {
    try {
      // Test by fetching SP500 data
      await apiRequest("GET", "/api/market/sp500");
      setIsApiConnected(true);
      setApiError(null);
    } catch (error: any) {
      if (error.message.includes('API key required')) {
        setApiError('Alpha Vantage API key required for real-time data');
        setIsApiConnected(false);
        setShowApiForm(true);
      }
    }
  };

  const connectWithApiKey = async () => {
    if (!inputApiKey.trim()) {
      setApiError('Please enter your Alpha Vantage API key.');
      return;
    }

    setIsLoadingApi(true);
    setApiError(null);

    try {
      // Store the API key using the user token API
      await apiRequest('POST', '/api/user/tokens', {
        provider: 'alpha_vantage',
        token: inputApiKey,
        tokenName: 'Alpha Vantage API Key'
      });

      // Test the connection
      await testApiConnection();
      
      setInputApiKey('');
      setShowApiForm(false);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      
      toast({
        title: "API Connected",
        description: "Alpha Vantage API key connected successfully.",
      });
      
      console.log('✅ Alpha Vantage API key saved and connection established');
    } catch (error: any) {
      console.error('Failed to connect with API key:', error);
      if (error.message.includes('Token validation failed')) {
        setApiError('Invalid Alpha Vantage API key. Please check your key.');
      } else {
        setApiError('Failed to save API key. Please try again.');
      }
    } finally {
      setIsLoadingApi(false);
    }
  };

  const disconnectApi = async () => {
    try {
      await apiRequest('DELETE', '/api/user/tokens/alpha_vantage');
      setIsApiConnected(false);
      setShowApiForm(true);
      setApiError(null);
      
      toast({
        title: "API Disconnected",
        description: "Alpha Vantage API key disconnected.",
      });
      
      console.log('✅ Alpha Vantage API key disconnected');
    } catch (error) {
      console.error('Failed to disconnect API:', error);
      setApiError('Failed to disconnect. Please try again.');
    }
  };

  const createInvestmentMutation = useMutation({
    mutationFn: async (data: InsertInvestment) => {
      return await apiRequest("POST", "/api/investments", data);
    },
    onSuccess: () => {
      toast({
        title: "Investment Added",
        description: "Your investment has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      setShowAddForm(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add investment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const investmentData: InsertInvestment = {
        amount: data.amount,
        purchaseDate: data.purchaseDate,
      };
      createInvestmentMutation.mutate(investmentData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process investment. Please try again.",
        variant: "destructive",
      });
    }
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

  // Show loading while authentication is being determined
  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please log in to access your stocks and investments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.href = '/auth/google'}>
                Login with Google
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Stocks & Investments</h2>
            <p className="text-muted-foreground mt-1">Manage your investment portfolio and track market performance</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {isApiConnected && (
              <>
                <Button 
                  onClick={() => setShowApiForm(!showApiForm)} 
                  variant="outline" 
                  size="sm"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Manage API
                </Button>
                <Button 
                  onClick={() => setShowAddForm(true)} 
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Investment
                </Button>
              </>
            )}
          </div>
        </header>

        <div className="space-y-6">
          {/* API Connection Interface */}
          {(showApiForm || !isApiConnected) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Connect Stock Market API
                </CardTitle>
                <CardDescription>
                  Enter your Alpha Vantage API key to access real-time stock market data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{apiError}</AlertDescription>
                  </Alert>
                )}

                {apiError && apiError.includes('connection') && (
                  <div className="mb-4">
                    <Button
                      onClick={recoverConnection}
                      disabled={isLoadingApi}
                      variant="outline"
                      className="w-full"
                    >
                      {isLoadingApi ? "Recovering..." : "🔄 Recover Connection"}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Try this if your API connection keeps getting lost after page refresh
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">Alpha Vantage API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your Alpha Vantage API key"
                      value={inputApiKey}
                      onChange={(e) => setInputApiKey(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          connectWithApiKey();
                        }
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      Get your free API key from Alpha Vantage to access real-time market data.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={connectWithApiKey} 
                      disabled={isLoadingApi || !inputApiKey.trim()}
                      className="flex-1"
                    >
                      {isLoadingApi ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Connect API
                        </>
                      )}
                    </Button>
                    
                    {isApiConnected && (
                      <Button 
                        onClick={() => setShowApiForm(false)} 
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">How to get your Alpha Vantage API key:</p>
                        <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                          <li>Visit alphavantage.co/support/#api-key</li>
                          <li>Sign up for a free account</li>
                          <li>Copy your API key</li>
                          <li>Paste it above to connect</li>
                        </ol>
                        <a 
                          href="https://www.alphavantage.co/support/#api-key" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:text-blue-700 inline-flex items-center gap-1"
                        >
                          Get free API key <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Connection Status */}
          {isApiConnected && !showApiForm && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">Alpha Vantage API Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Real-time market data is now available.
                      </p>
                    </div>
                  </div>
                  <Button onClick={disconnectApi} variant="outline" size="sm">
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Portfolio Summary Cards */}
          {isApiConnected && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    {portfolioSummary && formatPercent(portfolioSummary.totalGainsPercent)} from invested
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryLoading ? "Loading..." : formatCurrency(portfolioSummary?.totalInvested || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Initial investment amount</p>
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
                    {portfolioSummary && formatPercent(portfolioSummary.totalGainsPercent)} return
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
            </div>
          )}

          {/* Investment Holdings Table */}
          {isApiConnected && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Investment Holdings
                  </CardTitle>
                  <Button 
                    onClick={() => setShowAddForm(true)} 
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Investment
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {investmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading investments...</span>
                  </div>
                ) : investments && investments.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Shares</TableHead>
                          <TableHead>Purchase Price</TableHead>
                          <TableHead>Current Price</TableHead>
                          <TableHead>Purchase Date</TableHead>
                          <TableHead className="text-right">Investment</TableHead>
                          <TableHead className="text-right">Current Value</TableHead>
                          <TableHead className="text-right">Gain/Loss</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {investments.map((investment) => (
                          <TableRow key={investment.id}>
                            <TableCell className="font-medium">
                              <Badge variant="secondary">{investment.symbol || 'SPY'}</Badge>
                            </TableCell>
                            <TableCell>{investment.shares?.toFixed(4) || 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(investment.purchasePrice || 0)}</TableCell>
                            <TableCell>{formatCurrency(investment.currentPrice || 0)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                {new Date(investment.purchaseDate).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(investment.amount)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(investment.currentValue || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium ${
                                (investment.totalGain || 0) >= 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {formatCurrency(investment.totalGain || 0)}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                {investment.totalGainPercent ? formatPercent(investment.totalGainPercent) : 'N/A'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No investments yet</h3>
                    <p className="text-muted-foreground">
                      Add your first investment to start tracking your portfolio.
                    </p>
                    <Button 
                      onClick={() => setShowAddForm(true)} 
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Investment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add Investment Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Investment</CardTitle>
                <CardDescription>
                  Enter your investment details to add it to your portfolio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <Label htmlFor="amount">Investment Amount (USD)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...form.register("amount", { valueAsNumber: true })}
                        className="pl-8"
                      />
                    </div>
                    {form.formState.errors.amount && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.amount.message}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      This amount will be invested in the S&P 500 (SPY) at current market price
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      defaultValue={new Date().toISOString().split('T')[0]}
                      {...form.register("purchaseDate", { 
                        valueAsDate: true,
                        setValueAs: (value) => value ? new Date(value) : undefined
                      })}
                      className="mt-1"
                    />
                    {form.formState.errors.purchaseDate && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.purchaseDate.message}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Select the date when you made this investment. Future dates are not allowed.
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 pt-4">
                    <Button 
                      type="submit" 
                      disabled={createInvestmentMutation.isPending}
                      className="flex-1"
                    >
                      {createInvestmentMutation.isPending ? "Adding..." : "Add Investment"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
} 