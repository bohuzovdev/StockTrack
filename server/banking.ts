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

  async getAccounts(token: string): Promise<BankAccount[]> {
    try {
      // For demo purposes, return mock account data
      // In real implementation, this would call Monobank API
      
      const mockAccounts: BankAccount[] = [
        {
          id: 'V8-wqq0nFF7b3mrk7FeVbdUuqn91',
          name: 'Monobank Black',
          type: 'black',
          balance: 150000, // 1500.00 UAH (in cents)
          currency: 'UAH',
          maskedPan: '537541XXXXXX2357',
          cashbackType: 'UAH',
        },
        {
          id: 'qwe123-asd456-zxc789',
          name: 'Monobank USD',
          type: 'white', 
          balance: 85000, // 850.00 USD (in cents)
          currency: 'USD',
          maskedPan: '537541XXXXXX8901',
          cashbackType: 'Miles',
        },
      ];

      console.log(`💳 Monobank: Retrieved ${mockAccounts.length} mock accounts`);
      return mockAccounts;
    } catch (error) {
      console.error('Monobank getAccounts error:', error);
      throw new Error('Failed to fetch accounts');
    }
  }

  async getTransactions(token: string, accountId: string, from?: Date, to?: Date): Promise<BankTransaction[]> {
    try {
      // For demo purposes, return mock transaction data
      // In real implementation, this would call Monobank API
      
      const mockTransactions: BankTransaction[] = [
        {
          id: 'tx_001',
          time: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
          description: 'ATB Market Grocery Store',
          mcc: 5411,
          originalMcc: 5411,
          amount: -25000, // -250.00 UAH (amounts in cents)
          operationAmount: -25000,
          currency: 'UAH',
          commissionRate: 0,
          cashbackAmount: 250, // 2.50 UAH cashback
          balance: 150000, // 1500.00 UAH
          comment: 'Weekly grocery shopping',
        },
        {
          id: 'tx_002',
          time: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
          description: 'Salary Transfer - Tech Company',
          mcc: 0,
          originalMcc: 0,
          amount: 5000000, // +50,000.00 UAH
          operationAmount: 5000000,
          currency: 'UAH',
          commissionRate: 0,
          cashbackAmount: 0,
          balance: 175000, // 1750.00 UAH
          comment: 'Monthly salary payment',
        },
        {
          id: 'tx_003',
          time: Math.floor(Date.now() / 1000) - 259200, // 3 days ago
          description: 'McDonald\'s Restaurant',
          mcc: 5814,
          originalMcc: 5814,
          amount: -15000, // -150.00 UAH
          operationAmount: -15000,
          currency: 'UAH',
          commissionRate: 0,
          cashbackAmount: 150, // 1.50 UAH cashback
          balance: -4825000, // -48250.00 UAH (before salary)
          comment: 'Quick lunch',
        },
        {
          id: 'tx_004',
          time: Math.floor(Date.now() / 1000) - 345600, // 4 days ago
          description: 'Uber Trip',
          mcc: 4121,
          originalMcc: 4121,
          amount: -35000, // -350.00 UAH
          operationAmount: -35000,
          currency: 'UAH',
          commissionRate: 0,
          cashbackAmount: 350, // 3.50 UAH cashback
          balance: -4810000, // -48100.00 UAH
          comment: 'To downtown office',
        },
        {
          id: 'tx_005',
          time: Math.floor(Date.now() / 1000) - 432000, // 5 days ago
          description: 'Nova Poshta Delivery',
          mcc: 4215,
          originalMcc: 4215,
          amount: -5000, // -50.00 UAH
          operationAmount: -5000,
          currency: 'UAH',
          commissionRate: 0,
          cashbackAmount: 50, // 0.50 UAH cashback
          balance: -4775000, // -47750.00 UAH
          comment: 'Package delivery service',
        },
        {
          id: 'tx_006',
          time: Math.floor(Date.now() / 1000) - 518400, // 6 days ago
          description: 'Steam Purchase',
          mcc: 5734,
          originalMcc: 5734,
          amount: -120000, // -1200.00 UAH
          operationAmount: -120000,
          currency: 'UAH',
          commissionRate: 0,
          cashbackAmount: 1200, // 12.00 UAH cashback
          balance: -4770000, // -47700.00 UAH
          comment: 'Game purchase',
        },
        {
          id: 'tx_007',
          time: Math.floor(Date.now() / 1000) - 604800, // 7 days ago
          description: 'Freelance Project Payment',
          mcc: 0,
          originalMcc: 0,
          amount: 250000, // +2500.00 UAH
          operationAmount: 250000,
          currency: 'UAH',
          commissionRate: 0,
          cashbackAmount: 0,
          balance: -4650000, // -46500.00 UAH
          comment: 'Web development project',
        },
      ];

      // Filter by date range if provided
      let filteredTransactions = mockTransactions;
      if (from || to) {
        filteredTransactions = mockTransactions.filter(tx => {
          const txDate = new Date(tx.time * 1000);
          if (from && txDate < from) return false;
          if (to && txDate > to) return false;
          return true;
        });
      }

      // Sort by time (newest first)
      filteredTransactions.sort((a, b) => b.time - a.time);

      console.log(`📈 Monobank: Retrieved ${filteredTransactions.length} mock transactions for account ${accountId}`);
      return filteredTransactions;
    } catch (error) {
      console.error('Monobank getTransactions error:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      // For demo purposes, accept any token longer than 10 characters
      // In real implementation, this would call Monobank API to validate
      
      const isValid = token && token.length > 10 ? true : false;
      console.log(`🔐 Monobank: Token validation for length ${token?.length}: ${isValid}`);
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