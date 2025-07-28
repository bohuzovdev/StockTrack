import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInvestmentSchema, insertMarketDataSchema } from "@shared/schema";
import { z } from "zod";
import { bankingService } from "./banking";
import { validateTokenSecurity, hashTokenForLogging, TokenRateLimit, SecureEnv } from "./crypto";
import { userTokenService } from "./user-tokens";

// Fallback Alpha Vantage API key (from environment) - used only if user doesn't have their own
const FALLBACK_ALPHA_VANTAGE_API_KEY = SecureEnv.get('ALPHA_VANTAGE_API_KEY') || "demo";

// Simple auth middleware check
const requireAuth = (req: any, res: any, next: any) => {
  if (req.user) {
    return next();
  }
  return res.status(401).json({ 
    success: false, 
    error: "Authentication required. Please login first.",
    loginUrl: "/auth/google"
  });
};

// Optional auth (adds user context but doesn't require it)
const addUserContext = (req: any, res: any, next: any) => {
  // User is added automatically by passport session if authenticated
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint - no authentication required
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Simple root endpoint
  app.get("/", (req, res) => {
    res.status(200).json({
      message: "PFT API Server",
      status: "running",
      timestamp: new Date().toISOString()
    });
  });
  
  // User API Token Management Routes
  app.post("/api/user/tokens", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { provider, token, tokenName } = req.body;

      if (!provider || !token) {
        return res.status(400).json({ error: "Provider and token are required" });
      }

      // Validate token format first
      const tokenValidation = validateTokenSecurity(token);
      if (!tokenValidation.isValid) {
        return res.status(400).json({
          error: "Invalid token format",
          reason: tokenValidation.reason
        });
      }

      // Test token validity
      const validityCheck = await userTokenService.testTokenValidity(provider, token);
      if (!validityCheck.valid) {
        return res.status(400).json({
          error: "Token validation failed",
          reason: validityCheck.error
        });
      }

      // Store the token
      const userToken = await userTokenService.setUserToken(user.id, provider, token, tokenName);

      res.json({
        success: true,
        token: {
          id: userToken.id,
          provider: userToken.provider,
          tokenName: userToken.tokenName,
          createdAt: userToken.createdAt,
          isActive: userToken.isActive
        }
      });
    } catch (error: any) {
      console.error("User token creation error:", error);
      res.status(500).json({ error: "Failed to save API token" });
    }
  });

  // Get all user tokens (without decrypting them)
  app.get("/api/user/tokens", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.googleId; // Use googleId as userId
      console.log(`📋 Fetching API tokens for user ${userId}`);
      
      const tokens = await userTokenService.getUserTokens(userId);
      
      res.json({
        success: true,
        tokens: tokens.map(token => ({
          id: token.id,
          provider: token.provider,
          tokenName: token.tokenName,
          isActive: token.isActive,
          createdAt: token.createdAt,
          lastUsedAt: token.lastUsedAt
          // encryptedToken is excluded for security
        }))
      });
    } catch (error) {
      console.error("Failed to fetch user tokens:", error);
      res.status(500).json({ error: "Failed to fetch tokens" });
    }
  });

  // Delete a specific user token
  app.delete("/api/user/tokens/:provider", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.googleId; // Use googleId as userId
      const provider = req.params.provider as 'monobank' | 'binance' | 'alpha_vantage';
      
      console.log(`🗑️ Deleting ${provider} token for user ${userId}`);
      
      const success = await userTokenService.deleteUserToken(userId, provider);
      
      if (success) {
        res.json({ success: true, message: `${provider} token deleted successfully` });
      } else {
        res.status(404).json({ error: "Token not found" });
      }
    } catch (error) {
      console.error("Failed to delete user token:", error);
      res.status(500).json({ error: "Failed to delete token" });
    }
  });

  // Force clear all tokens for a user (emergency cleanup)
  app.delete("/api/user/tokens/clear-all", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.googleId; // Use googleId as userId
      
      console.log(`🚮 Emergency: Force clearing all tokens for user ${userId}`);

      // Clear all tokens for this user
      const removedCount = await userTokenService.clearAllTokensForUser(userId);

      res.json({
        success: true,
        message: `Successfully cleared ${removedCount} tokens`,
        removedCount
      });
    } catch (error: any) {
      console.error("Failed to clear all tokens:", error);
      res.status(500).json({ error: error.message || "Failed to clear tokens" });
    }
  });

  // Reset corrupted tokens globally (admin/debug endpoint - DEVELOPMENT ONLY)
  if (process.env.NODE_ENV === 'development') {
    app.post("/api/admin/reset-corrupted-tokens", requireAuth, async (req, res) => {
      try {
        console.log(`🔄 Global token cleanup requested by user ${req.user!.googleId}`);

        // Reset all corrupted tokens globally
        const removedCount = await userTokenService.resetAllCorruptedTokens();

        res.json({
          success: true,
          message: `Successfully removed ${removedCount} corrupted tokens globally`,
          removedCount
        });
      } catch (error: any) {
        console.error("Failed to reset corrupted tokens:", error);
        res.status(500).json({ error: error.message || "Failed to reset corrupted tokens" });
      }
    });
  }

  // Investment routes - require authentication
  app.post("/api/investments", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertInvestmentSchema.parse(req.body);
      
      // Get current S&P 500 price for purchase price
      let sp500Data = await storage.getMarketData("SPY");
      if (!sp500Data) {
        // Initialize with current market data if not available - using S&P 500 index values instead of SPY ETF
        sp500Data = await storage.upsertMarketData({
          symbol: "SPY",
          price: 6375.47,
          change: 25.30,
          changePercent: 0.40,
        });
      }
      
      const investmentData = {
        ...data,
        symbol: "SPY",
        purchasePrice: sp500Data.price,
        purchaseDate: data.purchaseDate || new Date(),
        createdAt: new Date(),
        userId: user.id // Associate with authenticated user
      };
      
      const investment = await storage.createInvestment(investmentData);
      
      res.json(investment);
    } catch (error: any) {
      console.error("Investment creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create investment" });
    }
  });

  app.get("/api/investments", requireAuth, async (req, res) => {
    const user = req.user as any;
    try {
      // Get only investments for the authenticated user
      const investments = await storage.getInvestments(user.id);
      res.json(investments);
    } catch (error) {
      console.error("Error fetching investments:", error);
      res.status(500).json({ error: "Failed to fetch investments" });
    }
  });

  app.get("/api/investments/:id", async (req, res) => {
    try {
      const investment = await storage.getInvestment(req.params.id);
      if (!investment) {
        return res.status(404).json({ message: "Investment not found" });
      }
      res.json(investment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch investment", error });
    }
  });

  app.put("/api/investments/:id", async (req, res) => {
    try {
      const updates = insertInvestmentSchema.partial().parse(req.body);
      const investment = await storage.updateInvestment(req.params.id, updates);
      if (!investment) {
        return res.status(404).json({ message: "Investment not found" });
      }
      res.json(investment);
    } catch (error) {
      res.status(400).json({ message: "Invalid investment data", error });
    }
  });

  app.delete("/api/investments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvestment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Investment not found" });
      }
      res.json({ message: "Investment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete investment", error });
    }
  });

  // Portfolio summary - require authentication
  app.get("/api/portfolio/summary", requireAuth, async (req, res) => {
    const user = req.user as any;
    try {
      // Get user-specific portfolio summary
      const summary = await storage.getPortfolioSummary(user.id);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching portfolio summary:", error);
      res.status(500).json({ error: "Failed to fetch portfolio summary" });
    }
  });

  // Market data routes - now use user-specific Alpha Vantage tokens
  app.get("/api/market/sp500", addUserContext, async (req, res) => {
    try {
      let sp500Data = await storage.getMarketData("SPY"); // Using SPY as S&P 500 proxy
      if (!sp500Data) {
        // Initialize with fallback data if not available
        sp500Data = await storage.upsertMarketData({
          symbol: "SPY",
          price: 6375.47,
          change: 25.30,
          changePercent: 0.40,
        });
      }
      res.json(sp500Data);
    } catch (error) {
      console.error("Error fetching S&P 500 data:", error);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // Generic market data route - now uses user-specific Alpha Vantage token
  app.get("/api/market/:symbol", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const symbol = req.params.symbol.toUpperCase();
      let marketData = await storage.getMarketData(symbol);
      
      if (!marketData) {
        // Try to fetch from Alpha Vantage using user's token
        const userAlphaToken = await userTokenService.getUserToken(user.id, 'alpha_vantage');
        const apiKey = userAlphaToken || FALLBACK_ALPHA_VANTAGE_API_KEY;
        
        if (!apiKey || apiKey === "demo") {
          return res.status(400).json({ 
            error: "Alpha Vantage API key required",
            message: "Please add your Alpha Vantage API key to access real-time market data",
            requiresToken: true,
            provider: "alpha_vantage"
          });
        }

        console.log(`🔍 Fetching ${symbol} data from Alpha Vantage for user ${user.id}`);
        
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
          );
          const data = await response.json();
          
          if (data["Error Message"] || data["Note"]) {
            throw new Error(data["Error Message"] || "API rate limit exceeded");
          }
          
          const quote = data["Global Quote"];
          if (quote) {
            marketData = await storage.upsertMarketData({
              symbol: symbol,
              price: parseFloat(quote["05. price"]),
              change: parseFloat(quote["09. change"]),
              changePercent: parseFloat(quote["10. change percent"].replace('%', '')),
            });
          } else {
            throw new Error("Invalid symbol or no data available");
          }
        } catch (apiError) {
          console.error(`Alpha Vantage API error for ${symbol}:`, apiError);
          const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error';
          return res.status(500).json({ 
            error: "Failed to fetch market data from Alpha Vantage", 
            details: errorMessage 
          });
        }
      }
      
      res.json(marketData);
    } catch (error) {
      console.error("Error fetching market data:", error);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // Banking API Routes - now use user-specific Monobank tokens
  app.post("/api/banking/test", requireAuth, async (req, res) => {
    const user = req.user as any;
    const { provider, token } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      if (!provider || !token) {
        return res.status(400).json({ error: "Provider and token are required" });
      }

      // Rate limiting
      if (!TokenRateLimit.checkLimit(clientIp, 10, 300000)) {
        return res.status(429).json({ error: "Too many authentication attempts. Please try again later." });
      }

      // Validate token security
      const tokenValidation = validateTokenSecurity(token);
      if (!tokenValidation.isValid) {
        return res.status(400).json({
          error: "Invalid token format",
          reason: tokenValidation.reason
        });
      }

      const tokenHash = hashTokenForLogging(token);
      console.log(`🔐 Banking test connection attempt for user ${user.id} with ${provider} token ${tokenHash} (strength: ${tokenValidation.strength})`);

      const isValid = await bankingService.testConnection(provider, token);

      if (isValid) {
        TokenRateLimit.reset(clientIp);
        console.log(`✅ Banking connection successful for user ${user.id} with ${provider} token ${tokenHash}`);
        
        // Optionally store the token if validation succeeds
        // await userTokenService.setUserToken(user.id, provider, token);
      } else {
        console.log(`❌ Banking connection failed for user ${user.id} with ${provider} token ${tokenHash}`);
      }

      res.json({ valid: isValid, strength: tokenValidation.strength });
    } catch (error: any) {
      console.error(`Banking test connection error for user ${user.id}:`, error);
      res.status(500).json({ error: "Failed to test connection", details: error.message });
    }
  });

  app.post("/api/banking/accounts", requireAuth, async (req, res) => {
    const user = req.user as any;
    const { provider, token } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      // Check if user has stored token, use it if provided token is not given
      let bankingToken = token;
      if (!bankingToken) {
        bankingToken = await userTokenService.getUserToken(user.id, provider);
        if (!bankingToken) {
          return res.status(400).json({ 
            error: "No banking token found", 
            message: "Please connect your banking account first",
            requiresToken: true,
            provider: provider
          });
        }
      }

      if (!provider) {
        return res.status(400).json({ error: "Provider is required" });
      }

      // Rate limiting for account fetching
      if (!TokenRateLimit.checkLimit(`${clientIp}-accounts`, 30, 300000)) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }

      const bankProvider = bankingService.getProvider(provider);
      if (!bankProvider) {
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
      }

      const tokenHash = hashTokenForLogging(bankingToken);
      console.log(`💳 Fetching accounts for user ${user.id} with ${provider} token ${tokenHash}`);

      const accounts = await bankProvider.getAccounts(bankingToken);

      console.log(`📊 Retrieved ${accounts.length} accounts for user ${user.id} with ${provider}`);

      res.json({ accounts });
    } catch (error: any) {
      console.error(`Banking accounts fetch error for user ${user.id}:`, error);
      res.status(500).json({ error: "Failed to fetch accounts", details: error.message });
    }
  });

  app.post("/api/banking/transactions", requireAuth, async (req, res) => {
    const user = req.user as any;
    const { provider, token, accountId, from, to } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      // Check if user has stored token, use it if provided token is not given  
      let bankingToken = token;
      if (!bankingToken) {
        bankingToken = await userTokenService.getUserToken(user.id, provider);
        if (!bankingToken) {
          return res.status(400).json({ 
            error: "No banking token found", 
            message: "Please connect your banking account first",
            requiresToken: true,
            provider: provider
          });
        }
      }

      if (!provider || !accountId) {
        return res.status(400).json({ error: "Provider and accountId are required" });
      }

      // Rate limiting for transaction fetching (stricter due to API limits)
      if (!TokenRateLimit.checkLimit(`${clientIp}-transactions`, 10, 600000)) {
        return res.status(429).json({ error: "Too many transaction requests. Please try again later." });
      }

      const bankProvider = bankingService.getProvider(provider);
      if (!bankProvider) {
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
      }

      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;

      const tokenHash = hashTokenForLogging(bankingToken);
      console.log(`💰 Fetching transactions for user ${user.id} with ${provider} account ${accountId} token ${tokenHash}`);

      const transactions = await bankProvider.getTransactions(bankingToken, accountId, fromDate, toDate);

      console.log(`📈 Retrieved ${transactions.length} transactions for user ${user.id} with ${provider} account ${accountId}`);

      res.json({ transactions });
    } catch (error: any) {
      console.error(`Banking transactions fetch error for user ${user.id}:`, error);
      res.status(500).json({ error: "Failed to fetch transactions", details: error.message });
    }
  });

  app.get("/api/banking/providers", async (req, res) => {
    try {
      const providers = bankingService.listProviders();
      res.json({ providers });
    } catch (error: any) {
      console.error(`Banking providers fetch error:`, error);
      res.status(500).json({ error: "Failed to list providers", details: error.message });
    }
  });

  // Update all market data for existing investments - now user-specific
  app.post("/api/market/refresh", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const investments = await storage.getInvestments(user.id);
      const symbols = Array.from(new Set(investments.map(inv => inv.symbol)));
      const results = [];

      // Try to use user's Alpha Vantage token for refresh
      const userAlphaToken = await userTokenService.getUserToken(user.id, 'alpha_vantage');
      const apiKey = userAlphaToken || FALLBACK_ALPHA_VANTAGE_API_KEY;

      if (!apiKey || apiKey === "demo") {
        return res.status(400).json({ 
          error: "Alpha Vantage API key required for market data refresh",
          message: "Please add your Alpha Vantage API key to refresh market data",
          requiresToken: true,
          provider: "alpha_vantage"
        });
      }

      for (const symbol of symbols) {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
          );
          const data = await response.json();
          
          if (data["Global Quote"] && data["Global Quote"]["05. price"]) {
            const quote = data["Global Quote"];
            await storage.upsertMarketData({
              symbol: symbol,
              price: parseFloat(quote["05. price"]),
              change: parseFloat(quote["09. change"] || "0"),
              changePercent: parseFloat((quote["10. change percent"] || "0%").replace("%", "")),
            });
            results.push({ symbol, status: "success" });
          } else {
            results.push({ symbol, status: "failed", reason: "Invalid data" });
          }
        } catch (error) {
          results.push({ symbol, status: "failed", reason: "API error" });
        }
      }

      console.log(`📊 Market data refresh completed for user ${user.id}: ${results.length} symbols processed`);
      res.json({ message: "Market data refresh completed", results });
    } catch (error: any) {
      console.error("Market data refresh error:", error);
      res.status(500).json({ error: "Failed to refresh market data" });
    }
  });

  // Manual market data update endpoint for immediate updates - require authentication
  app.post("/api/market/force-update", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      // Force update S&P 500 data with current index values
      const sp500Data = await storage.upsertMarketData({
        symbol: "SPY",
        price: 6375.47,
        change: 25.30,
        changePercent: 0.40,
      });

      console.log(`🔄 Manual S&P 500 data update triggered by user ${user.id}`);
      res.json({ message: "Market data force updated", data: sp500Data });
    } catch (error: any) {
      console.error("Force update error:", error);
      res.status(500).json({ error: "Failed to force update market data" });
    }
  });

  // WebSocket and rate limiting status endpoints - require authentication
  app.get("/api/websocket/status", requireAuth, (req, res) => {
    try {
      const status = getWebSocketStatus();
      res.json(status);
    } catch (error: any) {
      console.error("WebSocket status error:", error);
      res.status(500).json({ error: "Failed to get WebSocket status" });
    }
  });

  app.post("/api/websocket/trigger-update", requireAuth, async (req, res) => {
    try {
      const result = triggerManualUpdate();
      res.json(result);
    } catch (error: any) {
      console.error("WebSocket trigger update error:", error);
      res.status(500).json({ error: "Failed to trigger update" });
    }
  });

  // User token statistics endpoint
  app.get("/api/user/tokens/stats", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const stats = userTokenService.getUserTokenStats(user.id);
      res.json({ success: true, stats });
    } catch (error: any) {
      console.error("User token stats error:", error);
      res.status(500).json({ error: "Failed to get token statistics" });
    }
  });

  // Crypto/Binance routes - require authentication
  app.post("/api/crypto/assets", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.googleId; // Use googleId as userId
      const { provider } = req.body;
      
      if (provider !== 'binance') {
        return res.status(400).json({ error: "Only Binance provider is currently supported" });
      }

      console.log(`🟡 Fetching crypto assets for user ${userId} from ${provider}`);

      // Get user's Binance API credentials
      const apiKey = await userTokenService.getUserToken(userId, 'binance_key');
      const secretKey = await userTokenService.getUserToken(userId, 'binance_secret');

      if (!apiKey || !secretKey) {
        return res.status(404).json({ 
          error: "Binance API credentials not found. Please connect your Binance account first." 
        });
      }

      // Import Binance service
      const { binanceService } = await import("./binance");
      
      // Fetch crypto assets
      const portfolio = await binanceService.getAccountAssets(apiKey, secretKey);
      
      console.log(`🟡 Retrieved ${portfolio.assets.length} crypto assets for user ${userId}`);
      
      res.json({
        success: true,
        portfolio: {
          ...portfolio,
          userId,
          provider: 'binance'
        }
      });
    } catch (error: any) {
      console.error("Crypto assets fetch error for user", req.user?.googleId, ":", error);
      
      if (error.message.includes('rate limit')) {
        res.status(429).json({ error: error.message });
      } else if (error.message.includes('credentials') || error.message.includes('401')) {
        res.status(401).json({ error: "Invalid Binance API credentials. Please check your API key and secret." });
      } else {
        res.status(500).json({ error: error.message || "Failed to fetch crypto assets" });
      }
    }
  });

  // Test Binance API connection
  app.post("/api/crypto/test-connection", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.googleId; // Use googleId as userId
      const { apiKey, secretKey } = req.body;

      if (!apiKey || !secretKey) {
        return res.status(400).json({ error: "API key and secret key are required" });
      }

      console.log(`🧪 Testing Binance API connection for user ${userId}`);

      // Import Binance service
      const { binanceService } = await import("./binance");
      
      // Test connection
      const isValid = await binanceService.testConnection(apiKey, secretKey);
      
      if (isValid) {
        res.json({ 
          success: true, 
          message: "Binance API connection successful",
          valid: true 
        });
      } else {
        res.status(401).json({ 
          error: "Invalid Binance API credentials",
          valid: false 
        });
      }
    } catch (error: any) {
      console.error("Binance connection test error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to test Binance connection",
        valid: false 
      });
    }
  });

  // Save Binance API credentials (requires both API key and secret)
  app.post("/api/crypto/connect", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.googleId; // Use googleId as userId
      const { apiKey, secretKey, accountName } = req.body;

      if (!apiKey || !secretKey) {
        return res.status(400).json({ error: "Both API key and secret key are required" });
      }

      console.log(`🔐 Saving Binance API credentials for user ${userId}`);

      // Test credentials first
      const { binanceService } = await import("./binance");
      const isValid = await binanceService.testConnection(apiKey, secretKey);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid Binance API credentials" });
      }

      // Save both API key and secret as separate tokens
      const apiKeyToken = await userTokenService.setUserToken(
        userId, 
        'binance_key' as any, 
        apiKey, 
        accountName ? `${accountName} - API Key` : 'Binance API Key'
      );

      const secretKeyToken = await userTokenService.setUserToken(
        userId, 
        'binance_secret' as any, 
        secretKey, 
        accountName ? `${accountName} - Secret Key` : 'Binance Secret Key'
      );

      console.log(`✅ Binance API credentials saved for user ${userId}`);

      res.json({
        success: true,
        message: "Binance API credentials saved successfully",
        apiKeyId: apiKeyToken.id,
        secretKeyId: secretKeyToken.id
      });
    } catch (error: any) {
      console.error("Failed to save Binance credentials:", error);
      res.status(500).json({ error: error.message || "Failed to save Binance credentials" });
    }
  });

  // Disconnect Binance account (remove both API key and secret)
  app.delete("/api/crypto/disconnect", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.googleId; // Use googleId as userId
      
      console.log(`🗑️ Disconnecting Binance account for user ${userId}`);

      // Delete both API key and secret tokens
      const keyDeleted = await userTokenService.deleteUserToken(userId, 'binance_key' as any);
      const secretDeleted = await userTokenService.deleteUserToken(userId, 'binance_secret' as any);

      if (keyDeleted || secretDeleted) {
        console.log(`✅ Binance account disconnected for user ${userId}`);
        res.json({ 
          success: true, 
          message: "Binance account disconnected successfully" 
        });
      } else {
        res.status(404).json({ error: "No Binance credentials found to delete" });
      }
    } catch (error: any) {
      console.error("Failed to disconnect Binance account:", error);
      res.status(500).json({ error: error.message || "Failed to disconnect Binance account" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

