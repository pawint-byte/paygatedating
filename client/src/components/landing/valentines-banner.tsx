import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Gift } from "lucide-react";

export function ValentinesBanner() {
  const scrollToSignup = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      className="bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 dark:from-rose-600 dark:via-pink-600 dark:to-red-600 text-white py-3 px-4"
      data-testid="banner-valentines"
    >
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 animate-pulse" fill="currentColor" />
          <span className="font-semibold" data-testid="text-valentines-title">Valentine's Day Special</span>
          <Heart className="w-5 h-5 animate-pulse" fill="currentColor" />
        </div>
        
        <span className="hidden sm:inline opacity-90" data-testid="text-valentines-tagline">
          Find your perfect match before Feb 14th
        </span>
        
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4" />
          <span className="font-medium" data-testid="text-valentines-offer">Join free and start connecting today</span>
          <Sparkles className="w-4 h-4" />
        </div>
        
        <Button 
          onClick={scrollToSignup}
          size="sm" 
          variant="secondary"
          data-testid="button-valentines-cta"
        >
          Start Free Today
        </Button>
      </div>
    </div>
  );
}
