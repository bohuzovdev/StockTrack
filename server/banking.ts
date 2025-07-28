/**
 * Banking Integration Service
 * Currently supports: Monobank API
 * Future: Open Banking APIs (August 2025+)
 */

export interface BankAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  maskedPan?: string;
  cashbackType?: string;
}

export interface BankTransaction {
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

export interface BankingProvider {
  name: string;
  getAccounts(token: string): Promise<BankAccount[]>;
  getTransactions(token: string, accountId: string, from?: Date, to?: Date): Promise<BankTransaction[]>;
  validateToken(token: string): Promise<boolean>;
}

/**
 * Monobank API Integration
 * Documentation: https://api.monobank.ua/docs/
 */
export class MonobankProvider implements BankingProvider {
  name = 'Monobank';
  private baseUrl = 'https://api.monobank.ua';

  private getAccountName(type: string, currencyCode: number): string {
    const currency = this.getCurrencyCode(currencyCode);
    const typeNames: { [key: string]: string } = {
      'black': 'Monobank Black',
      'white': 'Monobank White', 
      'platinum': 'Monobank Platinum',
      'iron': 'Monobank Iron',
      'yellow': 'Monobank Yellow'
    };
    return `${typeNames[type] || 'Monobank'} ${currency}`;
  }

  async getAccounts(token: string): Promise<BankAccount[]> {
    try {
      console.log(`🔗 Monobank: Fetching real account data from API`);
      
      const response = await fetch(`${this.baseUrl}/personal/client-info`, {
        method: 'GET',
        headers: {
          'X-Token': token,
          'User-Agent': 'PFT/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Monobank API rate limit exceeded. Please try again later.');
        }
        throw new Error(`Monobank API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Map Monobank API response to our BankAccount interface
      const accounts: BankAccount[] = data.accounts.map((acc: any, index: number) => ({
        id: acc.id,
        name: this.getAccountName(acc.type, acc.currencyCode),
        type: acc.type || 'black',
        balance: acc.balance, // Monobank returns balance in cents
        currency: this.getCurrencyCode(acc.currencyCode),
        maskedPan: acc.maskedPan?.[0] || undefined,
        cashbackType: acc.cashbackType || 'UAH',
      }));

      console.log(`💳 Monobank: Retrieved ${accounts.length} real accounts`);
      return accounts;
    } catch (error) {
      console.error('Monobank getAccounts error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch accounts: ${errorMessage}`);
    }
  }

  async getTransactions(token: string, accountId: string, from?: Date, to?: Date): Promise<BankTransaction[]> {
    try {
      console.log(`🔗 Monobank: Fetching real transactions from API for account ${accountId}`);
      
      // Default to last 30 days if no date range provided
      const fromTimestamp = from ? Math.floor(from.getTime() / 1000) : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      const toTimestamp = to ? Math.floor(to.getTime() / 1000) : Math.floor(Date.now() / 1000);
      
      const response = await fetch(`${this.baseUrl}/personal/statement/${accountId}/${fromTimestamp}/${toTimestamp}`, {
        method: 'GET',
        headers: {
          'X-Token': token,
          'User-Agent': 'PFT/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Monobank API rate limit exceeded. Please try again later.');
        }
        if (response.status === 404) {
          throw new Error('Account not found or no transactions available.');
        }
        throw new Error(`Monobank API error: ${response.status}`);
      }

      const apiTransactions = await response.json();
      
      // Map Monobank API response to our BankTransaction interface
      const transactions: BankTransaction[] = apiTransactions.map((tx: any) => ({
        id: tx.id,
        time: tx.time,
        description: tx.description,
        mcc: tx.mcc,
        originalMcc: tx.originalMcc,
        amount: tx.amount,
        operationAmount: tx.operationAmount,
        currency: this.getCurrencyCode(tx.currencyCode),
        commissionRate: tx.commissionRate,
        cashbackAmount: tx.cashbackAmount,
        balance: tx.balance,
        comment: tx.comment || undefined,
        receipt: tx.receiptId || undefined,
        invoiceId: tx.invoiceId || undefined,
        counterEdrpou: tx.counterEdrpou || undefined,
        counterIban: tx.counterIban || undefined,
      }));

      // Sort by time (newest first)
      transactions.sort((a, b) => b.time - a.time);

      console.log(`📈 Monobank: Retrieved ${transactions.length} real transactions for account ${accountId}`);
      return transactions;
    } catch (error) {
      console.error('Monobank getTransactions error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch transactions: ${errorMessage}`);
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      console.log(`🔐 Monobank: Validating real token with API`);
      
      const response = await fetch(`${this.baseUrl}/personal/client-info`, {
        method: 'GET',
        headers: {
          'X-Token': token,
          'User-Agent': 'PFT/1.0',
        },
      });

      const isValid = response.ok;
      console.log(`🔐 Monobank: Token validation result: ${isValid} (status: ${response.status})`);
      return isValid;
    } catch (error) {
      console.error('Monobank validateToken error:', error);
      return false;
    }
  }

  private getCurrencyCode(numericCode: number): string {
    const currencyCodes: Record<number, string> = {
      980: 'UAH',
      840: 'USD',
      978: 'EUR',
      985: 'PLN',
    };
    return currencyCodes[numericCode] || 'UAH';
  }

  private categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('groceries') || desc.includes('продукт') || desc.includes('супермаркет')) {
      return 'Groceries';
    }
    if (desc.includes('restaurant') || desc.includes('ресторан') || desc.includes('кафе')) {
      return 'Dining';
    }
    if (desc.includes('transport') || desc.includes('uber') || desc.includes('bolt')) {
      return 'Transport';
    }
    if (desc.includes('pharmacy') || desc.includes('аптека') || desc.includes('hospital')) {
      return 'Healthcare';
    }
    
    return 'Other';
  }
}

/**
 * Future Open Banking Provider (August 2025+)
 * Will support all Ukrainian banks through standardized APIs
 */
export class OpenBankingProvider implements BankingProvider {
  name = 'Open Banking';
  private hubUrl = 'https://openbanking.ukraine.gov.ua'; // Hypothetical URL

  async getAccounts(token: string): Promise<BankAccount[]> {
    // Implementation will be available after August 2025
    throw new Error('Open Banking not yet available. Expected launch: August 2025');
  }

  async getTransactions(token: string, accountId: string, from?: Date, to?: Date): Promise<BankTransaction[]> {
    // Implementation will be available after August 2025
    throw new Error('Open Banking not yet available. Expected launch: August 2025');
  }

  async validateToken(token: string): Promise<boolean> {
    // Implementation will be available after August 2025
    return false;
  }
}

/**
 * Banking Service Manager
 * Handles multiple banking providers
 */
export class BankingService {
  private providers: Map<string, BankingProvider> = new Map();

  constructor() {
    this.providers.set('monobank', new MonobankProvider());
    this.providers.set('openbanking', new OpenBankingProvider());
  }

  getProvider(name: string): BankingProvider | undefined {
    return this.providers.get(name);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async testConnection(providerName: string, token: string): Promise<boolean> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    
    return provider.validateToken(token);
  }
}

// Export singleton instance
export const bankingService = new BankingService(); 