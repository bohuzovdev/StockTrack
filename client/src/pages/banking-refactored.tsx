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
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  Unlink2,
  Calendar,
  Eye,
  EyeOff,
  WifiOff
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTokenManager } from "@/hooks/useTokenManager";
import { useBankingApiRequest } from "@/hooks/useApiRequest";
import { 
  BankAccount, 
  BankTransaction, 
  BankAccountsResponse, 
  BankTransactionsResponse 
} from "@/types/api";

/**
 * REFACTORED BANKING PAGE
 * 
 * This demonstrates the architectural improvements:'
 * - Uses reusable useTokenManager hook (eliminates 200+ lines of duplication)
 * - Uses proper TypeScript interfaces instead of 'any' types
 * - Separates concerns: token management, API calls, UI components
 * - Consistent error handling and loading states
 * - Much cleaner and more maintainable code
 */

export default function BankingRefactored() {
  const { user, isAuthenticated } = useAuth();
  
  // Use the new reusable token manager hook
  const tokenManager = useTokenManager('monobank');
  
  // Use the new specialized banking API hooks
  const { getAccounts, getTransactions } = useBankingApiRequest();
  
  // Local UI state
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);

  // Load user tokens when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      tokenManager.loadUserTokens();
    }
  }, [isAuthenticated, user, tokenManager.loadUserTokens]);

  // Load accounts when connected
  useEffect(() => {
    if (tokenManager.isConnected && !getAccounts.isLoading) {
      handleLoadAccounts();
    }
  }, [tokenManager.isConnected]);

  /**
   * Load bank accounts from API
   */
  const handleLoadAccounts = async () => {
    try {
      const response = await getAccounts.execute({ provider: 'monobank' }) as BankAccountsResponse;
      
      if (response.success && response.accounts) {
        setAccounts(response.accounts);
        
        // Auto-select first account
        if (response.accounts.length > 0) {
          setSelectedAccount(response.accounts[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
      tokenManager.setError('Failed to load bank accounts. Please check your connection.');
    }
  };

  /**
   * Load transactions for selected account
   */
  const handleLoadTransactions = async (account: BankAccount) => {
    if (!account) return;
    
    try {
      const response = await getTransactions.execute({
        provider: 'monobank',
        accountId: account.accountId,
      }) as BankTransactionsResponse;
      
      if (response.success && response.transactions) {
        setTransactions(response.transactions);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      tokenManager.setError('Failed to load transactions. Please try again.');
    }
  };

  /**
   * Connect Monobank token
   */
  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      tokenManager.setError('Please enter your Monobank API token');
      return;
    }

    try {
      await tokenManager.saveToken('monobank', tokenInput.trim(), 'Monobank API Key');
      setTokenInput('');
      
      // Test the connection by loading accounts
      await handleLoadAccounts();
      
    } catch (error) {
      // Error is already handled by the token manager
      console.error('Failed to connect Monobank:', error);
    }
  };

  /**
   * Disconnect Monobank
   */
  const handleDisconnect = async () => {
    try {
      await tokenManager.deleteToken('monobank');
      setAccounts([]);
      setTransactions([]);
      setSelectedAccount(null);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number, currency = 'UAH') => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Monobank amounts are in kopecks
  };

  /**
   * Format transaction date
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show authentication prompt if not logged in
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-md mx-auto mt-20">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Banking
                </CardTitle>
                <CardDescription>
                  Please log in with Google to access your banking features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => window.location.href = '/auth/google'}>
                  Login with Google
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Banking</h1>
              <p className="text-muted-foreground">
                Connect your Monobank account to track your finances
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Connection Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Monobank Connection
                {tokenManager.isConnected ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {tokenManager.isConnected 
                  ? "Your Monobank account is connected and ready to use"
                  : "Connect your Monobank API token to access your banking data"
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Display */}
              {tokenManager.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{tokenManager.error}</AlertDescription>
                </Alert>
              )}

              {/* Recovery Button */}
              {tokenManager.error && tokenManager.error.includes('connection') && (
                <div className="mb-4">
                  <Button
                    onClick={tokenManager.recoverConnection}
                    disabled={tokenManager.isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {tokenManager.isLoading ? "Recovering..." : "🔄 Recover Connection"}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try this if your tokens keep getting lost after page refresh
                  </p>
                </div>
              )}

              {/* Connection Form or Connected State */}
              {!tokenManager.isConnected ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="monobank-token">Monobank API Token</Label>
                    <div className="relative">
                      <Input
                        id="monobank-token"
                        type={showToken ? "text" : "password"}
                        placeholder="Enter your Monobank API token"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !tokenManager.isLoading) {
                            handleConnect();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleConnect} 
                    disabled={tokenManager.isLoading || !tokenInput.trim()}
                    className="w-full"
                  >
                    {tokenManager.isLoading ? "Connecting..." : "Connect Account"}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={handleLoadAccounts}
                    disabled={getAccounts.isLoading}
                    variant="outline"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${getAccounts.isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  
                  <Button
                    onClick={handleDisconnect}
                    disabled={tokenManager.isLoading}
                    variant="destructive"
                  >
                    <Unlink2 className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Cards */}
          {tokenManager.isConnected && accounts.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {accounts.map((account) => (
                <Card 
                  key={account.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedAccount?.id === account.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedAccount(account);
                    handleLoadTransactions(account);
                  }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {account.accountName}
                    </CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(account.balance, account.currency)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {account.maskedPan || account.iban || account.accountType}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Transactions Table */}
          {selectedAccount && transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>
                  Showing transactions for {selectedAccount.accountName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 10).map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(transaction.balance, transaction.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {tokenManager.isConnected && accounts.length === 0 && !getAccounts.isLoading && (
            <Card>
              <CardContent className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No accounts found</h3>
                <p className="text-muted-foreground mb-4">
                  We couldn't find any accounts associated with your Monobank token.
                </p>
                <Button onClick={handleLoadAccounts} disabled={getAccounts.isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${getAccounts.isLoading ? 'animate-spin' : ''}`} />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
} 