import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Wallet, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  Building2,
  History
} from "lucide-react";
import { SecureStorage, isCryptoSupported } from "@/lib/crypto";

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

interface ConnectionForm {
  token: string;
}

export default function Banking() {
  const [isConnected, setIsConnected] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [cryptoSupported, setCryptoSupported] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const form = useForm<ConnectionForm>();

  // Check crypto support and load saved token
  useEffect(() => {
    const checkCrypto = () => {
      const supported = isCryptoSupported();
      setCryptoSupported(supported);
      
      if (!supported) {
        console.warn('Web Crypto API not supported. Tokens will use fallback encryption.');
      }
    };

    const loadSavedToken = async () => {
      try {
        const token = await SecureStorage.getItem('monobank_token');
        if (token) {
          setSavedToken(token);
          testConnection(token);
        }
      } catch (error) {
        console.error('Failed to load saved token:', error);
        SecureStorage.removeItem('monobank_token');
      }
    };

    checkCrypto();
    loadSavedToken();
  }, []);

  // Load transactions when account is selected
  useEffect(() => {
    if (selectedAccount && savedToken) {
      fetchTransactions(savedToken, selectedAccount.id);
    }
  }, [selectedAccount, savedToken]);

  const testConnection = async (token: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/banking/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider: 'monobank', token }),
      });

      const data = await response.json();
      
      if (data.valid) {
        setIsConnected(true);
        await fetchAccounts(token);
      } else {
        setError('Invalid token. Please check your Monobank API token.');
        setIsConnected(false);
      }
    } catch (err) {
      setError('Failed to connect to Monobank. Please try again.');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async (token: string) => {
    try {
      const response = await fetch('/api/banking/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider: 'monobank', token }),
      });

      if (response.ok) {
        const data = await response.json();
        const accountsData = data.accounts || [];
        setAccounts(accountsData);
        
        // Auto-select first account
        if (accountsData.length > 0) {
          setSelectedAccount(accountsData[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const fetchTransactions = async (token: string, accountId: string) => {
    setIsLoadingTransactions(true);
    try {
      // Get transactions for the last 30 days
      const to = new Date();
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const response = await fetch('/api/banking/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          provider: 'monobank', 
          token, 
          accountId,
          from: from.toISOString(),
          to: to.toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const onSubmit = async (data: ConnectionForm) => {
    await testConnection(data.token);
    if (isConnected) {
      try {
        await SecureStorage.setItem('monobank_token', data.token);
        setSavedToken(data.token);
      } catch (error) {
        console.error('Failed to save token securely:', error);
        setError('Token connected but failed to save securely. You may need to reconnect on page reload.');
      }
    }
  };

  const disconnect = async () => {
    try {
      SecureStorage.removeItem('monobank_token');
      setSavedToken(null);
      setIsConnected(false);
      setAccounts([]);
      setTransactions([]);
      setSelectedAccount(null);
      setError(null);
      form.reset();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const refresh = async () => {
    if (savedToken) {
      await fetchAccounts(savedToken);
      if (selectedAccount) {
        await fetchTransactions(savedToken, selectedAccount.id);
      }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Banking</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Monobank account to track expenses and manage your finances.
        </p>
      </div>

      {/* Security Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${cryptoSupported ? 'text-green-500' : 'text-yellow-500'}`} />
            <span className={`text-sm font-medium ${cryptoSupported ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {cryptoSupported ? 'Advanced Encryption Active' : 'Basic Encryption Active'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your API tokens are encrypted using {cryptoSupported ? 'Web Crypto API with AES-256-GCM' : 'fallback encryption'}
          </p>
        </CardContent>
      </Card>

      {/* Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Monobank Connection
          </CardTitle>
          <CardDescription>
            Connect your Monobank account to automatically sync your transactions and account balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Monobank API Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="Enter your Monobank API token"
                  {...form.register("token", { required: "Token is required" })}
                />
                <p className="text-sm text-muted-foreground">
                  Get your token from Monobank app: Settings → API → Generate Token
                </p>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect to Monobank'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Connected to Monobank
                </span>
                <Shield className="w-4 h-4 text-green-500" />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={refresh} disabled={isLoading} variant="outline">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={disconnect} variant="destructive">
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                onClick={() => selectedAccount && savedToken && fetchTransactions(savedToken, selectedAccount.id)}
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

      {/* Getting Started Guide */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>How to Get Your Monobank API Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Open Monobank App</p>
                  <p className="text-muted-foreground">Launch the official Monobank mobile application</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Navigate to Settings</p>
                  <p className="text-muted-foreground">Go to Settings → API section</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Generate Token</p>
                  <p className="text-muted-foreground">Create a new personal token for StockTrack</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <div>
                  <p className="font-medium">Copy and Paste</p>
                  <p className="text-muted-foreground">Copy the token and paste it in the form above</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Note:</strong> Your API token is encrypted and stored locally in your browser using advanced cryptographic methods. The token is never sent to our servers except for authentication.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 