import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Edit, Trash2, Search } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InvestmentWithCurrentData } from "@shared/schema";

export function InvestmentTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: investments, isLoading } = useQuery<InvestmentWithCurrentData[]>({
    queryKey: ["/api/investments"],
  });

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/investments/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Investment Deleted",
        description: "Investment has been removed from your portfolio.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete investment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const refreshDataMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/market/refresh");
    },
    onSuccess: () => {
      toast({
        title: "Data Refreshed",
        description: "Market data has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api"] });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh market data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const filteredInvestments = investments?.filter(investment =>
    investment.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDeleteInvestment = (id: string) => {
    if (window.confirm("Are you sure you want to delete this investment?")) {
      deleteInvestmentMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Investment Holdings</CardTitle>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search investments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              onClick={() => refreshDataMutation.mutate()}
              disabled={refreshDataMutation.isPending}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {refreshDataMutation.isPending ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading investments...</div>
        ) : filteredInvestments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {searchTerm ? "No investments match your search." : "No investments found. Add your first investment to get started."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Avg Cost</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Gain/Loss</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestments.map((investment) => (
                  <TableRow key={investment.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-600">
                            {investment.symbol}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{investment.symbol}</p>
                          <p className="text-sm text-slate-500">{investment.companyName || "Stock"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {investment.shares}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {formatCurrency(investment.purchasePrice)}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {formatCurrency(investment.currentPrice)}
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      {formatCurrency(investment.currentValue)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${investment.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(investment.gainLoss)} ({formatPercent(investment.gainLossPercent)})
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteInvestment(investment.id)}
                          disabled={deleteInvestmentMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
