import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertInvestmentSchema } from "@shared/schema";
import type { InsertInvestment } from "@shared/schema";
import { z } from "zod";

const formSchema = insertInvestmentSchema;

type FormData = z.infer<typeof formSchema>;

export default function AddInvestment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      purchaseDate: new Date(),
    },
  });

  const createInvestmentMutation = useMutation({
    mutationFn: async (data: InsertInvestment) => {
      const response = await apiRequest("POST", "/api/investments", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Investment Added",
        description: "Your investment has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add investment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const investmentData: InsertInvestment = {
        amount: data.amount,
        purchaseDate: data.purchaseDate,
      };
      createInvestmentMutation.mutate(investmentData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch current S&P 500 price. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold">Add New Investment</h2>
            <p className="text-muted-foreground mt-1">Enter your investment details to start tracking</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Investment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="amount">Investment Amount (USD)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("amount", { valueAsNumber: true })}
                      className="pl-8"
                    />
                  </div>
                  {form.formState.errors.amount && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.amount.message}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    This amount will be invested in the S&P 500 (SPY) at current market price
                  </p>
                </div>

                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    defaultValue={new Date().toISOString().split('T')[0]}
                    {...form.register("purchaseDate", { 
                      valueAsDate: true,
                      setValueAs: (value) => value ? new Date(value) : undefined
                    })}
                    className="mt-1"
                  />
                  {form.formState.errors.purchaseDate && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.purchaseDate.message}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Select the date when you made this investment. Future dates are not allowed.
                  </p>
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <Button 
                    type="submit" 
                    disabled={createInvestmentMutation.isPending}
                    className="flex-1"
                  >
                    {createInvestmentMutation.isPending ? "Adding..." : "Add Investment"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLocation("/")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
