// Load environment variables
import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "@shared/schema";
import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: User;
  isAuthenticated?: () => boolean;
  logout?: (callback?: (err: any) => void) => void;
}

// In-memory user storage (replace with database in production)
const usersByGoogleId = new Map<string, any>();
const usersById = new Map<string, any>();

// Debug: Check if environment variables are loaded
const hasGoogleCredentials = !!(
  process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_SECRET && 
  process.env.GOOGLE_CLIENT_ID.trim() !== '' && 
  process.env.GOOGLE_CLIENT_SECRET.trim() !== ''
);
console.log('🔧 Debug - GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
console.log('🔧 Debug - GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('🔧 Debug - GOOGLE_CLIENT_ID value:', process.env.GOOGLE_CLIENT_ID ? '[SET]' : '[MISSING]');
console.log('🔧 Debug - GOOGLE_CLIENT_SECRET value:', process.env.GOOGLE_CLIENT_SECRET ? '[SET]' : '[MISSING]');
console.log('🔧 Debug - Google OAuth enabled:', hasGoogleCredentials);

// Only configure Google OAuth if credentials are available
if (hasGoogleCredentials) {
  try {
    console.log('✅ Configuring Google OAuth strategy with valid credentials');
    // Google OAuth Strategy
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.NODE_ENV === 'production' 
        ? "https://stocktrack-production.up.railway.app/auth/google/callback"
        : "http://localhost:3000/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = usersByGoogleId.get(profile.id);
      
      if (!user) {
        // Create new user
        user = {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          googleId: profile.id,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName || '',
          picture: profile.photos?.[0]?.value || ''
        };
        
        usersByGoogleId.set(profile.id, user);
        usersById.set(user.id, user);
        
        console.log(`✅ New user created: ${user.name} (${user.email})`);
      } else {
        console.log(`🔄 User logged in: ${user.name} (${user.email})`);
      }
      
      return done(null, user);
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return done(error, null);
    }
  }));
  } catch (setupError) {
    console.error('❌ Failed to configure Google OAuth strategy:', setupError);
    console.log('⚠️  Google OAuth setup failed - authentication disabled');
  }
} else {
  console.log('⚠️  Google OAuth not configured - authentication disabled');
  console.log('💡 To enable authentication, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables');
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id: string, done) => {
  const user = usersById.get(id);
  done(null, user || false);
});

// Authentication middleware
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  
  // For API requests, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      success: false, 
      error: "Authentication required",
      loginUrl: "/auth/google"
    });
  }
  
  // For web requests, redirect to login
  res.redirect('/auth/google');
};

// Optional authentication middleware (doesn't block, just adds user info)
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // User info is automatically added by passport session if authenticated
  next();
};

// Get current user info
export const getCurrentUser = (req: AuthenticatedRequest): User | null => {
  return req.user || null;
};

// User management functions
export const getUserById = (id: string): User | undefined => {
  return usersById.get(id);
};

export const getAllUsers = (): User[] => {
  return Array.from(usersById.values());
};

// Export whether OAuth is configured
export const isOAuthConfigured = hasGoogleCredentials;

// Export passport for server setup
export default passport; 