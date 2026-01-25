import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { GiftDeliveryScene } from "./GiftDeliveryScene";

interface GiftDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gift: {
    title: string;
    senderName: string;
    tier: 'starter' | 'impressive' | 'vip';
    price?: number;
  } | null;
}

export function GiftDeliveryModal({ open, onOpenChange, gift }: GiftDeliveryModalProps) {
  if (!gift) return null;

  const handleComplete = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] p-0 overflow-hidden bg-transparent border-0"
        data-testid="modal-gift-delivery"
      >
        <VisuallyHidden>
          <DialogTitle>Gift from {gift.senderName}</DialogTitle>
        </VisuallyHidden>
        <div className="h-[500px]">
          <GiftDeliveryScene
            tier={gift.tier}
            giftTitle={gift.title}
            senderName={gift.senderName}
            onComplete={handleComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function getPriceTier(price: number): 'starter' | 'impressive' | 'vip' {
  if (price >= 100) return 'vip';
  if (price >= 50) return 'impressive';
  return 'starter';
}
