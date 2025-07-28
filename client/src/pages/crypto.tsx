import { useState, useEffect } from "react";
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
  Bitcoin, 
  Coins,
  DollarSign,
  Activity,
  Wallet,
  PieChart,
  Plus,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Unlink,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, createUserQueryKey } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CryptoAsset {
  asset: string;
  free: string;
  locked: string;
  total: number;
  usdValue?: number;
}

interface CryptoPortfolio {
  assets: CryptoAsset[];
  totalUsdValue: number;
  lastUpdated: string;
  provider: 'binance';
}

interface UserToken {
  id: string;
  provider: string;
  tokenName: string;
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
}

export default function Crypto() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // API Connection states
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [showApiForm, setShowApiForm] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');
  const [inputSecretKey, setInputSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  
  // Portfolio states
  const [portfolio, setPortfolio] = useState<CryptoPortfolio | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [userTokens, setUserTokens] = useState<UserToken[]>([]);

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
      setUserTokens(tokens);
      
      // Check if user has Binance API tokens
      const binanceKeyToken = tokens.find((token: UserToken) => token.provider === 'binance_key' && token.isActive);
      const binanceSecretToken = tokens.find((token: UserToken) => token.provider === 'binance_secret' && token.isActive);
      
      if (binanceKeyToken && binanceSecretToken) {
        console.log('🟡 Found existing Binance tokens');
        setIsApiConnected(true);
        setShowApiForm(false);
        await loadCryptoAssets();
      } else {
        console.log('🟡 No Binance tokens found, showing connection form');
        setShowApiForm(true);
        setIsApiConnected(false);
      }
    } catch (error) {
      console.error('Failed to load user tokens:', error);
      setShowApiForm(true);
      setIsApiConnected(false);
    }
  };

  const loadCryptoAssets = async () => {
    if (!isApiConnected) return;
    
    setIsLoadingPortfolio(true);
    try {
      const response = await apiRequest('POST', '/api/crypto/assets', {
        provider: 'binance'
      });
      
      if (response.success && response.portfolio) {
        setPortfolio(response.portfolio);
        console.log('✅ Crypto assets loaded successfully');
      } else {
        setApiError('Failed to load crypto assets');
      }
    } catch (error: any) {
      console.error('Failed to load crypto assets:', error);
      
      if (error.message.includes('credentials not found')) {
        setApiError('Binance API credentials not found. Please reconnect your account.');
        setIsApiConnected(false);
        setShowApiForm(true);
      } else if (error.message.includes('rate limit')) {
        setApiError('Binance API rate limit exceeded. Please wait a moment and try again.');
      } else {
        setApiError('Failed to load crypto assets. Please try again.');
      }
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  const testApiConnection = async () => {
    if (!inputApiKey.trim() || !inputSecretKey.trim()) {
      setApiError('Please enter both API key and secret key.');
      return false;
    }

    try {
      const response = await apiRequest('POST', '/api/crypto/test-connection', {
        apiKey: inputApiKey,
        secretKey: inputSecretKey
      });
      
      return response.success && response.valid;
    } catch (error: any) {
      console.error('API connection test failed:', error);
      return false;
    }
  };

  const connectWithKeys = async () => {
    if (!inputApiKey.trim() || !inputSecretKey.trim()) {
      setApiError('Please enter both API key and secret key.');
      return;
    }

    setIsLoadingApi(true);
    setApiError(null);

    try {
      console.log('🧪 Testing Binance API connection...');
      
      // Test connection first
      const isValid = await testApiConnection();
      if (!isValid) {
        setApiError('Invalid Binance API credentials. Please check your keys.');
        return;
      }

      console.log('💾 Saving Binance API credentials...');
      
      // Save credentials
      const saveResponse = await apiRequest('POST', '/api/crypto/connect', {
        apiKey: inputApiKey,
        secretKey: inputSecretKey,
        accountName: 'Main Trading Account'
      });
      
      if (saveResponse.success) {
        console.log('✅ Binance credentials saved successfully');
        setIsApiConnected(true);
        setShowApiForm(false);
        setInputApiKey('');
        setInputSecretKey('');
        
        // Load crypto assets
        await loadCryptoAssets();
        
        toast({
          title: "Binance Connected",
          description: "Your Binance account has been connected successfully.",
        });
      } else {
        throw new Error(saveResponse.error || 'Failed to save credentials');
      }
    } catch (error: any) {
      console.error('Failed to connect with Binance:', error);
      
      if (error.message.includes('Invalid') || error.message.includes('credentials')) {
        setApiError('Invalid Binance API credentials. Please check your keys and try again.');
      } else if (error.message.includes('rate limit')) {
        setApiError('Binance API rate limit exceeded. Please wait a few minutes and try again.');
      } else {
        setApiError(`Failed to connect: ${error.message}`);
      }
    } finally {
      setIsLoadingApi(false);
    }
  };

  const disconnect = async () => {
    try {
      await apiRequest('DELETE', '/api/crypto/disconnect');
      
      setIsApiConnected(false);
      setPortfolio(null);
      setShowApiForm(true);
      setApiError(null);
      
      await loadUserTokens();
      
      toast({
        title: "Binance Disconnected", 
        description: "Your Binance account has been disconnected.",
      });
      
      console.log('✅ Binance account disconnected');
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      setApiError('Failed to disconnect. Please try again.');
    }
  };

  const refresh = async () => {
    if (isApiConnected) {
      await loadCryptoAssets();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: value < 1 ? 4 : 2,
      maximumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  };

  const formatCrypto = (value: number, decimals: number = 8) => {
    return value.toFixed(Math.min(decimals, 8));
  };

  const getTotalPortfolioValue = () => {
    if (!portfolio) return 0;
    return portfolio.totalUsdValue;
  };

  const getTopAssets = () => {
    if (!portfolio) return [];
    return portfolio.assets
      .filter(asset => (asset.usdValue || 0) > 1) // Only show assets worth more than $1
      .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
      .slice(0, 10);
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
                Please log in to access your crypto portfolio.
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
            <h2 className="text-2xl font-semibold">Crypto Portfolio</h2>
            <p className="text-muted-foreground mt-1">Connect your Binance account to track your cryptocurrency holdings</p>
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
                  onClick={refresh} 
                  variant="outline" 
                  size="sm" 
                  disabled={isLoadingPortfolio}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingPortfolio ? 'animate-spin' : ''}`} />
                  Refresh
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
                  <Bitcoin className="w-5 h-5" />
                  Connect Binance Account
                </CardTitle>
                <CardDescription>
                  Enter your Binance API credentials to connect your account and view your crypto holdings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{apiError}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your Binance API key"
                      value={inputApiKey}
                      onChange={(e) => setInputApiKey(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secret-key">Secret Key</Label>
                    <div className="relative">
                      <Input
                        id="secret-key"
                        type={showSecretKey ? "text" : "password"}
                        placeholder="Enter your Binance secret key"
                        value={inputSecretKey}
                        onChange={(e) => setInputSecretKey(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                      >
                        {showSecretKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={connectWithKeys} 
                    disabled={isLoadingApi || !inputApiKey.trim() || !inputSecretKey.trim()}
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
                        Connect Account
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
                      <p className="text-sm font-medium">How to get your Binance API keys:</p>
                      <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                        <li>Log in to your Binance account</li>
                        <li>Go to Account → API Management</li>
                        <li>Create a new API key with "Spot & Margin Trading" permissions</li>
                        <li>Copy both your API Key and Secret Key</li>
                        <li>Enable "Read" permissions (trading permissions not required)</li>
                      </ol>
                      <a 
                        href="https://www.binance.com/en/my/settings/api-management" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:text-blue-700 inline-flex items-center gap-1"
                      >
                        Manage API Keys <ExternalLink className="h-3 w-3" />
                      </a>
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
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                      <CheckCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-medium">Binance Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Your account is successfully connected and syncing.
                      </p>
                    </div>
                  </div>
                  <Button onClick={disconnect} variant="outline" size="sm">
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
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingPortfolio ? "Loading..." : formatCurrency(getTotalPortfolioValue())}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total USD value
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingPortfolio ? "Loading..." : (portfolio?.assets.length || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    With positive balance
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingPortfolio ? "Loading..." : 
                     portfolio ? new Date(portfolio.lastUpdated).toLocaleTimeString() : "Never"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Real-time data
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Provider</CardTitle>
                  <Bitcoin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    Binance
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connected exchange
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Crypto Assets Table */}
          {isApiConnected && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Your Crypto Holdings
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingPortfolio ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading crypto assets...</span>
                  </div>
                ) : portfolio && getTopAssets().length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Locked</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">USD Value</TableHead>
                          <TableHead className="text-right">Allocation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getTopAssets().map((asset) => (
                          <TableRow key={asset.asset}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                                  <Coins className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <Badge variant="secondary">{asset.asset}</Badge>
                              </div>
                            </TableCell>
                            <TableCell>{formatCrypto(parseFloat(asset.free))}</TableCell>
                            <TableCell>{formatCrypto(parseFloat(asset.locked))}</TableCell>
                            <TableCell className="font-medium">{formatCrypto(asset.total)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(asset.usdValue || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm text-muted-foreground">
                                {((asset.usdValue || 0) / getTotalPortfolioValue() * 100).toFixed(1)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bitcoin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No crypto assets found</h3>
                    <p className="text-muted-foreground">
                      {portfolio ? "Your Binance account doesn't have any crypto assets with positive balances." : "Connect your Binance account to view your crypto holdings."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
} 