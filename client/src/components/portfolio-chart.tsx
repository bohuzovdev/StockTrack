import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";
import { apiRequest, createUserQueryKey } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import type { InvestmentWithCurrentData } from "@shared/schema";

// Generate chart data based on actual investment dates
const generateHistoricalData = (investments: InvestmentWithCurrentData[]) => {
  if (investments.length === 0) return [];
  
  const data: { month: string; portfolio: number; invested: number }[] = [];
  const sortedInvestments = investments.sort((a, b) => 
    new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
  );
  
  let cumulativeInvested = 0;
  let cumulativeValue = 0;
  
  // Group investments by month to show progression
  const investmentsByMonth: { [key: string]: { label: string; investments: InvestmentWithCurrentData[]; date: Date } } = {};
  
  sortedInvestments.forEach(investment => {
    const date = new Date(investment.purchaseDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    
    if (!investmentsByMonth[monthKey]) {
      investmentsByMonth[monthKey] = {
        label: monthLabel,
        investments: [],
        date: date
      };
    }
    investmentsByMonth[monthKey].investments.push(investment);
  });
  
  // Create data points for each month with investments
  Object.values(investmentsByMonth).forEach(monthData => {
    // Add investments made in this month
    monthData.investments.forEach((inv: InvestmentWithCurrentData) => {
      cumulativeInvested += inv.amount;
      cumulativeValue += inv.currentValue;
    });
    
    data.push({
      month: monthData.label,
      portfolio: Math.round(cumulativeValue),
      invested: Math.round(cumulativeInvested), // Total amount invested up to this point
    });
  });
  
  // If only one data point, add a second point for better visualization
  if (data.length === 1) {
    const today = new Date();
    const todayLabel = today.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    data.push({
      month: todayLabel,
      portfolio: data[0].portfolio,
      invested: data[0].invested,
    });
  }
  
  return data;
};

export function PortfolioChart() {
  const [timeframe, setTimeframe] = useState("6M");
  const { user, isAuthenticated } = useAuth();
  
  const { data: investments, isLoading } = useQuery<InvestmentWithCurrentData[]>({
    queryKey: createUserQueryKey(user?.id || null, ["investments"]),
    queryFn: () => apiRequest("GET", "/api/investments"),
    enabled: isAuthenticated,
  });

  const chartData = investments ? generateHistoricalData(investments) : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Portfolio Performance</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant={timeframe === "6M" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe("6M")}
            >
              6M
            </Button>
            <Button
              variant={timeframe === "1Y" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe("1Y")}
            >
              1Y
            </Button>
            <Button
              variant={timeframe === "All" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe("All")}
            >
              All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-muted-foreground">No data available. Add investments to see your portfolio performance.</div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'portfolio' ? 'Portfolio Value' : 'Amount Invested'
                  ]}
                  labelStyle={{ color: 'var(--foreground)' }}
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    color: 'var(--foreground)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="#6b7280"
                  strokeWidth={2}
                  dot={{ fill: '#6b7280', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#6b7280', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-muted-foreground">Portfolio Value</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-muted-foreground">Amount Invested</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
