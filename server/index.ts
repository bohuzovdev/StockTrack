// Load environment variables first
import dotenv from "dotenv";

dotenv.config();

// RAILWAY DEBUG: Log startup information immediately
console.log("🚀 RAILWAY DEBUG: Starting PFT server...");
console.log("🐳 DOCKER: Container starting...");
console.log("🔧 NODE_ENV:", process.env.NODE_ENV);
console.log("🔧 PORT:", process.env.PORT || "3000");
console.log("🔧 GOOGLE_CLIENT_ID exists:", !!process.env.GOOGLE_CLIENT_ID);
console.log("🔧 Working directory:", process.cwd());
console.log("🔧 Railway timestamp:", new Date().toISOString());
console.log("🐳 Docker deployment with explicit container control");

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
  console.log("🚨 RAILWAY HEALTH CHECK HIT - Pre-middleware");
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    source: "pre-middleware-railway-debug",
    railway: true
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

// Auth routes - only if OAuth is configured
if (isOAuthConfigured) {
  app.get('/auth/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      // Successful authentication
      console.log('🎉 User authenticated:', req.user);
      res.redirect('/');
    }
  );

  app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/');
    });
  });
} else {
  // Provide fallback routes when OAuth is not configured
  app.get('/auth/google', (req, res) => {
    res.status(503).json({ 
      error: 'Authentication not configured', 
      message: 'Google OAuth credentials not found. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' 
    });
  });

  app.get('/auth/google/callback', (req, res) => {
    res.redirect('/?error=auth_not_configured');
  });

  app.get('/auth/logout', (req, res) => {
    res.redirect('/');
  });
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
      log(`🌐 Railway URL: https://pft.railway.app`);
      log(`📊 Environment variables loaded: ${Object.keys(process.env).length}`);
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
