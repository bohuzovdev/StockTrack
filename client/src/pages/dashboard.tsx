import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/ui/sidebar";
import { PortfolioChart } from "@/components/portfolio-chart";
import { PortfolioForecast } from "@/components/portfolio-forecast";
import { InvestmentTable } from "@/components/investment-table";
import { AddInvestmentModal } from "@/components/add-investment-modal";
import { RefreshCw, TrendingUp, Wallet, DollarSign, Activity } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { WebSocketStatus } from "@/components/websocket-status";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PortfolioSummary, MarketData } from "@shared/schema";

export default function Dashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: portfolioSummary, isLoading: summaryLoading } = useQuery<PortfolioSummary>({
    queryKey: ["/api/portfolio/summary"],
  });

  const { data: sp500Data, isLoading: sp500Loading } = useQuery<MarketData>({
    queryKey: ["/api/market/sp500"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefreshData = async () => {
    try {
      await apiRequest("POST", "/api/market/refresh");
      await queryClient.invalidateQueries({ queryKey: ["/api"] });
      toast({
        title: "Data Refreshed",
        description: "Market data has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh market data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Portfolio Dashboard</h2>
            <p className="text-muted-foreground mt-1">Track your investments and market performance</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <WebSocketStatus compact />
            <ThemeToggle />
            <Button onClick={handleRefreshData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Portfolio Value</p>
                  <p className="text-2xl font-semibold mt-1">
                    {summaryLoading ? "Loading..." : formatCurrency(portfolioSummary?.totalValue || 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className={`text-sm font-medium ${portfolioSummary?.totalGainsPercent && portfolioSummary?.totalGainsPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioSummary ? formatPercent(portfolioSummary.totalGainsPercent) : "--"}
                </span>
                <span className="text-muted-foreground text-sm ml-2">vs invested</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Invested</p>
                  <p className="text-2xl font-semibold mt-1">
                    {summaryLoading ? "Loading..." : formatCurrency(portfolioSummary?.totalInvested || 0)}
                  </p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className="text-muted-foreground text-sm">Initial investment</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Gains</p>
                  <p className={`text-2xl font-semibold mt-1 ${portfolioSummary?.totalGains && portfolioSummary?.totalGains >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {summaryLoading ? "Loading..." : formatCurrency(portfolioSummary?.totalGains || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className={`text-sm font-medium ${portfolioSummary?.totalGainsPercent && portfolioSummary?.totalGainsPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {portfolioSummary ? formatPercent(portfolioSummary.totalGainsPercent) : "--"}
                </span>
                <span className="text-muted-foreground text-sm ml-2">return</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">S&P 500 Today</p>
                  <p className="text-2xl font-semibold mt-1">
                    {sp500Loading ? "Loading..." : sp500Data?.price.toFixed(2) || "--"}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className={`text-sm font-medium ${sp500Data?.changePercent && sp500Data?.changePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {sp500Data ? formatPercent(sp500Data.changePercent) : "--"}
                </span>
                <span className="text-muted-foreground text-sm ml-2">
                  {sp500Data ? `${sp500Data.change >= 0 ? '+' : ''}${sp500Data.change.toFixed(2)} pts` : "--"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Portfolio Chart */}
          <div className="lg:col-span-2">
            <PortfolioChart />
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline"
                onClick={() => setIsAddModalOpen(true)}
                className="w-full justify-between"
              >
                <div className="flex items-center space-x-3">
                  <span>Add Investment</span>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={handleRefreshData}
              >
                <div className="flex items-center space-x-3">
                  <span>Refresh Data</span>
                </div>
              </Button>

              {/* Market Status Widget */}
              <div className="mt-6 p-4 bg-secondary rounded-lg border">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Market Status</span>
                </div>
                <p className="text-sm text-muted-foreground">Markets are open</p>
                <p className="text-xs text-muted-foreground mt-1">Next close: 4:00 PM EST</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Forecast */}
        <PortfolioForecast />

        {/* Investment Table */}
        <InvestmentTable />
      </main>

      <AddInvestmentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}
