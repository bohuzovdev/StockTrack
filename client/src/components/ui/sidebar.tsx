import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BarChart3, Plus, History, TrendingUp, Settings, Wallet } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Banking", href: "/banking", icon: Wallet },
  { name: "Historical Data", href: "/historical", icon: History },
  { name: "Forecast", href: "/forecast", icon: TrendingUp },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-card shadow-sm border-r border-border fixed h-full z-10">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold">StockTrack</h1>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "sidebar-nav-item",
                    isActive ? "active" : ""
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
