import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInvestmentSchema, insertMarketDataSchema } from "@shared/schema";
import { z } from "zod";

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "demo";

export async function registerRoutes(app: Express): Promise<Server> {
  // Investment routes
  app.post("/api/investments", async (req, res) => {
    try {
      const data = insertInvestmentSchema.parse(req.body);
      const investment = await storage.createInvestment(data);
      res.json(investment);
    } catch (error) {
      res.status(400).json({ message: "Invalid investment data", error });
    }
  });

  app.get("/api/investments", async (req, res) => {
    try {
      const investments = await storage.getInvestmentsWithCurrentData();
      res.json(investments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch investments", error });
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

  // Portfolio summary
  app.get("/api/portfolio/summary", async (req, res) => {
    try {
      const summary = await storage.getPortfolioSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch portfolio summary", error });
    }
  });

  // Market data routes
  app.get("/api/market/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      let marketData = await storage.getMarketData(symbol);

      // If no cached data or data is older than 5 minutes, fetch from API
      if (!marketData || (Date.now() - marketData.lastUpdated.getTime()) > 5 * 60 * 1000) {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
          );
          const data = await response.json();

          if (data["Global Quote"]) {
            const quote = data["Global Quote"];
            const price = parseFloat(quote["05. price"]);
            const change = parseFloat(quote["09. change"]);
            const changePercent = parseFloat(quote["10. change percent"].replace("%", ""));

            marketData = await storage.upsertMarketData({
              symbol,
              price,
              change,
              changePercent,
            });
          }
        } catch (apiError) {
          console.error("Failed to fetch market data from Alpha Vantage:", apiError);
          // Return cached data if API fails
          if (marketData) {
            return res.json(marketData);
          }
          return res.status(503).json({ 
            message: "Market data temporarily unavailable",
            error: "Failed to fetch real-time data"
          });
        }
      }

      res.json(marketData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market data", error });
    }
  });

  // S&P 500 data
  app.get("/api/market/sp500", async (req, res) => {
    try {
      let sp500Data = await storage.getMarketData("SPY"); // Using SPY as S&P 500 proxy

      if (!sp500Data || (Date.now() - sp500Data.lastUpdated.getTime()) > 5 * 60 * 1000) {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${ALPHA_VANTAGE_API_KEY}`
          );
          const data = await response.json();

          if (data["Global Quote"]) {
            const quote = data["Global Quote"];
            const price = parseFloat(quote["05. price"]);
            const change = parseFloat(quote["09. change"]);
            const changePercent = parseFloat(quote["10. change percent"].replace("%", ""));

            sp500Data = await storage.upsertMarketData({
              symbol: "SPY",
              price,
              change,
              changePercent,
            });
          }
        } catch (apiError) {
          console.error("Failed to fetch S&P 500 data:", apiError);
          if (sp500Data) {
            return res.json(sp500Data);
          }
          return res.status(503).json({ 
            message: "S&P 500 data temporarily unavailable",
            error: "Failed to fetch real-time data"
          });
        }
      }

      res.json(sp500Data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch S&P 500 data", error });
    }
  });

  // Update all market data for existing investments
  app.post("/api/market/refresh", async (req, res) => {
    try {
      const investments = await storage.getInvestments();
      const symbols = [...new Set(investments.map(inv => inv.symbol))];
      const results = [];

      for (const symbol of symbols) {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
          );
          const data = await response.json();

          if (data["Global Quote"]) {
            const quote = data["Global Quote"];
            const marketData = await storage.upsertMarketData({
              symbol,
              price: parseFloat(quote["05. price"]),
              change: parseFloat(quote["09. change"]),
              changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
            });
            results.push(marketData);
          }
        } catch (error) {
          console.error(`Failed to update data for ${symbol}:`, error);
        }
      }

      res.json({ message: "Market data refreshed", updated: results.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to refresh market data", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
