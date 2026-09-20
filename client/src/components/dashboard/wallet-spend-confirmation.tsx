import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  formatWalletAmount,
  submissionLockAfterOpenTransition,
  type WalletSpendQuote,
} from "@/lib/wallet-spend";

interface WalletSpendConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  chapterLabel: string;
  quote: WalletSpendQuote;
  accessDescription: string;
  onConfirm: () => void;
  isPending: boolean;
  testId: string;
  children?: ReactNode;
  canConfirm?: boolean;
}

export function WalletSpendConfirmation({
  open,
  onOpenChange,
  memberName,
  chapterLabel,
  quote,
  accessDescription,
  onConfirm,
  isPending,
  testId,
  children,
  canConfirm = true,
}: WalletSpendConfirmationProps) {
  const submittedRef = useRef(false);
  const previousOpenRef = useRef(open);
  const isWalletPayment = quote.paymentType === "wallet" && quote.amount > 0;

  useEffect(() => {
    submittedRef.current = submissionLockAfterOpenTransition(
      previousOpenRef.current,
      open,
      submittedRef.current,
    );
    previousOpenRef.current = open;
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = (event: React.MouseEvent) => {
    event.preventDefault();
    if (isPending || submittedRef.current) return;
    submittedRef.current = true;
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <AlertDialogTitle>{isWalletPayment ? "Confirm wallet payment" : "Confirm benefit use"}</AlertDialogTitle>
          <AlertDialogDescription>
            Review the exact charge and access before continuing.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {children}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border p-3 text-sm">
          <dt className="text-muted-foreground">Member</dt>
          <dd className="text-right font-medium">{memberName}</dd>
          <dt className="text-muted-foreground">Chapter / gate</dt>
          <dd className="text-right font-medium">{chapterLabel}</dd>
          <dt className="text-muted-foreground">Payment</dt>
          <dd className="text-right font-semibold">{formatWalletAmount(quote.amount)}</dd>
          {quote.discountLabel && (
            <>
              <dt className="text-muted-foreground">Benefit applied</dt>
              <dd className="text-right">{quote.discountLabel}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Current wallet balance</dt>
          <dd className="text-right">{formatWalletAmount(quote.balance)}</dd>
          <dt className="text-muted-foreground">Resulting balance</dt>
          <dd className="text-right font-semibold">{formatWalletAmount(quote.resultingBalance)}</dd>
        </dl>

        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Access unlocked:</span> {accessDescription}</p>
          {isWalletPayment && (
            <p className="font-medium text-destructive">
              Wallet payments are non-refundable and cannot be withdrawn or transferred.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || quote.resultingBalance < 0 || !canConfirm}
            onClick={handleConfirm}
            data-testid={`${testId}-confirm`}
          >
            {isPending
              ? "Processing..."
              : isWalletPayment
                ? `Confirm ${formatWalletAmount(quote.amount)} payment`
                : "Confirm no-charge benefit"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}