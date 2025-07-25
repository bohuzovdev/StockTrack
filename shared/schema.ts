import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, serial, boolean, integer, decimal } from "drizzle-orm/pg-core";
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

export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 256 }), // For future user system
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  accountNumber: varchar("account_number", { length: 50 }),
  accountType: varchar("account_type", { length: 20 }).default("checking"), // checking, savings, credit
  currency: varchar("currency", { length: 3 }).default("UAH"),
  isActive: boolean("is_active").default(true),
  apiToken: varchar("api_token", { length: 500 }), // For Monobank or other APIs
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => bankAccounts.id),
  externalId: varchar("external_id", { length: 100 }), // Bank's transaction ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("UAH"),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  transactionDate: timestamp("transaction_date").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }),
  isExpense: boolean("is_expense").default(true),
  syncedAt: timestamp("synced_at").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  symbol: true, // Symbol is auto-set to SPY
  purchasePrice: true, // Auto-set from current S&P 500 price
  createdAt: true,
}).extend({
  purchaseDate: z.union([z.string(), z.date()]).optional().transform((val) => {
    if (!val) return undefined;
    const date = typeof val === 'string' ? new Date(val) : val;
    if (date > new Date()) {
      throw new Error("Purchase date cannot be in the future");
    }
    return date;
  })
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
