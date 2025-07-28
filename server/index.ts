// Load environment variables first
import dotenv from "dotenv";
dotenv.config();

import express, { type Request, type Response } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupWebSocket } from "./websocket";
import session from "express-session";
import passport from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Auth routes
app.get('/auth/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req: Request, res: Response) => {
    // Successful authentication
    const user = req.user as any;
    console.log(`🎉 User authenticated: ${user?.name} (${user?.email})`);
    res.redirect('/');
  }
);

app.get('/auth/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.redirect('/');
  });
});

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

  // Set up Vite or static serving
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.NODE_ENV === 'development' ? '127.0.0.1' : '0.0.0.0';
  server.listen(port, host, () => {
    log(`serving on port ${port}`);
  });
})();
