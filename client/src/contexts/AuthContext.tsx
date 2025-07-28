import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { queryClient } from '../lib/queryClient';
import { SecureStorage } from '../lib/crypto';

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  lastLoginAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
  clearUserData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);

  // Clear all user-specific data (cache, storage, etc.)
  const clearUserData = async () => {
    try {
      console.log('🧹 Clearing all user-specific data...');
      
      // Clear React Query cache
      await queryClient.clear();
      
      // Clear all SecureStorage/localStorage items
      const keysToRemove = [
        'monobank_token',
        'banking_accounts',
        'banking_transactions',
        'user_tokens',
        'portfolio_cache',
        'market_data_cache'
      ];
      
      for (const key of keysToRemove) {
        try {
          await SecureStorage.removeItem(key);
        } catch (error) {
          // Ignore errors for keys that don't exist
        }
      }
      
      // Clear any other localStorage items that might be user-specific
      const localStorage = window.localStorage;
      const keysToCheck = Object.keys(localStorage);
      
      keysToCheck.forEach(key => {
        if (key.includes('user_') || key.includes('token_') || key.includes('banking_')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ User data cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/me', {
        credentials: 'include' // Important for session cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const newUser = data.user;
          
          // Check if user changed (different user logged in)
          if (previousUserId && previousUserId !== newUser.id) {
            console.log(`🔄 User changed from ${previousUserId} to ${newUser.id}, clearing data...`);
            await clearUserData();
          }
          
          setUser(newUser);
          setPreviousUserId(newUser.id);
        } else {
          // No user logged in
          if (previousUserId) {
            console.log('🚪 User logged out, clearing data...');
            await clearUserData();
          }
          setUser(null);
          setPreviousUserId(null);
        }
      } else {
        // Authentication failed
        if (previousUserId) {
          console.log('❌ Auth failed, clearing data...');
          await clearUserData();
        }
        setUser(null);
        setPreviousUserId(null);
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      if (previousUserId) {
        await clearUserData();
      }
      setUser(null);
      setPreviousUserId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    // Redirect to Google OAuth
    window.location.href = '/auth/google';
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear user data before logging out
      await clearUserData();
      
      const response = await fetch('/auth/logout', {
        credentials: 'include'
      });
      
      if (response.ok) {
        setUser(null);
        setPreviousUserId(null);
        // Refresh the page to clear any remaining state
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Periodically check auth status to catch user changes
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isLoading) {
        checkAuthStatus();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [isLoading]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuthStatus,
    clearUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 