import { useWebSocket } from "@/hooks/use-websocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface WebSocketStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

export function WebSocketStatus({ showDetails = false, compact = false }: WebSocketStatusProps) {
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  
  const ws = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'market_data_update' || message.type === 'portfolio_update') {
        setLastUpdateTime(new Date().toLocaleTimeString());
      }
    },
    onConnect: () => {
      console.log('WebSocket connected from status component');
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected from status component');
    }
  });

  const getStatusColor = () => {
    if (ws.isConnected) return "success";
    if (ws.isConnecting) return "secondary";
    if (ws.error) return "destructive";
    return "secondary";
  };

  const getStatusText = () => {
    if (ws.isConnected) return "Connected";
    if (ws.isConnecting) return "Connecting";
    if (ws.error) return "Error";
    return "Disconnected";
  };

  const getStatusIcon = () => {
    if (ws.isConnected) return <Wifi className="h-4 w-4" />;
    if (ws.isConnecting) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (ws.error) return <AlertTriangle className="h-4 w-4" />;
    return <WifiOff className="h-4 w-4" />;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={getStatusColor() as any} className="flex items-center gap-1">
          {getStatusIcon()}
          Real-time: {getStatusText()}
        </Badge>
        {lastUpdateTime && (
          <span className="text-xs text-muted-foreground">
            Last update: {lastUpdateTime}
          </span>
        )}
      </div>
    );
  }

  if (!showDetails) {
    return (
      <Badge variant={getStatusColor() as any} className="flex items-center gap-1">
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Real-time Connection
        </CardTitle>
        <CardDescription>
          WebSocket connection status and controls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={getStatusColor() as any}>
            {getStatusText()}
          </Badge>
        </div>

        {ws.error && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Error:</span>
            <span className="text-sm text-destructive">{ws.error}</span>
          </div>
        )}

        {ws.connectionAttempts > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Reconnect attempts:</span>
            <span className="text-sm">{ws.connectionAttempts}</span>
          </div>
        )}

        {lastUpdateTime && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last update:</span>
            <span className="text-sm">{lastUpdateTime}</span>
          </div>
        )}

        {ws.lastMessage && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Last message:</span>
            <div className="text-xs bg-muted p-2 rounded">
              <div><strong>Type:</strong> {ws.lastMessage.type}</div>
              {ws.lastMessage.symbol && (
                <div><strong>Symbol:</strong> {ws.lastMessage.symbol}</div>
              )}
              {ws.lastMessage.timestamp && (
                <div><strong>Time:</strong> {new Date(ws.lastMessage.timestamp).toLocaleTimeString()}</div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!ws.isConnected && !ws.isConnecting && (
            <Button 
              onClick={ws.connect} 
              size="sm" 
              variant="outline"
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Reconnect
            </Button>
          )}
          
          {ws.isConnected && (
            <Button 
              onClick={ws.disconnect} 
              size="sm" 
              variant="outline"
              className="flex items-center gap-1"
            >
              <WifiOff className="h-3 w-3" />
              Disconnect
            </Button>
          )}

          {ws.isConnected && (
            <Button 
              onClick={ws.sendPing} 
              size="sm" 
              variant="outline"
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Ping
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 