import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertInvestmentSchema } from "@shared/schema";
import type { InsertInvestment } from "@shared/schema";
import { z } from "zod";

const formSchema = insertInvestmentSchema;

type FormData = z.infer<typeof formSchema>;

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddInvestmentModal({ isOpen, onClose }: AddInvestmentModalProps) {
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
      form.reset();
      onClose();
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
    const investmentData: InsertInvestment = {
      amount: data.amount,
      purchaseDate: data.purchaseDate,
    };
    createInvestmentMutation.mutate(investmentData);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Investment</DialogTitle>
          <DialogDescription>
            Add a new USD investment that will automatically track S&P 500 performance.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
            <p className="text-xs text-muted-foreground mt-1">
              Select the date when you made this investment.
            </p>
          </div>
          
          <div className="flex items-center space-x-3 pt-4">
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
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
