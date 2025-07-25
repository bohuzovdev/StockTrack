import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/ui/sidebar";
import { PortfolioChart } from "@/components/portfolio-chart";
import type { InvestmentWithCurrentData } from "@shared/schema";

export default function HistoricalData() {
  const { data: investments, isLoading } = useQuery<InvestmentWithCurrentData[]>({
    queryKey: ["/api/investments"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800">Historical Data</h2>
          <p className="text-slate-500 mt-1">View your investment history and performance over time</p>
        </div>

        {/* Portfolio Performance Chart */}
        <div className="mb-8">
          <PortfolioChart />
        </div>

        {/* Investment Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Investment Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading investment history...</div>
            ) : investments?.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No investments found. Add your first investment to see historical data.
              </div>
            ) : (
              <div className="space-y-4">
                {investments?.map((investment) => (
                  <div key={investment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">
                          {investment.symbol}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{investment.symbol}</p>
                        <p className="text-sm text-slate-500">
                          Purchased {formatDate(investment.purchaseDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-800">
                        {investment.shares.toFixed(2)} shares at {formatCurrency(investment.purchasePrice)}
                      </p>
                      <p className="text-sm text-slate-500">
                        Total invested: {formatCurrency(investment.amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-800">
                        Current: {formatCurrency(investment.currentValue)}
                      </p>
                      <p className={`text-sm ${investment.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {investment.gainLoss >= 0 ? '+' : ''}{formatCurrency(investment.gainLoss)} 
                        ({investment.gainLossPercent >= 0 ? '+' : ''}{investment.gainLossPercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
