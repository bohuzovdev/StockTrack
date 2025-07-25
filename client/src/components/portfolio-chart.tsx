import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";
import type { InvestmentWithCurrentData } from "@shared/schema";

// Generate chart data based on actual investment dates
const generateHistoricalData = (investments: InvestmentWithCurrentData[]) => {
  if (investments.length === 0) return [];
  
  const data: { month: string; portfolio: number; sp500: number }[] = [];
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
      sp500: Math.round(cumulativeInvested * 1.0), // S&P 500 baseline (no change for simplicity)
    });
  });
  
  // If only one data point, add a second point for better visualization
  if (data.length === 1) {
    const today = new Date();
    const todayLabel = today.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    data.push({
      month: todayLabel,
      portfolio: data[0].portfolio,
      sp500: data[0].sp500,
    });
  }
  
  return data;
};

export function PortfolioChart() {
  const [timeframe, setTimeframe] = useState("6M");
  
  const { data: investments, isLoading } = useQuery<InvestmentWithCurrentData[]>({
    queryKey: ["/api/investments"],
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
            <div className="text-slate-500">Loading chart data...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-slate-500">No data available. Add investments to see your portfolio performance.</div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'portfolio' ? 'Portfolio Value' : 'S&P 500 Benchmark'
                  ]}
                  labelStyle={{ color: '#334155' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                  dataKey="sp500"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-slate-600">Portfolio Value</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="text-slate-600">S&P 500 Benchmark</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
