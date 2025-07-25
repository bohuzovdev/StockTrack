import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const investments = pgTable("investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().default("SPY"), // Default to S&P 500
  amount: real("amount").notNull(), // USD amount invested
  purchasePrice: real("purchase_price").notNull(), // Price of SPY at time of purchase
  purchaseDate: timestamp("purchase_date").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  price: real("price").notNull(),
  change: real("change").notNull(),
  changePercent: real("change_percent").notNull(),
  lastUpdated: timestamp("last_updated").default(sql`now()`),
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  symbol: true, // Symbol is auto-set to SPY
  purchasePrice: true, // Auto-set from current S&P 500 price
  purchaseDate: true, // Auto-set to current date
  createdAt: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  lastUpdated: true,
});

export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGains: number;
  totalGainsPercent: number;
}

export interface InvestmentWithCurrentData extends Investment {
  currentPrice: number;
  currentValue: number; // Current value of the investment
  shares: number; // Calculated shares based on amount/purchasePrice
  gainLoss: number;
  gainLossPercent: number;
  companyName?: string;
}
