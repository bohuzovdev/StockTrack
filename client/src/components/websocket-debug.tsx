import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WebSocketDebug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const connectWebSocket = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      addLog('Already connected');
      return;
    }

    addLog('Attempting to connect to ws://localhost:3000/ws');
    setWsStatus('connecting');

    try {
      const websocket = new WebSocket('ws://localhost:3000/ws');
      setWs(websocket);

      websocket.onopen = () => {
        addLog('✅ WebSocket connected successfully');
        setWsStatus('connected');
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addLog(`📨 Received: ${data.type}`);
        } catch (e) {
          addLog(`📨 Received raw: ${event.data}`);
        }
      };

      websocket.onclose = (event) => {
        addLog(`❌ WebSocket closed: ${event.code} ${event.reason}`);
        setWsStatus('disconnected');
      };

      websocket.onerror = (error) => {
        addLog(`🚨 WebSocket error: ${error}`);
        setWsStatus('error');
      };

    } catch (error) {
      addLog(`🚨 Connection failed: ${error}`);
      setWsStatus('error');
    }
  };

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close();
      setWs(null);
      addLog('Disconnected manually');
    }
  };

  const sendTestMessage = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
      addLog('📤 Sent ping message');
    } else {
      addLog('❌ Cannot send - not connected');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  useEffect(() => {
    addLog('WebSocket Debug component mounted');
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (wsStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          WebSocket Debug Tool
          <span className={`text-sm ${getStatusColor()}`}>
            Status: {wsStatus.toUpperCase()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={connectWebSocket}
            disabled={wsStatus === 'connecting' || wsStatus === 'connected'}
            size="sm"
          >
            Connect
          </Button>
          <Button 
            onClick={disconnectWebSocket}
            disabled={wsStatus === 'disconnected'}
            variant="outline"
            size="sm"
          >
            Disconnect
          </Button>
          <Button 
            onClick={sendTestMessage}
            disabled={wsStatus !== 'connected'}
            variant="outline"
            size="sm"
          >
            Send Ping
          </Button>
          <Button 
            onClick={clearLogs}
            variant="outline"
            size="sm"
          >
            Clear Logs
          </Button>
        </div>

        <div className="bg-gray-100 p-3 rounded text-xs font-mono h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>

        <div className="text-sm text-gray-600">
          <div><strong>Expected URL:</strong> ws://localhost:3000/ws</div>
          <div><strong>Vite HMR Port:</strong> 24678 (separated from our WebSocket)</div>
        </div>
      </CardContent>
    </Card>
  );
} 