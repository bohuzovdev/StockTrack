import type { Investment, InvestmentWithCurrentData, PortfolioSummary, MarketData } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Investment operations
  createInvestment(investment: Omit<Investment, "id"> & { userId: string }): Promise<Investment>;
  getInvestments(userId?: string): Promise<Investment[]>;
  getInvestment(id: string): Promise<Investment | undefined>;
  updateInvestment(id: string, investment: Partial<Investment>): Promise<Investment | undefined>;
  deleteInvestment(id: string): Promise<boolean>;

  // Market data operations
  upsertMarketData(marketData: Omit<MarketData, "id" | "lastUpdated">): Promise<MarketData>;
  getMarketData(symbol: string): Promise<MarketData | null>;
  getAllMarketData(): Promise<MarketData[]>;

  // Portfolio operations
  getPortfolioSummary(userId?: string): Promise<PortfolioSummary>;
  getInvestmentsWithCurrentData(userId?: string): Promise<InvestmentWithCurrentData[]>;

  // User operations
  createUser(userData: any): Promise<any>;
  getUser(userId: string): Promise<any | null>;
  updateUser(userId: string, updates: any): Promise<any | null>;

  // Stats and debug
  getStats(): { investments: number; marketData: number; users: number };
  clearAll(): void;
  clearUserData(userId: string): void;
}

class MemStorage implements IStorage {
  private investments: Map<string, Investment> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private users: Map<string, any> = new Map(); // For user data

  // Investment operations - now user-specific
  async createInvestment(data: Omit<Investment, "id"> & { userId: string }): Promise<Investment> {
    const id = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const investment: Investment = {
      id,
      ...data,
      createdAt: data.createdAt || new Date(),
    };
    
    this.investments.set(id, investment);
    console.log(`💰 Investment created for user ${data.userId}: $${data.amount} (${investment.symbol})`);
    return investment;
  }

  async getInvestments(userId?: string): Promise<Investment[]> {
    const allInvestments = Array.from(this.investments.values());
    
    // If userId provided, filter by user
    if (userId) {
      return allInvestments.filter(inv => inv.userId === userId);
    }
    
    // Otherwise return all (for backward compatibility)
    return allInvestments;
  }

  async getInvestment(id: string): Promise<Investment | undefined> {
    return this.investments.get(id);
  }

  async updateInvestment(id: string, updates: Partial<Investment>): Promise<Investment | undefined> {
    const existing = this.investments.get(id);
    if (!existing) return undefined;

    const updated: Investment = { ...existing, ...updates };
    this.investments.set(id, updated);
    return updated;
  }

  async deleteInvestment(id: string): Promise<boolean> {
    return this.investments.delete(id);
  }

  // Market data operations (these remain global)
  async upsertMarketData(data: Omit<MarketData, "id" | "lastUpdated">): Promise<MarketData> {
    const id = `market_${data.symbol}`;
    const marketData: MarketData = {
      id,
      ...data,
      lastUpdated: new Date(),
    };
    
    this.marketData.set(data.symbol, marketData);
    return marketData;
  }

  async getMarketData(symbol: string): Promise<MarketData | null> {
    return this.marketData.get(symbol) || null;
  }

  async getAllMarketData(): Promise<MarketData[]> {
    return Array.from(this.marketData.values());
  }

  // Portfolio operations
  async getPortfolioSummary(userId?: string): Promise<PortfolioSummary> {
    const investmentsWithData = await this.getInvestmentsWithCurrentData(userId);
    
    const totalInvested = investmentsWithData.reduce((sum, inv) => sum + inv.amount, 0);
    const totalValue = investmentsWithData.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalGains = totalValue - totalInvested;
    const totalGainsPercent = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;

    return {
      userId,
      totalValue,
      totalInvested,
      totalGains,
      totalGainsPercent,
      lastUpdated: new Date(),
    };
  }

  async getInvestmentsWithCurrentData(userId?: string): Promise<InvestmentWithCurrentData[]> {
    const investments = await this.getInvestments(userId);
    
    return investments.map(investment => {
      const currentMarketData = this.marketData.get(investment.symbol || "SPY");
      const currentPrice = currentMarketData?.price || investment.purchasePrice || 0;
      const shares = investment.amount / (investment.purchasePrice || 1);
      const currentValue = shares * currentPrice;
      const gainLoss = currentValue - investment.amount;
      const gainLossPercent = investment.amount > 0 ? (gainLoss / investment.amount) * 100 : 0;

      return {
        ...investment,
        currentPrice,
        currentValue,
        shares,
        gainLoss,
        gainLossPercent,
        companyName: investment.symbol === "SPY" ? "SPDR S&P 500 ETF Trust" : undefined,
      };
    });
  }

  // User operations
  async createUser(userData: any): Promise<any> {
    this.users.set(userData.id, userData);
    return userData;
  }

  async getUser(userId: string): Promise<any | null> {
    return this.users.get(userId) || null;
  }

  async updateUser(userId: string, updates: any): Promise<any | null> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.users.set(userId, updatedUser);
      return updatedUser;
    }
    return null;
  }

  // Stats and debug
  getStats() {
    return {
      investments: this.investments.size,
      marketData: this.marketData.size,
      users: this.users.size,
    };
  }

  // Clear operations (for testing/development)
  clearAll() {
    this.investments.clear();
    this.marketData.clear();
    this.users.clear();
    console.log("🧹 Storage cleared");
  }

  clearUserData(userId: string) {
    // Remove user's investments
    const userInvestments = Array.from(this.investments.entries())
      .filter(([_, inv]) => inv.userId === userId);
    
    userInvestments.forEach(([id]) => {
      this.investments.delete(id);
    });

    // Remove user record
    this.users.delete(userId);
    
    console.log(`🧹 Cleared data for user ${userId}: ${userInvestments.length} investments`);
  }
}

export const storage = new MemStorage();
