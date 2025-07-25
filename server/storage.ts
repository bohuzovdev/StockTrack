import { type Investment, type InsertInvestment, type MarketData, type InsertMarketData, type PortfolioSummary, type InvestmentWithCurrentData } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Investment operations
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  getInvestments(): Promise<Investment[]>;
  getInvestment(id: string): Promise<Investment | undefined>;
  updateInvestment(id: string, investment: Partial<InsertInvestment>): Promise<Investment | undefined>;
  deleteInvestment(id: string): Promise<boolean>;

  // Market data operations
  upsertMarketData(marketData: InsertMarketData): Promise<MarketData>;
  getMarketData(symbol: string): Promise<MarketData | undefined>;
  getAllMarketData(): Promise<MarketData[]>;

  // Portfolio operations
  getPortfolioSummary(): Promise<PortfolioSummary>;
  getInvestmentsWithCurrentData(): Promise<InvestmentWithCurrentData[]>;
}

export class MemStorage implements IStorage {
  private investments: Map<string, Investment>;
  private marketData: Map<string, MarketData>;

  constructor() {
    this.investments = new Map();
    this.marketData = new Map();
  }

  async createInvestment(insertInvestment: InsertInvestment): Promise<Investment> {
    const id = randomUUID();
    const investment: Investment = {
      ...insertInvestment,
      symbol: "SPY", // Always S&P 500
      id,
      createdAt: new Date(),
    };
    this.investments.set(id, investment);
    return investment;
  }

  async getInvestments(): Promise<Investment[]> {
    return Array.from(this.investments.values());
  }

  async getInvestment(id: string): Promise<Investment | undefined> {
    return this.investments.get(id);
  }

  async updateInvestment(id: string, updates: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const existing = this.investments.get(id);
    if (!existing) return undefined;

    const updated: Investment = { ...existing, ...updates };
    this.investments.set(id, updated);
    return updated;
  }

  async deleteInvestment(id: string): Promise<boolean> {
    return this.investments.delete(id);
  }

  async upsertMarketData(insertMarketData: InsertMarketData): Promise<MarketData> {
    const id = randomUUID();
    const data: MarketData = {
      ...insertMarketData,
      id,
      lastUpdated: new Date(),
    };
    this.marketData.set(insertMarketData.symbol, data);
    return data;
  }

  async getMarketData(symbol: string): Promise<MarketData | undefined> {
    return this.marketData.get(symbol);
  }

  async getAllMarketData(): Promise<MarketData[]> {
    return Array.from(this.marketData.values());
  }

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const investments = await this.getInvestments();
    const investmentsWithData = await this.getInvestmentsWithCurrentData();

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalValue = investmentsWithData.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalGains = totalValue - totalInvested;
    const totalGainsPercent = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalGains,
      totalGainsPercent,
    };
  }

  async getInvestmentsWithCurrentData(): Promise<InvestmentWithCurrentData[]> {
    const investments = await this.getInvestments();
    const result: InvestmentWithCurrentData[] = [];

    for (const investment of investments) {
      const marketData = await this.getMarketData(investment.symbol);
      const currentPrice = marketData?.price || investment.purchasePrice;
      const shares = investment.amount / investment.purchasePrice; // Calculate shares from USD amount
      const currentValue = shares * currentPrice;
      const gainLoss = currentValue - investment.amount;
      const gainLossPercent = investment.amount > 0 ? (gainLoss / investment.amount) * 100 : 0;

      result.push({
        ...investment,
        currentPrice,
        currentValue,
        shares,
        gainLoss,
        gainLossPercent,
      });
    }

    return result;
  }
}

export const storage = new MemStorage();
