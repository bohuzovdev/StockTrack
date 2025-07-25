import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: 'welcome' | 'portfolio_update' | 'manual_update' | 'pong' | 'subscribed' | 'error';
  data?: any;
  message?: string;
  timestamp?: string;
  clientId?: string;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  lastUpdateTime: string | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  ping: () => void;
}

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = 'ws://localhost:3001', // Connect to separate WebSocket port
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyDisconnected = useRef(false);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected or connecting');
      return;
    }

    setIsConnecting(true);
    setError(null);
    isManuallyDisconnected.current = false;

    try {
      console.log(`🔌 Connecting to WebSocket: ${url}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      // Connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('⏰ WebSocket connection timeout');
          ws.close();
          setError('Connection timeout');
          setIsConnecting(false);
        }
      }, 10000); // 10 second timeout

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        clearTimeouts();
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectCountRef.current = 0;

        // Send subscription message
        ws.send(JSON.stringify({
          type: 'subscribe',
          timestamp: new Date().toISOString()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message.type);
          
          setLastMessage(message);
          
          if (message.type === 'portfolio_update' || message.type === 'manual_update') {
            setLastUpdateTime(message.timestamp || new Date().toISOString());
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
        clearTimeouts();
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Don't reconnect for certain error codes or manual disconnection
        if (isManuallyDisconnected.current || 
            event.code === 1000 || // Normal closure
            event.code === 1001 || // Going away
            event.code === 1002 || // Protocol error
            event.code === 1003    // Unsupported data
        ) {
          console.log('🚫 Not attempting reconnection due to close code or manual disconnect');
          return;
        }

        // Attempt reconnection with exponential backoff
        if (reconnectCountRef.current < reconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectCountRef.current);
          console.log(`🔄 Attempting reconnection ${reconnectCountRef.current + 1}/${reconnectAttempts} in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current++;
            connect();
          }, delay);
        } else {
          setError(`Failed to reconnect after ${reconnectAttempts} attempts`);
          console.log('❌ Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('Connection error occurred');
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [url, reconnectAttempts, reconnectDelay, clearTimeouts]);

  const disconnect = useCallback(() => {
    console.log('🔌 Manually disconnecting WebSocket');
    isManuallyDisconnected.current = true;
    clearTimeouts();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
    reconnectCountRef.current = 0;
  }, [clearTimeouts]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        console.log('📤 Sent WebSocket message:', message.type);
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error);
        setError('Failed to send message');
      }
    } else {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
      setError('Not connected to WebSocket');
    }
  }, []);

  const ping = useCallback(() => {
    sendMessage({
      type: 'ping',
      timestamp: new Date().toISOString()
    });
  }, [sendMessage]);

  // Auto-connect on mount with delay to avoid HMR conflicts
  useEffect(() => {
    if (autoConnect) {
      // Add small delay to avoid conflicts with Vite HMR during development
      const timer = setTimeout(() => {
        connect();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [autoConnect, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    lastMessage,
    lastUpdateTime,
    connect,
    disconnect,
    sendMessage,
    ping
  };
} 