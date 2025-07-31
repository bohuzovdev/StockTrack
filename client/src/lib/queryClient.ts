import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});

// Helper function to create user-specific query keys
export const createUserQueryKey = (userId: string | null, baseKey: string | string[]) => {
  if (!userId) {
    return ['public', ...(Array.isArray(baseKey) ? baseKey : [baseKey])];
  }
  return ['user', userId, ...(Array.isArray(baseKey) ? baseKey : [baseKey])];
};

// Custom hook for making authenticated API requests with proper error handling
export async function apiRequest(method: string, url: string, data?: any) {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: 'include', // Important for session cookies
  };

  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  // Handle authentication errors
  if (response.status === 401) {
    // Clear any cached data and redirect to login
    queryClient.clear();
    console.log('🔒 Authentication required - redirecting to Google OAuth...');
    window.location.replace('/auth/google');
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
