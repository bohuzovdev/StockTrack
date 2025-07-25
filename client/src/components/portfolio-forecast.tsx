import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { TrendingUp, Calculator, Target } from "lucide-react";
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

  const { data: investments } = useQuery<InvestmentWithCurrentData[]>({
    queryKey: ["/api/investments"],
  });

  const { data: portfolio } = useQuery<PortfolioSummary>({
    queryKey: ["/api/portfolio/summary"],
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
          <div className="text-center py-8 text-slate-500">
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
        <p className="text-sm text-slate-600">
          Based on 50 years of S&P 500 historical performance (10.5% annual return)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Forecast Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
          <div>
            <Label htmlFor="years">Forecast Period (Years)</Label>
            <Input
              id="years"
              type="number"
              min="1"
              max="40"
              value={forecastYears}
              onChange={(e) => setForecastYears(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="monthly">Monthly Contribution ($)</Label>
            <Input
              id="monthly"
              type="number"
              min="0"
              step="50"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
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
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-slate-600">Conservative Scenario</div>
              <div className="text-xl font-bold text-orange-600">
                {formatCurrency(finalValue.conservative)}
              </div>
              <div className="text-xs text-slate-500">
                {formatPercentage(showInflationAdjusted ? SP500_REAL_RETURN - 0.02 : SP500_HISTORICAL_RETURN - 0.03)} annual
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-blue-50">
              <div className="text-sm text-slate-600">Expected Scenario</div>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(finalValue.expected)}
              </div>
              <div className="text-xs text-slate-500">
                {formatPercentage(showInflationAdjusted ? SP500_REAL_RETURN : SP500_HISTORICAL_RETURN)} annual
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-slate-600">Optimistic Scenario</div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(finalValue.optimistic)}
              </div>
              <div className="text-xs text-slate-500">
                {formatPercentage(showInflationAdjusted ? SP500_REAL_RETURN + 0.02 : SP500_HISTORICAL_RETURN + 0.03)} annual
              </div>
            </div>
          </div>
        )}

        {/* Forecast Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="year" 
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
                  name === 'conservative' ? 'Conservative' :
                  name === 'expected' ? 'Expected' :
                  name === 'optimistic' ? 'Optimistic' : 'Total Invested'
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
              <span className="text-slate-600">Total Invested</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-slate-600">Conservative</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-slate-600">Expected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span className="text-slate-600">Optimistic</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-center space-y-1">
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