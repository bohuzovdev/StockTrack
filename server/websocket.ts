import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';

interface WebSocketClient extends WebSocket {
  id: string;
  lastHeartbeat: number;
}

// Rate limiting for API calls
let lastApiCall = 0;
const API_RATE_LIMIT = 15 * 60 * 1000; // 15 minutes between API calls

let wsServer: WebSocketServer;
const clients = new Set<WebSocketClient>();

export function setupWebSocket() {
  // Create a separate WebSocket server on port 3001
  const WS_PORT = 3001;
  
  wsServer = new WebSocketServer({ 
    port: WS_PORT,
    perMessageDeflate: false
  });

  console.log(`🔌 WebSocket server running on port ${WS_PORT}`);

  wsServer.on('connection', (ws: WebSocketClient, req) => {
    // Generate unique client ID
    ws.id = Math.random().toString(36).substring(2, 15);
    ws.lastHeartbeat = Date.now();
    clients.add(ws);

    console.log(`📱 Client ${ws.id} connected (${clients.size} total clients)`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to StockTrack WebSocket',
      clientId: ws.id,
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 Message from ${ws.id}:`, message.type);

        switch (message.type) {
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            ws.lastHeartbeat = Date.now();
            break;
          
          case 'subscribe':
            ws.send(JSON.stringify({
              type: 'subscribed',
              message: 'Subscribed to portfolio updates',
              timestamp: new Date().toISOString()
            }));
            break;
          
          default:
            console.log(`❓ Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error(`❌ Error parsing message from ${ws.id}:`, error);
      }
    });

    // Handle client disconnect
    ws.on('close', (code, reason) => {
      clients.delete(ws);
      console.log(`📱 Client ${ws.id} disconnected (${clients.size} remaining) - Code: ${code}, Reason: ${reason}`);
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for client ${ws.id}:`, error);
      clients.delete(ws);
    });
  });

  // Handle WebSocket server errors
  wsServer.on('error', (error) => {
    console.error('❌ WebSocket Server Error:', error);
  });

  // Start periodic updates
  startPeriodicUpdates();
  
  return wsServer;
}

async function startPeriodicUpdates() {
  console.log('🔄 Started periodic market data updates with rate limiting');
  
  setInterval(async () => {
    if (clients.size === 0) {
      console.log('📭 No active connections, skipping portfolio update');
      return;
    }

    try {
      // Get fresh market data (with rate limiting)
      const now = Date.now();
      if (now - lastApiCall > API_RATE_LIMIT) {
        console.log('📈 Fetching fresh market data for WebSocket clients');
        // This will trigger fresh API calls in the storage layer
        await storage.getMarketData('SPY');
        lastApiCall = now;
      }

      // Get current portfolio data
      const investments = await storage.getInvestments();
      const summary = await storage.getPortfolioSummary();
      const marketData = await storage.getMarketData('SPY');

      // Broadcast to all connected clients
      const updateData = {
        type: 'portfolio_update',
        data: {
          investments,
          summary,
          marketData,
          timestamp: new Date().toISOString()
        }
      };

      broadcast(JSON.stringify(updateData));
      console.log(`📡 Broadcast portfolio update to ${clients.size} clients`);

    } catch (error) {
      console.error('❌ Error during periodic update:', error);
    }
  }, 30000); // Update every 30 seconds
}

function broadcast(message: string) {
  const deadClients = new Set<WebSocketClient>();
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error(`❌ Error sending to client ${client.id}:`, error);
        deadClients.add(client);
      }
    } else {
      deadClients.add(client);
    }
  });

  // Clean up dead connections
  deadClients.forEach(client => {
    clients.delete(client);
    console.log(`🧹 Cleaned up dead client ${client.id}`);
  });
}

export function getWebSocketStatus() {
  return {
    enabled: true,
    endpoint: 'ws://localhost:3001',
    port: 3001,
    connectedClients: clients.size,
    rateLimit: {
      lastApiCall: new Date(lastApiCall).toISOString(),
      nextAllowedCall: new Date(lastApiCall + API_RATE_LIMIT).toISOString(),
      remainingMs: Math.max(0, (lastApiCall + API_RATE_LIMIT) - Date.now())
    }
  };
}

export function triggerManualUpdate() {
  if (clients.size === 0) {
    return { message: 'No connected clients to update' };
  }

  // Force immediate update regardless of rate limit
  setTimeout(async () => {
    try {
      const investments = await storage.getInvestments();
      const summary = await storage.getPortfolioSummary();
      const marketData = await storage.getMarketData('SPY');

      const updateData = {
        type: 'manual_update',
        data: {
          investments,
          summary,
          marketData,
          timestamp: new Date().toISOString()
        }
      };

      broadcast(JSON.stringify(updateData));
      console.log(`📡 Manual update broadcast to ${clients.size} clients`);
    } catch (error) {
      console.error('❌ Error during manual update:', error);
    }
  }, 100);

  return { message: `Manual update triggered for ${clients.size} clients` };
} 