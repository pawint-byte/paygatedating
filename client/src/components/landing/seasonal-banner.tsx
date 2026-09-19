import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Gift, Sun, Leaf, Snowflake, Flower2, Users } from "lucide-react";
import { useSeasonalTheme } from "@/contexts/seasonal-theme-context";

const iconMap: Record<string, typeof Heart> = {
  heart: Heart,
  sparkles: Sparkles,
  gift: Gift,
  sun: Sun,
  leaf: Leaf,
  snowflake: Snowflake,
  flower: Flower2,
  users: Users,
};

export function SeasonalBanner() {
  const { theme } = useSeasonalTheme();
  const { banner } = theme;
  
  const Icon = iconMap[banner.icon] || Heart;
  
  const scrollToSignup = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      className={`bg-gradient-to-r ${banner.gradient} dark:opacity-90 text-white px-3 py-2 sm:px-4 sm:py-3`}
      data-testid="banner-seasonal"
    >
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-sm sm:text-base">
        <div className="flex min-w-0 items-center justify-center gap-1.5">
          <Icon className="w-4 h-4 shrink-0 animate-pulse sm:w-5 sm:h-5" fill="currentColor" />
          <span className="font-semibold leading-tight" data-testid="text-seasonal-title">{banner.title}</span>
          <Icon className="w-4 h-4 shrink-0 animate-pulse sm:w-5 sm:h-5" fill="currentColor" />
        </div>
        
        <span className="hidden sm:inline opacity-90" data-testid="text-seasonal-tagline">
          {banner.tagline}
        </span>
        
        <div className="flex min-w-0 items-center justify-center gap-1.5">
          <Gift className="w-4 h-4 shrink-0" />
          <span className="font-medium leading-tight" data-testid="text-seasonal-offer">{banner.offer}</span>
          <Sparkles className="w-4 h-4 shrink-0" />
        </div>
        
        <Button 
          onClick={scrollToSignup}
          size="sm" 
          variant="secondary"
          className="h-8 shrink-0 px-3"
          data-testid="button-seasonal-cta"
        >
          {banner.cta}
        </Button>
      </div>
    </div>
  );
}
