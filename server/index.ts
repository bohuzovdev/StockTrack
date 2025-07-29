// Load environment variables first
import dotenv from "dotenv";

dotenv.config();

import express, { type Request, type Response } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupWebSocket } from "./websocket";
import session from "express-session";
import passport, { isOAuthConfigured } from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CRITICAL: Health check middleware BEFORE everything else
app.use('/health', (req, res, next) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Only configure OAuth if credentials are provided
if (isOAuthConfigured) {
  console.log('✅ Google OAuth configured successfully');
} else {
  console.log('⚠️ Google OAuth not configured - authentication disabled');
  console.log('💡 To enable authentication, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables');
}

app.get('/api/auth/me', (req: Request, res: Response) => {
  if (req.user) {
    res.json({ 
      success: true, 
      user: req.user 
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: "Not authenticated" 
    });
  }
});

(async () => {
  try {
    // Only clear tokens if explicitly requested via environment variable
    // This prevents losing tokens on every server restart during development
    if (process.env.CLEAR_TOKENS_ON_STARTUP === 'true') {
      const { userTokenService } = await import("./user-tokens");
      await userTokenService.clearAllTokensOnStartup();
      console.log('🧹 Token clearing was explicitly requested via CLEAR_TOKENS_ON_STARTUP=true');
    }
    
    // Setup WebSocket server
    setupWebSocket();
    log("WebSocket server initialized on separate port with rate limiting");
    
    // Register API routes and get server
    const server = await registerRoutes(app);
    log("API routes registered successfully");

    // Set up Vite or static serving
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
      log("Vite development server configured");
    } else {
      serveStatic(app);
      log("Static file serving configured");
    }

    // Start server
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = '0.0.0.0'; // Railway requires binding to all interfaces
    
    server.listen(port, host, () => {
      log(`🚀 Server running on ${host}:${port} in ${process.env.NODE_ENV || 'development'} mode`);
      log(`💚 Health check available at: http://${host}:${port}/health`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        log('✅ Server closed');
        process.exit(0);
      });
    });

    // Add process monitoring for Railway
    process.on('SIGINT', () => {
      log('🛑 SIGINT received, shutting down gracefully');
      server.close(() => {
        log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Promise Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
