import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const investments = pgTable("investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  shares: real("shares").notNull(),
  purchasePrice: real("purchase_price").notNull(),
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
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  companyName?: string;
}
