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
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  Building2,
  History,
  Plus,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Unlink
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";

interface BankAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  maskedPan?: string;
  cashbackType?: string;
}

interface BankTransaction {
  id: string;
  time: number;
  description: string;
  mcc: number;
  originalMcc: number;
  amount: number;
  operationAmount: number;
  currency: string;
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  comment?: string;
  receipt?: string;
  invoiceId?: string;
  counterEdrpou?: string;
  counterIban?: string;
}

interface UserToken {
  id: string;
  provider: string;
  tokenName: string;
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
}

export default function Banking() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  
  // New states for connection interface
  const [inputToken, setInputToken] = useState('');
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [userTokens, setUserTokens] = useState<UserToken[]>([]);

  // Load user's API tokens when authenticated
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      loadUserTokens();
    } else if (!authLoading && !isAuthenticated) {
      // User not authenticated, reset state
      setIsConnected(false);
      setAccounts([]);
      setTransactions([]);
      setSelectedAccount(null);
      setSavedToken(null);
      setShowConnectionForm(true);
    }
  }, [isAuthenticated, user, authLoading]);

  // Load transactions when account is selected
  useEffect(() => {
    if (selectedAccount && savedToken) {
      fetchTransactions(savedToken, selectedAccount.id);
    }
  }, [selectedAccount, savedToken]);

  const loadUserTokens = async () => {
    try {
      const response = await apiRequest('GET', '/api/user/tokens');
      const tokens = response.tokens || [];
      setUserTokens(tokens);
      
      // Check if user has a Monobank token
      const monobankToken = tokens.find((token: UserToken) => token.provider === 'monobank' && token.isActive);
      
      if (monobankToken) {
        console.log('📱 Found existing Monobank token, testing connection...');
        // We don't have the actual token value from the API (security), 
        // so we need to test the connection by trying to fetch accounts
        await testExistingConnection();
      } else {
        console.log('📱 No Monobank token found, showing connection form');
        setShowConnectionForm(true);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Failed to load user tokens:', error);
      setShowConnectionForm(true);
      setIsConnected(false);
    }
  };

  const testExistingConnection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest('POST', '/api/banking/accounts', { provider: 'monobank' });
      if (response.accounts) {
        setIsConnected(true);
        setAccounts(response.accounts);
        setShowConnectionForm(false);
        if (response.accounts.length > 0) { 
          setSelectedAccount(response.accounts[0]); 
        }
        console.log('✅ Monobank connection verified');
      } else {
        console.log('❌ No accounts returned, token may be invalid');
        setError('Failed to load accounts. Your token may have expired or been corrupted.');
        setIsConnected(false);
        setShowConnectionForm(true);
      }
    } catch (error: any) {
      console.error('Failed to test existing connection:', error);
      
      if (error.message.includes('401') || error.message.includes('Invalid token') || error.message.includes('Decryption failed')) {
        console.log('🔑 Token invalid or corrupted, need to reconnect');
        setError('Your Monobank token has expired or been corrupted. Please reconnect your account.');
      } else if (error.message.includes('rate limit')) {
        console.log('⏰ Rate limit exceeded, will retry later');
        setError('Monobank API rate limit exceeded. Please wait a moment and try again.');
      } else {
        setError('Failed to connect to Monobank. Please check your connection.');
      }
      
      setIsConnected(false);
      setShowConnectionForm(true);
      setAccounts([]);
      setSelectedAccount(null);
    } finally { 
      setIsLoading(false); 
    }
  };

  // Clear all tokens for this user (emergency recovery)
  const clearAllTokens = async () => {
    try {
      setIsLoading(true);
      const result = await apiRequest('DELETE', '/api/user/tokens/clear-all');
      
      if (result.success) {
        setIsConnected(false);
        setAccounts([]);
        setTransactions([]);
        setSelectedAccount(null);
        setSavedToken(null);
        setShowConnectionForm(true);
        setError(null);
        console.log(`✅ Cleared ${result.removedCount} tokens for recovery`);
      }
    } catch (error: any) {
      console.error('Failed to clear tokens:', error);
      setError('Failed to clear tokens: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Recovery function for persistent connection issues
  const recoverConnection = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Attempting connection recovery...');
      
      // First, clear any corrupted tokens
      await clearAllTokens();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to reload tokens
      await loadUserTokens();
      
      console.log('✅ Connection recovery completed');
    } catch (error: any) {
      console.error('Recovery failed:', error);
      setError('Recovery failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const connectWithToken = async () => {
    if (!inputToken.trim()) {
      setError('Please enter your Monobank API token.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('💾 Saving Monobank token to server...');
      
      // Save token to server with better error handling
      const saveResponse = await apiRequest('POST', '/api/user/tokens', {
        provider: 'monobank',
        token: inputToken,
        tokenName: 'Monobank API Key'
      });
      
      if (saveResponse.success) {
        console.log('✅ Token saved successfully, testing connection...');
        
        // Test the connection immediately
        await testExistingConnection();
        setInputToken('');
        
        console.log('✅ Monobank token saved and connection established');
      } else {
        throw new Error(saveResponse.error || 'Failed to save token');
      }
    } catch (error: any) {
      console.error('Failed to connect with token:', error);
      
      if (error.message.includes('Token validation failed') || error.message.includes('invalid token')) {
        setError('Invalid Monobank API token. Please check your token and try again.');
      } else if (error.message.includes('rate limit')) {
        setError('Monobank API rate limit exceeded. Please wait a few minutes and try again.');
      } else if (error.message.includes('Failed to encrypt')) {
        setError('Server encryption error. Please try again or contact support.');
      } else {
        setError(`Failed to connect: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async (token: string, accountId: string) => {
    setIsLoadingTransactions(true);
    try {
      // Get transactions for the last 30 days
      const to = new Date();
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const response = await apiRequest('POST', '/api/banking/transactions', {
        provider: 'monobank',
        // No token needed - server will use stored user token
        accountId,
        from: from.toISOString(),
        to: to.toISOString()
      });

      setTransactions(response.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const disconnect = async () => {
    try {
      // Remove the token from server-side storage
      await apiRequest('DELETE', '/api/user/tokens/monobank');
      
      // Reset local state
      setSavedToken(null);
      setIsConnected(false);
      setAccounts([]);
      setTransactions([]);
      setSelectedAccount(null);
      setError(null);
      setShowConnectionForm(true);
      
      // Reload user tokens
      await loadUserTokens();
      
      console.log('✅ Monobank token disconnected');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      setError('Failed to disconnect. Please try again.');
    }
  };

  const refresh = async () => {
    if (isConnected) {
      await testExistingConnection();
    }
  };

  const formatCurrency = (amount: number, currency: string = 'UAH') => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount / 100); // Monobank amounts are in cents
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (amount: number) => {
    return amount < 0 ? (
      <ArrowUpRight className="w-4 h-4 text-red-500" />
    ) : (
      <ArrowDownLeft className="w-4 h-4 text-green-500" />
    );
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'black':
        return <CreditCard className="w-5 h-5 text-gray-900" />;
      case 'white':
        return <CreditCard className="w-5 h-5 text-gray-400" />;
      case 'platinum':
        return <CreditCard className="w-5 h-5 text-purple-500" />;
      default:
        return <CreditCard className="w-5 h-5 text-blue-500" />;
    }
  };

  const maskCardNumber = (pan: string | undefined) => {
    if (!pan) return 'Unknown';
    return `•••• •••• •••• ${pan.slice(-4)}`;
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
                Please log in to access your banking information.
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
            <h2 className="text-2xl font-semibold">Banking</h2>
            <p className="text-muted-foreground mt-1">Connect your Monobank account to track expenses and manage your finances</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {isConnected && (
              <>
                <Button 
                  onClick={() => setShowConnectionForm(!showConnectionForm)} 
                  variant="outline" 
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Connection
                </Button>
                <Button onClick={refresh} variant="outline" size="sm" disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </>
            )}
          </div>
        </header>

        <div className="space-y-6">
          {/* Connection Interface */}
          {(showConnectionForm || !isConnected) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Connect Monobank Account
                </CardTitle>
                <CardDescription>
                  Enter your Monobank API token to connect your account and view transactions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {error && error.includes('connection') && (
                  <div className="mb-4">
                    <Button
                      onClick={recoverConnection}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full"
                    >
                      {isLoading ? "Recovering..." : "🔄 Recover Connection"}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Try this if your tokens keep getting lost after page refresh
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="monobank-token">Monobank API Token</Label>
                    <Input
                      id="monobank-token"
                      type="password"
                      placeholder="Enter your Monobank API token"
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          connectWithToken();
                        }
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      You can get your API token from the Monobank mobile app (Settings → API).
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 pt-4">
                    <Button 
                      onClick={connectWithToken} 
                      disabled={isLoading || !inputToken.trim()}
                      className="flex-1"
                    >
                      {isLoading ? (
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
                    
                    {isConnected && (
                      <Button 
                        onClick={() => setShowConnectionForm(false)} 
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                  {error && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Having trouble? Try clearing all stored tokens and reconnecting.
                        </p>
                        <Button 
                          onClick={clearAllTokens} 
                          variant="outline" 
                          size="sm"
                          disabled={isLoading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                          Clear Tokens
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">How to get your Monobank API token:</p>
                        <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                          <li>Open your Monobank mobile app</li>
                          <li>Go to Settings → API</li>
                          <li>Generate a new personal token</li>
                          <li>Copy and paste the token above</li>
                        </ol>
                        <a 
                          href="https://api.monobank.ua/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:text-blue-700 inline-flex items-center gap-1"
                        >
                          Learn more <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connection Status */}
          {isConnected && !showConnectionForm && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">Monobank Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Your account is successfully connected and syncing.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={testExistingConnection} 
                      variant="outline" 
                      size="sm"
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      Test Connection
                    </Button>
                    <Button onClick={disconnect} variant="outline" size="sm">
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Cards */}
          {isConnected && accounts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Your Accounts</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBalanceVisible(!balanceVisible)}
                >
                  {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => (
                  <Card 
                    key={account.id} 
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedAccount?.id === account.id 
                        ? 'ring-2 ring-blue-500 shadow-lg' 
                        : ''
                    }`}
                    onClick={() => setSelectedAccount(account)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getAccountTypeIcon(account.type)}
                          <CardTitle className="text-lg">{account.name}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {account.type.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {maskCardNumber(account.maskedPan)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Balance</span>
                          <div className="flex items-center gap-1">
                            {account.balance >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        <div className="text-2xl font-bold">
                          {balanceVisible 
                            ? formatCurrency(account.balance, account.currency)
                            : '••••••••'
                          }
                        </div>
                        {account.cashbackType && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="w-3 h-3" />
                            Cashback: {account.cashbackType}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Transaction History */}
          {isConnected && selectedAccount && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Transaction History
                    </CardTitle>
                    <CardDescription>
                      Last 30 days for {selectedAccount.name}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedAccount && fetchTransactions('', selectedAccount.id)}
                    disabled={isLoadingTransactions}
                  >
                    {isLoadingTransactions ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading transactions...</span>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTransactionIcon(transaction.amount)}
                                <span className="text-xs">
                                  {transaction.amount < 0 ? 'OUT' : 'IN'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium max-w-[300px]">
                              <div>
                                <div className="truncate">{transaction.description}</div>
                                {transaction.comment && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {transaction.comment}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                {formatDateTime(transaction.time)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium ${
                                transaction.amount < 0 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : 'text-green-600 dark:text-green-400'
                              }`}>
                                {transaction.amount < 0 ? '-' : '+'}
                                {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                              </span>
                              {transaction.cashbackAmount > 0 && (
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  +{formatCurrency(transaction.cashbackAmount, transaction.currency)} cashback
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {balanceVisible 
                                ? formatCurrency(transaction.balance, transaction.currency)
                                : '••••••••'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No transactions found</h3>
                    <p className="text-muted-foreground">
                      No transactions in the last 30 days for this account.
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