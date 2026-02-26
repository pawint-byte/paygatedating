import { Wallet, Plus, ChevronDown, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Wallet as WalletType, Transaction } from "@shared/schema";

interface WalletDisplayProps {
  wallet: WalletType | null;
  transactions?: Transaction[];
  onAddFunds: () => void;
}

export function WalletDisplay({ wallet, transactions = [], onAddFunds }: WalletDisplayProps) {
  const balance = wallet ? parseFloat(wallet.balance) : 0;
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 font-normal" data-testid="button-wallet-dropdown">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold">${balance.toFixed(2)}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Wallet Balance</span>
              <span className="text-lg font-bold">${balance.toFixed(2)}</span>
            </div>

            {recentTransactions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Recent Activity
                </p>
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      {parseFloat(tx.amount) > 0 ? (
                        <ArrowDownLeft className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm">{tx.description || tx.type}</span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        parseFloat(tx.amount) > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {parseFloat(tx.amount) > 0 ? "+" : ""}${parseFloat(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent transactions
              </p>
            )}

            <p className="text-[11px] text-muted-foreground text-center leading-tight" data-testid="text-wallet-disclaimer">
              Wallet funds are for opening chapters only. Non-withdrawable and non-transferable.
            </p>

            <Button onClick={onAddFunds} className="w-full gap-2" data-testid="button-add-funds-dropdown">
              <Plus className="w-4 h-4" />
              Add Funds
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button onClick={onAddFunds} size="sm" data-testid="button-add-funds">
        <Plus className="w-4 h-4 mr-1" />
        Add Funds
      </Button>
    </div>
  );
}
