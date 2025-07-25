import { Sidebar } from "@/components/ui/sidebar";
import { PortfolioForecast } from "@/components/portfolio-forecast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calculator, Target, BarChart3 } from "lucide-react";

export default function Forecast() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8 ml-64">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Portfolio Forecast</h1>
              <p className="text-muted-foreground mt-2">
                Project your S&P 500 investment growth based on 50 years of historical performance
              </p>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Historical Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">10.5%</div>
                  <div className="text-sm text-muted-foreground">
                    Average annual return over last 50 years (1975-2025)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Includes dividends and compound growth
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Inflation-Adjusted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">6.6%</div>
                  <div className="text-sm text-muted-foreground">
                    Real returns after accounting for inflation
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Conservative planning figure
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Compound Power
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">10x</div>
                  <div className="text-sm text-muted-foreground">
                    Every $100 becomes ~$1,000 over 22 years
                  </div>
                  <div className="text-xs text-muted-foreground">
                    At 10.5% annual compound growth
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Forecast Component */}
          <PortfolioForecast />

          {/* Educational Information */}
          <Card>
            <CardHeader>
              <CardTitle>Understanding the Forecast</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Scenario Explanations</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <strong className="text-amber-600 dark:text-amber-400">Conservative (7.5%):</strong> Below historical average, accounting for potential economic headwinds or market volatility.
                    </div>
                    <div>
                      <strong className="text-blue-600 dark:text-blue-400">Expected (10.5%):</strong> Based on actual S&P 500 performance over the last 50 years including dividend reinvestment.
                    </div>
                    <div>
                      <strong className="text-green-600 dark:text-green-400">Optimistic (13.5%):</strong> Above historical average, reflecting periods of strong economic growth and market expansion.
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Key Assumptions</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>• Dividends are reinvested automatically</div>
                    <div>• No fees or taxes considered</div>
                    <div>• Regular monthly contributions compound over time</div>
                    <div>• Market follows long-term historical trends</div>
                    <div>• Economic conditions remain relatively stable</div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-6">
                <h4 className="font-semibold mb-2">Important Disclaimers</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>Past performance does not guarantee future results.</strong> The S&P 500 has experienced significant volatility, 
                    including major downturns in 2000-2002, 2008, and 2020. Individual year returns can vary dramatically from long-term averages.
                  </p>
                  <p>
                    These projections are for educational purposes only and should not be considered as investment advice. 
                    Always consult with a qualified financial advisor for personalized investment strategies.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}