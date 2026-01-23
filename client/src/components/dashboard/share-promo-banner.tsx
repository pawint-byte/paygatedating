import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  X, 
  QrCode, 
  Sparkles, 
  Users, 
  TrendingUp,
  ChevronRight,
  Heart
} from "lucide-react";

interface SharePromoBannerProps {
  onShareClick: () => void;
  displayName: string;
}

export function SharePromoBanner({ onShareClick, displayName }: SharePromoBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const dismissedUntil = localStorage.getItem('sharePromoDismissedUntil');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        setDismissed(true);
        return;
      }
    }
    
    const timer = setTimeout(() => setShowBanner(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    localStorage.setItem('sharePromoDismissedUntil', tomorrow.toISOString());
  };

  if (dismissed || !showBanner) return null;

  return (
    <Card 
      className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-rose-50 via-pink-50 to-red-50 dark:from-rose-950/30 dark:via-pink-950/30 dark:to-red-950/30"
      data-testid="banner-share-promo"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={handleDismiss}
        data-testid="button-dismiss-promo"
      >
        <X className="w-4 h-4" />
      </Button>

      <div className="p-4 pr-10">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex p-3 rounded-full bg-primary/10 shrink-0">
            <QrCode className="w-8 h-8 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Pro Tip for More Matches
              </span>
            </div>
            
            <h3 className="font-semibold text-sm sm:text-base mb-1">
              Become a Walking Billboard, {displayName}!
            </h3>
            
            <p className="text-xs sm:text-sm text-muted-foreground mb-3">
              Share your personal QR code anywhere - on dating apps, social media, or even print it on cards. 
              When someone scans it, they see your profile and wishlist. When they sign up, you earn $5!
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>3x more visibility</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                <span>Earn referral bonuses</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="w-3 h-3" />
                <span>Show your wishlist</span>
              </div>
            </div>

            <Button 
              size="sm" 
              onClick={onShareClick}
              data-testid="button-promo-share"
            >
              Share My Profile
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
