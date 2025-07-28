import { useState, useCallback } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

export interface UserToken {
  id: string;
  provider: string;
  tokenName: string;
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
}

export interface TokenManagerState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  userTokens: UserToken[];
}

export interface TokenManagerActions {
  loadUserTokens: () => Promise<void>;
  clearAllTokens: () => Promise<void>;
  recoverConnection: () => Promise<void>;
  deleteToken: (provider: string) => Promise<void>;
  saveToken: (provider: string, token: string, tokenName?: string) => Promise<void>;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export type UseTokenManagerReturn = TokenManagerState & TokenManagerActions;

/**
 * Reusable hook for managing user API tokens across different pages
 * Consolidates duplicated token management logic from banking, stocks, and crypto pages
 */
export function useTokenManager(provider?: string): UseTokenManagerReturn {
  const { isAuthenticated } = useAuth();
  
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTokens, setUserTokens] = useState<UserToken[]>([]);

  /**
   * Load user's API tokens from server
   */
  const loadUserTokens = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiRequest('GET', '/api/user/tokens');
      const tokens = response.tokens || [];
      
      setUserTokens(tokens);
      
      // If provider specified, check if user has this provider's token
      if (provider) {
        const providerToken = tokens.find((token: UserToken) => 
          token.provider === provider && token.isActive
        );
        setIsConnected(!!providerToken);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tokens';
      console.error('Failed to load user tokens:', err);
      setError(errorMessage);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, provider]);

  /**
   * Clear all tokens for recovery (emergency cleanup)
   */
  const clearAllTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await apiRequest('DELETE', '/api/user/tokens/clear-all');
      
      if (result.success) {
        setIsConnected(false);
        setError(null);
        setUserTokens([]);
        console.log(`✅ Cleared ${result.removedCount} tokens for recovery`);
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["portfolio", "summary"] });
        queryClient.invalidateQueries({ queryKey: ["investments"] });
        queryClient.invalidateQueries({ queryKey: ["banking", "accounts"] });
        queryClient.invalidateQueries({ queryKey: ["crypto", "assets"] });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear tokens';
      console.error('Failed to clear tokens:', err);
      setError(`Failed to clear tokens: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Recover connection by clearing corrupted tokens and reloading
   */
  const recoverConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log(`🔄 Attempting ${provider || 'connection'} recovery...`);
      
      // Clear any corrupted tokens
      await clearAllTokens();
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to reload tokens
      await loadUserTokens();
      
      console.log(`✅ ${provider || 'Connection'} recovery completed`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Recovery failed';
      console.error('Recovery failed:', err);
      setError(`Recovery failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [provider, clearAllTokens, loadUserTokens]);

  /**
   * Delete a specific provider's token
   */
  const deleteToken = useCallback(async (tokenProvider: string) => {
    try {
      setIsLoading(true);
      await apiRequest('DELETE', `/api/user/tokens/${tokenProvider}`);
      
      // Update local state
      setUserTokens(prev => prev.filter(token => token.provider !== tokenProvider));
      
      if (tokenProvider === provider) {
        setIsConnected(false);
      }
      
      console.log(`🗑️ Deleted ${tokenProvider} token`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete token';
      console.error(`Failed to delete ${tokenProvider} token:`, err);
      setError(`Failed to delete token: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  /**
   * Save a new token for a provider
   */
  const saveToken = useCallback(async (tokenProvider: string, token: string, tokenName?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiRequest('POST', '/api/user/tokens', {
        provider: tokenProvider,
        token: token,
        tokenName: tokenName || `${tokenProvider} API Key` // Provide default if not specified
      });
      
      if (response.success) {
        // Reload tokens to get updated list
        await loadUserTokens();
        
        if (tokenProvider === provider) {
          setIsConnected(true);
        }
        
        console.log(`✅ Saved ${tokenProvider} token successfully`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save token';
      console.error(`Failed to save ${tokenProvider} token:`, err);
      setError(`Failed to save token: ${errorMessage}`);
      throw err; // Re-throw for caller to handle
    } finally {
      setIsLoading(false);
    }
  }, [provider, loadUserTokens]);

  // Helper functions
  const setConnected = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isConnected,
    isLoading,
    error,
    userTokens,
    
    // Actions
    loadUserTokens,
    clearAllTokens,
    recoverConnection,
    deleteToken,
    saveToken,
    setConnected,
    setLoading,
    setError,
    clearError,
  };
} 