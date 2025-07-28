import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { TrendingUp, Calculator, Target } from "lucide-react";
import { apiRequest, createUserQueryKey } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import type { InvestmentWithCurrentData, PortfolioSummary } from "@shared/schema";

// S&P 500 historical performance data (last 50 years: 1975-2025)
const SP500_HISTORICAL_RETURN = 0.105; // 10.5% annual return including dividends
const SP500_REAL_RETURN = 0.066; // 6.6% inflation-adjusted return
const VOLATILITY_FACTOR = 0.16; // ~16% standard deviation for S&P 500

interface ForecastData {
  year: number;
  conservative: number;
  expected: number;
  optimistic: number;
  totalInvested: number;
}

export function PortfolioForecast() {
  const [forecastYears, setForecastYears] = useState(10);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [showInflationAdjusted, setShowInflationAdjusted] = useState(false);
  
  // Separate string states for input handling
  const [forecastYearsInput, setForecastYearsInput] = useState("10");
  const [monthlyContributionInput, setMonthlyContributionInput] = useState("0");
  const { user, isAuthenticated } = useAuth();

  const { data: investments } = useQuery<InvestmentWithCurrentData[]>({
    queryKey: createUserQueryKey(user?.id || null, ["investments"]),
    queryFn: () => apiRequest("GET", "/api/investments"),
    enabled: isAuthenticated,
  });

  const { data: portfolio } = useQuery<PortfolioSummary>({
    queryKey: createUserQueryKey(user?.id || null, ["portfolio", "summary"]),
    queryFn: () => apiRequest("GET", "/api/portfolio/summary"),
    enabled: isAuthenticated,
  });

  const generateForecastData = (): ForecastData[] => {
    if (!portfolio || !investments) return [];

    const currentValue = portfolio.totalValue;
    const data: ForecastData[] = [];
    
    // Use real S&P 500 historical returns for scenarios
    const conservativeReturn = showInflationAdjusted ? SP500_REAL_RETURN - 0.02 : SP500_HISTORICAL_RETURN - 0.03; // 4.6% or 7.5%
    const expectedReturn = showInflationAdjusted ? SP500_REAL_RETURN : SP500_HISTORICAL_RETURN; // 6.6% or 10.5%
    const optimisticReturn = showInflationAdjusted ? SP500_REAL_RETURN + 0.02 : SP500_HISTORICAL_RETURN + 0.03; // 8.6% or 13.5%

    for (let year = 0; year <= forecastYears; year++) {
      // Calculate compound growth for existing portfolio
      const conservativeValue = currentValue * Math.pow(1 + conservativeReturn, year);
      const expectedValue = currentValue * Math.pow(1 + expectedReturn, year);
      const optimisticValue = currentValue * Math.pow(1 + optimisticReturn, year);

      // Calculate future value of monthly contributions (annuity formula)
      let monthlyContributionValue = 0;
      if (monthlyContribution > 0 && year > 0) {
        const monthlyRate = expectedReturn / 12;
        const months = year * 12;
        monthlyContributionValue = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      }

      // Total invested including monthly contributions
      const totalInvested = portfolio.totalInvested + (monthlyContribution * 12 * year);

      data.push({
        year: new Date().getFullYear() + year,
        conservative: Math.round(conservativeValue + monthlyContributionValue * 0.9),
        expected: Math.round(expectedValue + monthlyContributionValue),
        optimistic: Math.round(optimisticValue + monthlyContributionValue * 1.1),
        totalInvested: Math.round(totalInvested),
      });
    }

    return data;
  };

  const forecastData = generateForecastData();
  const currentYear = new Date().getFullYear();
  const finalValue = forecastData[forecastData.length - 1];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
    }).format(value);
  };

  if (!portfolio || !investments || investments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Add investments to see portfolio growth projections based on 50 years of S&P 500 performance.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Portfolio Forecast
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Based on 50 years of S&P 500 historical performance (10.5% annual return)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Forecast Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary rounded-lg">
          <div>
            <Label htmlFor="years">Forecast Period (Years)</Label>
            <Input
              id="years"
              type="text"
              placeholder="10"
              value={forecastYearsInput}
              onChange={(e) => {
                const value = e.target.value;
                setForecastYearsInput(value);
                const numValue = parseInt(value) || 0;
                if (numValue >= 1 && numValue <= 40) {
                  setForecastYears(numValue);
                }
              }}
              onBlur={() => {
                const numValue = parseInt(forecastYearsInput) || 10;
                const clampedValue = Math.max(1, Math.min(40, numValue));
                setForecastYears(clampedValue);
                setForecastYearsInput(clampedValue.toString());
              }}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="monthly">Monthly Contribution ($)</Label>
            <Input
              id="monthly"
              type="text"
              placeholder="0"
              value={monthlyContributionInput}
              onChange={(e) => {
                const value = e.target.value;
                setMonthlyContributionInput(value);
                const numValue = parseFloat(value) || 0;
                if (numValue >= 0) {
                  setMonthlyContribution(numValue);
                }
              }}
              onBlur={() => {
                const numValue = parseFloat(monthlyContributionInput) || 0;
                const clampedValue = Math.max(0, numValue);
                setMonthlyContribution(clampedValue);
                setMonthlyContributionInput(clampedValue.toString());
              }}
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant={showInflationAdjusted ? "default" : "outline"}
              onClick={() => setShowInflationAdjusted(!showInflationAdjusted)}
              className="w-full"
            >
              {showInflationAdjusted ? "Real Returns" : "Nominal Returns"}
            </Button>
          </div>
        </div>

        {/* Forecast Summary */}
        {finalValue && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg bg-card">
              <div className="text-sm text-muted-foreground">Conservative Scenario</div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(finalValue.conservative)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage(showInflationAdjusted ? SP500_REAL_RETURN - 0.02 : SP500_HISTORICAL_RETURN - 0.03)} annual
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="text-sm text-muted-foreground">Expected Scenario</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(finalValue.expected)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage(showInflationAdjusted ? SP500_REAL_RETURN : SP500_HISTORICAL_RETURN)} annual
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-card">
              <div className="text-sm text-muted-foreground">Optimistic Scenario</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(finalValue.optimistic)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage(showInflationAdjusted ? SP500_REAL_RETURN + 0.02 : SP500_HISTORICAL_RETURN + 0.03)} annual
              </div>
            </div>
          </div>
        )}

        {/* Forecast Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="year" 
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
                  name === 'conservative' ? 'Conservative' :
                  name === 'expected' ? 'Expected' :
                  name === 'optimistic' ? 'Optimistic' : 'Total Invested'
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
                dataKey="totalInvested"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="conservative"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="expected"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="optimistic"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend and Growth Info */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
              <span className="text-muted-foreground">Total Invested</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-muted-foreground">Conservative</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-muted-foreground">Expected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span className="text-muted-foreground">Optimistic</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>
              <strong>Historical Context:</strong> The S&P 500 has averaged 10.5% annual returns over the last 50 years (1975-2025) including dividends.
            </p>
            <p>
              <strong>Disclaimer:</strong> Past performance does not guarantee future results. These projections are for educational purposes only.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}