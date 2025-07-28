import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ApiRequestState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
}

export interface ApiRequestActions<T> {
  execute: (data?: unknown) => Promise<T>;
  reset: () => void;
  setData: (data: T | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: ApiError | null) => void;
}

export type UseApiRequestReturn<T> = ApiRequestState<T> & ApiRequestActions<T>;

/**
 * Custom hook for handling API requests with consistent error handling and loading states
 * Replaces the scattered API request patterns throughout the application
 */
export function useApiRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: ApiError) => void;
    transform?: (response: unknown) => T;
  }
): UseApiRequestReturn<T> {
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(async (requestData?: unknown): Promise<T> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`🌐 API Request: ${method} ${url}`);
      
      const response = await apiRequest(method, url, requestData);
      
      // Transform response if transformer provided
      const transformedData = options?.transform ? options.transform(response) : response as T;
      
      setData(transformedData);
      
      // Call success callback if provided
      options?.onSuccess?.(transformedData);
      
      console.log(`✅ API Success: ${method} ${url}`);
      return transformedData;
      
    } catch (err) {
      console.error(`❌ API Error: ${method} ${url}`, err);
      
      // Create structured error object
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Unknown API error',
        status: (err as any)?.status,
        code: (err as any)?.code,
      };
      
      setError(apiError);
      
      // Call error callback if provided
      options?.onError?.(apiError);
      
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, [method, url, options]);

  const reset = useCallback(() => {
    setData(null);
    setIsLoading(false);
    setError(null);
  }, []);

  // Exposed setters for manual state management if needed
  const setDataManual = useCallback((newData: T | null) => {
    setData(newData);
  }, []);

  const setLoadingManual = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const setErrorManual = useCallback((err: ApiError | null) => {
    setError(err);
  }, []);

  return {
    // State
    data,
    isLoading,
    error,
    
    // Actions
    execute,
    reset,
    setData: setDataManual,
    setLoading: setLoadingManual,
    setError: setErrorManual,
  };
}

/**
 * Specialized hook for token-related API operations
 */
export function useTokenApiRequest() {
  const saveToken = useApiRequest('POST', '/api/user/tokens');
  const deleteToken = useApiRequest('DELETE', '');  // URL will be set dynamically
  const clearAllTokens = useApiRequest('DELETE', '/api/user/tokens/clear-all');
  
  const deleteSpecificToken = useCallback(async (provider: string) => {
    // Update the URL for this specific request
    return apiRequest('DELETE', `/api/user/tokens/${provider}`);
  }, []);

  return {
    saveToken,
    deleteToken: deleteSpecificToken,
    clearAllTokens,
  };
}

/**
 * Specialized hook for banking API operations
 */
export function useBankingApiRequest() {
  return {
    getAccounts: useApiRequest('POST', '/api/banking/accounts'),
    getTransactions: useApiRequest('POST', '/api/banking/transactions'),
  };
}

/**
 * Specialized hook for crypto API operations
 */
export function useCryptoApiRequest() {
  return {
    getAssets: useApiRequest('POST', '/api/crypto/assets'),
    testConnection: useApiRequest('POST', '/api/crypto/test-connection'),
    connect: useApiRequest('POST', '/api/crypto/connect'),
    disconnect: useApiRequest('DELETE', '/api/crypto/disconnect'),
  };
}

/**
 * Specialized hook for investment API operations
 */
export function useInvestmentApiRequest() {
  return {
    getPortfolioSummary: useApiRequest('GET', '/api/portfolio/summary'),
    getInvestments: useApiRequest('GET', '/api/investments'),
    createInvestment: useApiRequest('POST', '/api/investments'),
    deleteInvestment: useApiRequest('DELETE', ''), // URL set dynamically
    refreshMarketData: useApiRequest('POST', '/api/market/refresh'),
    getMarketData: useApiRequest('GET', '/api/market/sp500'),
  };
} 