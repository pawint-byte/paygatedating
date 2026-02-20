import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Heart, MapPin, ShoppingBag, Sparkles, DollarSign, ArrowRight } from "lucide-react";
import { useSeasonalTheme } from "@/contexts/seasonal-theme-context";
import heroImage from "@assets/generated_images/romantic_couple_coffee_date.png";

const mockWishlistItems = [
  { title: "Gold Pendant Necklace", price: "$89", platform: "Net-a-Porter", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { title: "Sunset Sailing Tour", price: "$65", platform: "Viator", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { title: "Scented Candle Set", price: "$35", platform: "Amazon", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
];

export function SeasonalHero() {
  const { theme } = useSeasonalTheme();
  const { hero } = theme;

  return (
    <section className="relative min-h-[90vh] pt-24 pb-16 flex items-center">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-primary font-medium tracking-wide uppercase text-sm" data-testid="text-hero-subtitle">
                {hero.subtitle}
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight font-serif">
                {hero.headline}{" "}
                <span className="text-primary" data-testid="text-hero-highlight">{hero.highlightText}</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg" data-testid="text-hero-description">
                {hero.description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href="/api/login">
                <Button size="lg" className="text-base px-8" data-testid="button-hero-start">
                  Start Free Profile
                </Button>
              </a>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                data-testid="button-hero-learn"
              >
                See How It Works
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-primary" />
                </div>
                <span>Gifts Unlock Connection</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-primary" />
                </div>
                <span>Serious Seekers Only</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <span>3D Gift Experience</span>
              </div>
            </div>
          </div>

          <div className="relative" data-testid="hero-profile-preview">
            <div className="relative bg-card border border-card-border rounded-md overflow-visible shadow-xl">
              <div className="relative aspect-[3/2] overflow-hidden rounded-t-md">
                <img
                  src={heroImage}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-black/50 text-white border-white/20 text-xs">
                    <DollarSign className="w-3 h-3 mr-0.5" />
                    $5 to connect
                  </Badge>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-xl">Sarah, 28</h3>
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200 border-emerald-500/30 text-xs">
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-white/80">
                    <MapPin className="w-3 h-3" />
                    <span>New York, NY</span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-primary" />
                    Her Wishlist
                  </span>
                  <span className="text-xs text-muted-foreground">3 items</span>
                </div>

                <div className="space-y-2">
                  {mockWishlistItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 p-2 rounded-md bg-muted/50"
                    >
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-primary">{item.price}</span>
                          <Badge variant="outline" className={`text-[10px] leading-tight py-0 px-1 ${item.color}`}>
                            {item.platform}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-1.5" size="sm">
                    <Heart className="w-3.5 h-3.5" />
                    Send Interest
                  </Button>
                  <Button variant="outline" className="flex-1 gap-1.5" size="sm">
                    <Gift className="w-3.5 h-3.5" />
                    Send Gift
                  </Button>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 bg-card border border-card-border rounded-md p-3 shadow-lg z-20">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Gifts Build Trust</p>
                  <p className="text-xs text-muted-foreground">
                    Thoughtful gifts unlock deeper connection
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
