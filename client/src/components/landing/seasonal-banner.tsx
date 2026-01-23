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
      className={`bg-gradient-to-r ${banner.gradient} dark:opacity-90 text-white py-3 px-4`}
      data-testid="banner-seasonal"
    >
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 animate-pulse" fill="currentColor" />
          <span className="font-semibold" data-testid="text-seasonal-title">{banner.title}</span>
          <Icon className="w-5 h-5 animate-pulse" fill="currentColor" />
        </div>
        
        <span className="hidden sm:inline opacity-90" data-testid="text-seasonal-tagline">
          {banner.tagline}
        </span>
        
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4" />
          <span className="font-medium" data-testid="text-seasonal-offer">{banner.offer}</span>
          <Sparkles className="w-4 h-4" />
        </div>
        
        <Button 
          onClick={scrollToSignup}
          size="sm" 
          variant="secondary"
          data-testid="button-seasonal-cta"
        >
          {banner.cta}
        </Button>
      </div>
    </div>
  );
}
