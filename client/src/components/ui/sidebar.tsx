import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  TrendingUp, 
  CreditCard, 
  BarChart3, 
  Calendar, 
  Bitcoin,
  LogOut,
  User
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Stocks", href: "/stocks", icon: TrendingUp },
    { name: "Banking", href: "/banking", icon: CreditCard },
    { name: "Crypto", href: "/crypto", icon: Bitcoin },
    { name: "Historical Data", href: "/historical-data", icon: Calendar },
    { name: "Forecast", href: "/forecast", icon: BarChart3 },
  ];

  return (
    <div className="fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border">
      {/* Header */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <BarChart3 className="h-6 w-6 text-primary mr-2" />
        <span className="font-bold text-lg text-foreground">PFT</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Button
                key={item.name}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-secondary text-secondary-foreground"
                )}
                onClick={() => setLocation(item.href)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-shrink-0">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
