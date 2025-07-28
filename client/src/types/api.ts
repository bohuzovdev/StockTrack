// ===================================================================
// API RESPONSE TYPES - Centralized type definitions for all API responses
// Replaces scattered 'any' types throughout the codebase
// ===================================================================

// Common API Response Structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Error Types
export interface ApiErrorResponse {
  success: false;
  error: string;
  status?: number;
  code?: string;
}

// ===================================================================
// USER & AUTHENTICATION TYPES
// ===================================================================

export interface User {
  id: string;
  googleId: string;
  name: string;
  email: string;
  picture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// ===================================================================
// TOKEN MANAGEMENT TYPES
// ===================================================================

export interface UserApiToken {
  id: string;
  userId: string;
  provider: 'monobank' | 'binance' | 'binance_key' | 'binance_secret' | 'alpha_vantage';
  encryptedToken: string;
  tokenName?: string; // Made optional to match shared/schema.ts
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
}

export interface TokensResponse {
  success: boolean;
  tokens: UserApiToken[];
}

export interface TokenSaveResponse {
  success: boolean;
  token: UserApiToken;
  message: string;
}

export interface TokenDeleteResponse {
  success: boolean;
  message: string;
  removedCount: number;
}

// ===================================================================
// INVESTMENT & PORTFOLIO TYPES
// ===================================================================

export interface Investment {
  id: string;
  userId: string;
  symbol: string;
  amount: number;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  createdAt: string;
  currentPrice?: number;
  currentValue?: number;
  totalGain?: number;
  totalGainPercent?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGains: number;
  totalGainsPercent: number;
  investmentCount: number;
  lastUpdated: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
}

export interface InvestmentsResponse {
  success: boolean;
  investments: Investment[];
}

export interface PortfolioResponse {
  success: boolean;
  portfolio: PortfolioSummary;
}

export interface MarketDataResponse {
  success: boolean;
  marketData: MarketData;
}

export interface CreateInvestmentRequest {
  symbol: string;
  amount: number;
  purchaseDate: string;
}

export interface CreateInvestmentResponse {
  success: boolean;
  investment: Investment;
  message: string;
}

// ===================================================================
// BANKING TYPES (Monobank)
// ===================================================================

export interface BankAccount {
  id: string;
  userId: string;
  accountId: string;
  accountName: string;
  accountType: string;
  balance: number;
  currency: string;
  iban?: string;
  maskedPan?: string;
  provider: 'monobank';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: string;
  userId: string;
  accountId: string;
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  category?: string;
  date: string;
  balance: number;
  mcc?: number;
  provider: 'monobank';
  createdAt: string;
}

export interface BankAccountsResponse {
  success: boolean;
  accounts: BankAccount[];
}

export interface BankTransactionsResponse {
  success: boolean;
  transactions: BankTransaction[];
  account?: BankAccount;
}

export interface MonobankConnectionRequest {
  provider: 'monobank';
}

export interface MonobankTransactionsRequest {
  provider: 'monobank';
  accountId: string;
  from?: string;  // ISO date string
  to?: string;    // ISO date string
}

// ===================================================================
// CRYPTOCURRENCY TYPES (Binance)
// ===================================================================

export interface CryptoAsset {
  asset: string;
  free: string;
  locked: string;
  usdValue?: number;
  usdPrice?: number;
}

export interface CryptoPortfolio {
  totalUsdValue: number;
  assets: CryptoAsset[];
  lastUpdated: string;
}

export interface CryptoAssetsResponse {
  success: boolean;
  portfolio: CryptoPortfolio;
}

export interface CryptoConnectionRequest {
  apiKey: string;
  secretKey: string;
}

export interface CryptoConnectionResponse {
  success: boolean;
  message: string;
  portfolio?: CryptoPortfolio;
}

export interface CryptoTestRequest {
  apiKey: string;
  secretKey: string;
}

export interface CryptoTestResponse {
  success: boolean;
  valid: boolean;
  message: string;
  error?: string;
}

// ===================================================================
// EXTERNAL API TYPES (Alpha Vantage, Binance API, Monobank API)
// ===================================================================

// Alpha Vantage API Response
export interface AlphaVantageGlobalQuote {
  "Global Quote": {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
  };
}

export interface AlphaVantageError {
  "Error Message"?: string;
  "Note"?: string;  // Rate limit message
}

// Binance API Response
export interface BinanceAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: BinanceBalance[];
  permissions: string[];
}

export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

export interface BinanceError {
  code: number;
  msg: string;
}

// Monobank API Response
export interface MonobankClientInfo {
  clientId: string;
  name: string;
  webHookUrl: string;
  permissions: string;
  accounts: MonobankAccount[];
}

export interface MonobankAccount {
  id: string;
  sendId: string;
  balance: number;
  creditLimit: number;
  type: string;
  currencyCode: number;
  cashbackType: string;
  maskedPan: string[];
  iban: string;
}

export interface MonobankTransaction {
  id: string;
  time: number;
  description: string;
  mcc: number;
  originalMcc: number;
  amount: number;
  operationAmount: number;
  currencyCode: number;
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  comment?: string;
  receiptId?: string;
  invoiceId?: string;
  counterEdrpou?: string;
  counterIban?: string;
}

export interface MonobankError {
  errorDescription: string;
}

// ===================================================================
// WEBSOCKET TYPES
// ===================================================================

export interface WebSocketMessage<T = unknown> {
  type: string;
  data?: T;
  timestamp: string;
}

export interface PortfolioUpdateMessage {
  type: 'portfolio_update';
  data: {
    portfolio: PortfolioSummary;
    investments: Investment[];
    marketData: MarketData;
  };
  timestamp: string;
}

export interface MarketUpdateMessage {
  type: 'market_update';
  data: MarketData;
  timestamp: string;
}

// ===================================================================
// FORM TYPES
// ===================================================================

export interface TokenFormData {
  token: string;
  tokenName?: string;
}

export interface CryptoFormData {
  apiKey: string;
  secretKey: string;
}

export interface InvestmentFormData {
  symbol: string;
  amount: number;
  purchaseDate: Date;
}

// ===================================================================
// UTILITY TYPES
// ===================================================================

export type ApiProvider = 'monobank' | 'binance' | 'alpha_vantage';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ConnectionStatus {
  isConnected: boolean;
  provider: ApiProvider;
  lastChecked: string;
  error?: string;
}

// Type guards for runtime type checking
export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  return typeof response === 'object' && 
         response !== null && 
         'success' in response && 
         (response as any).success === false;
}

export function isApiResponse<T>(response: unknown): response is ApiResponse<T> {
  return typeof response === 'object' && 
         response !== null && 
         'success' in response;
} 