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

// User Schema for Google OAuth
export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

// User API Tokens - encrypted storage for user-specific API keys
export interface UserApiToken {
  id: string;
  userId: string;
  provider: 'monobank' | 'binance' | 'binance_key' | 'binance_secret' | 'alpha_vantage'; // extensible for future APIs
  encryptedToken: string;
  tokenName?: string; // e.g., "My Trading Account"
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

// Crypto Assets - from Binance API
export interface CryptoAsset {
  asset: string; // BTC, ETH, USDT, etc.
  free: string; // Available balance
  locked: string; // Locked in orders
  total: number; // Total balance (free + locked)
  usdValue?: number; // USD equivalent value
}

export interface CryptoPortfolio {
  userId: string;
  assets: CryptoAsset[];
  totalUsdValue: number;
  lastUpdated: string;
  provider: 'binance'; // Can extend for other exchanges
}

// User Crypto Accounts - for future multi-exchange support
export interface UserCryptoAccount {
  id: string;
  userId: string;
  provider: 'binance';
  accountName: string; // e.g., "Main Trading Account"
  apiKeyId: string; // Reference to encrypted API key
  isActive: boolean;
  createdAt: Date;
  lastSyncAt?: Date;
}

// Updated Investment type to include userId (extends the DB schema)
export type Investment = typeof investments.$inferSelect & {
  userId?: string; // Will be added to DB schema
};
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;

// Updated PortfolioSummary to be user-specific
export interface PortfolioSummary {
  userId?: string; // Will be user-specific after auth
  totalValue: number;
  totalInvested: number;
  totalGains: number;
  totalGainsPercent: number;
  lastUpdated?: Date;
}

export interface InvestmentWithCurrentData extends Investment {
  currentPrice: number;
  currentValue: number; // Current value of the investment
  shares: number; // Calculated shares based on amount/purchasePrice
  gainLoss: number;
  gainLossPercent: number;
  companyName?: string;
}

// User-specific Banking Account
export interface UserBankAccount {
  id: string;
  userId: string;
  provider: string; // 'monobank', future: 'privatbank', etc.
  accountId: string; // Provider's account ID
  accountName: string;
  accountType: string;
  currency: string;
  isActive: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
}

// User-specific Banking Transaction
export interface UserBankTransaction {
  id: string;
  userId: string;
  userBankAccountId: string;
  providerTransactionId: string;
  time: number; // Unix timestamp
  description: string;
  amount: number;
  currency: string;
  balance: number;
  category?: string;
  tags?: string[];
  notes?: string;
  createdAt: Date;
}

// Auth Session
export interface AuthSession {
  id: string;
  userId: string;
  sessionToken: string;
  expires: Date;
  createdAt: Date;
}

// API Response wrapper with user context
export interface AuthenticatedApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

// Auth request types
export interface AuthRequest extends Request {
  user?: User;
  session?: AuthSession;
}
