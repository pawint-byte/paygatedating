import { WishlistManager } from "@/components/dashboard/wishlist-manager";
import { GiftHistory } from "@/components/dashboard/gift-history";

export default function WishlistPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Wishlist</h1>
        <p className="text-muted-foreground">
          Manage your gift wishlist - add items from Amazon, Etsy, Viator, Klook, or Net-a-Porter
        </p>
      </div>

      <WishlistManager />
      
      <GiftHistory />
    </div>
  );
}
