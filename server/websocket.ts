import { WebSocketServer, WebSocket } from 'ws';
import type { MarketData } from '@shared/schema';
import { storage } from './storage';

interface WebSocketMessage {
  type: 'market_update' | 'portfolio_update' | 'connection_status';
  data?: any;
  timestamp?: string;
}

let wss: WebSocketServer;
let marketDataUpdateInterval: NodeJS.Timeout;

// Rate limiting for market data updates
const MARKET_UPDATE_INTERVAL = 30000; // 30 seconds
const MAX_CONNECTIONS = 100;

export function setupWebSocket() {
  try {
    wss = new WebSocketServer({ 
      port: 3001,
      maxPayload: 16 * 1024 // 16KB max message size
    });

    console.log('🔌 WebSocket server running on port 3001');

    wss.on('connection', (ws: WebSocket) => {
      // Limit connections
      if (wss.clients.size > MAX_CONNECTIONS) {
        ws.close(1013, 'Server overloaded');
        return;
      }

      console.log('👤 New WebSocket connection established');
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection_status',
        data: {
          status: 'connected',
          message: 'Connected to PFT WebSocket',
          timestamp: new Date().toISOString()
        }
      }));

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      ws.on('close', () => {
        console.log('👤 WebSocket connection closed');
      });
    });

    // Start periodic market data updates
    startMarketDataUpdates();

    wss.on('error', (error) => {
      console.error('❌ WebSocket Server Error:', error);
    });

  } catch (error) {
    console.error('Failed to setup WebSocket server:', error);
  }
}

function startMarketDataUpdates() {
  marketDataUpdateInterval = setInterval(async () => {
    if (wss.clients.size === 0) {
      console.log('📭 No active connections, skipping portfolio update');
      return;
    }

    try {
      // Get updated portfolio data
      const portfolioData = await storage.getInvestmentsWithCurrentData();
      
      const message: WebSocketMessage = {
        type: 'portfolio_update',
        data: portfolioData,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });

      console.log(`📊 Portfolio update sent to ${wss.clients.size} client(s)`);
    } catch (error) {
      console.error('❌ Error updating portfolio data:', error);
    }
  }, MARKET_UPDATE_INTERVAL);

  console.log('🔄 Started periodic market data updates with rate limiting');
}

export function broadcastMarketUpdate(data: MarketData) {
  if (!wss || wss.clients.size === 0) return;

  const message: WebSocketMessage = {
    type: 'market_update',
    data,
    timestamp: new Date().toISOString()
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

export function closeWebSocket() {
  if (marketDataUpdateInterval) {
    clearInterval(marketDataUpdateInterval);
  }
  
  if (wss) {
    wss.close();
  }
} 