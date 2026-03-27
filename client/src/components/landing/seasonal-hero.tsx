import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Heart, MapPin, ShoppingBag, Sparkles, ArrowRight } from "lucide-react";
import { useSeasonalTheme } from "@/contexts/seasonal-theme-context";

const promoVideos = [
  { src: "/videos/promo-female.mp4", label: "Her Perspective" },
  { src: "/videos/promo-male.mp4", label: "His Perspective" },
  { src: "/videos/promo-travel.mp4", label: "Dating That Travels" },
];

export function SeasonalHero() {
  const { theme } = useSeasonalTheme();
  const { hero } = theme;
  const [currentVideo, setCurrentVideo] = useState(0);

  useEffect(() => {
    if (promoVideos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentVideo((prev) => (prev + 1) % promoVideos.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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

          <div className="relative" data-testid="hero-video-section">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
              <div className="relative aspect-[9/16] max-h-[520px] bg-black">
                <video
                  key={promoVideos[currentVideo].src}
                  src={promoVideos[currentVideo].src}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  data-testid="hero-promo-video"
                />
              </div>
            </div>

            {promoVideos.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {promoVideos.map((video, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentVideo(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === currentVideo
                        ? "bg-primary scale-110"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    data-testid={`video-dot-${i}`}
                  />
                ))}
              </div>
            )}

            <div className="absolute -bottom-4 -right-4 bg-card border border-card-border rounded-md p-3 shadow-lg z-20">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Every Chapter Counts</p>
                  <p className="text-xs text-muted-foreground">
                    Each one brings you closer to something real
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
