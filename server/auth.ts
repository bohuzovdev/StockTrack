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

// In-memory user storage (replace with database later)
const users = new Map<string, User>();
const usersByGoogleId = new Map<string, User>();

// Debug: Check if environment variables are loaded
console.log('🔧 Debug - GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
console.log('🔧 Debug - GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  callbackURL: process.env.NODE_ENV === 'production' 
    ? "https://your-domain.com/auth/google/callback"
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
        email: profile.emails?.[0]?.value || "",
        name: profile.displayName || "",
        picture: profile.photos?.[0]?.value,
        createdAt: new Date(),
        lastLoginAt: new Date()
      };
      
      users.set(user.id, user);
      usersByGoogleId.set(profile.id, user);
      
      console.log(`✅ New user created: ${user.name} (${user.email})`);
    } else {
      // Update last login
      user.lastLoginAt = new Date();
      users.set(user.id, user);
      
      console.log(`🔄 User logged in: ${user.name} (${user.email})`);
    }
    
    return done(null, user);
  } catch (error) {
    console.error("❌ Authentication error:", error);
    return done(error, undefined);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id: string, done) => {
  const user = users.get(id);
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
  return users.get(id);
};

export const getAllUsers = (): User[] => {
  return Array.from(users.values());
};

// Export passport for server setup
export default passport; 