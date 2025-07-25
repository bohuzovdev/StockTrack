import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const disconnect = async () => {
    try {
      await SecureStorage.removeItem('monobank_token');
      setSavedToken(null);
      setIsConnected(false);
      setAccounts([]);
      setTransactions([]);
      setSelectedAccount(null);
      setError(null);
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
              <Button onClick={refresh} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </header>

        <div className="space-y-6">

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


        </div>
      </main>
    </div>
  );
} 