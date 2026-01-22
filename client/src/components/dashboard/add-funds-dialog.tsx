import { useState } from "react";
import { CreditCard, DollarSign, Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MINIMUM_WALLET_BALANCE } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface AddFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFunds: (amount: number) => void;
  onAddFundsCrypto?: (amount: number) => void;
  isPending?: boolean;
  isCryptoPending?: boolean;
}

const quickAmounts = [20, 50, 100, 200];

export function AddFundsDialog({
  open,
  onOpenChange,
  onAddFunds,
  onAddFundsCrypto,
  isPending,
  isCryptoPending,
}: AddFundsDialogProps) {
  const [amount, setAmount] = useState<string>("50");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "crypto">("card");

  const { data: cryptoStatus } = useQuery<{ available: boolean; message: string }>({
    queryKey: ["/api/wallet/crypto/status"],
    enabled: open,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (numAmount >= MINIMUM_WALLET_BALANCE) {
      if (paymentMethod === "crypto" && onAddFundsCrypto) {
        onAddFundsCrypto(numAmount);
      } else {
        onAddFunds(numAmount);
      }
    }
  };

  const isProcessing = paymentMethod === "crypto" ? isCryptoPending : isPending;
  const cryptoAvailable = cryptoStatus?.available;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Funds to Wallet</DialogTitle>
          <DialogDescription>
            Add funds to start connecting with matches. Minimum balance: ${MINIMUM_WALLET_BALANCE}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentMethod === "card" ? "default" : "outline"}
                onClick={() => setPaymentMethod("card")}
                className="w-full gap-2"
                data-testid="button-payment-card"
              >
                <CreditCard className="w-4 h-4" />
                Card
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "crypto" ? "default" : "outline"}
                onClick={() => setPaymentMethod("crypto")}
                className="w-full gap-2"
                disabled={!cryptoAvailable}
                data-testid="button-payment-crypto"
              >
                <Bitcoin className="w-4 h-4" />
                Crypto
              </Button>
            </div>
            {!cryptoAvailable && (
              <p className="text-xs text-muted-foreground">
                Crypto payments coming soon
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Quick Select</Label>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant={amount === String(quickAmount) ? "default" : "outline"}
                  onClick={() => setAmount(String(quickAmount))}
                  className="w-full"
                  data-testid={`button-quick-amount-${quickAmount}`}
                >
                  ${quickAmount}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-amount">Custom Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="custom-amount"
                type="number"
                min={MINIMUM_WALLET_BALANCE}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                placeholder="Enter amount"
                data-testid="input-custom-amount"
              />
            </div>
            {parseFloat(amount) < MINIMUM_WALLET_BALANCE && (
              <p className="text-xs text-destructive">
                Minimum amount is ${MINIMUM_WALLET_BALANCE}
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span>${parseFloat(amount || "0").toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processing Fee</span>
              <span>$0.00</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-medium">
              <span>Total</span>
              <span>${parseFloat(amount || "0").toFixed(2)}</span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isProcessing || parseFloat(amount) < MINIMUM_WALLET_BALANCE}
            data-testid="button-confirm-add-funds"
          >
            {paymentMethod === "crypto" ? (
              <Bitcoin className="w-4 h-4" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {isProcessing ? "Processing..." : `Add $${parseFloat(amount || "0").toFixed(2)}`}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {paymentMethod === "crypto" 
              ? "Pay with Bitcoin, Ethereum, or 300+ cryptocurrencies via NOWPayments."
              : "Payments are securely processed by Stripe. Your card details are never stored."
            }
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
