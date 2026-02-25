import { Button } from "@/components/ui/button";
import { Check, BookOpen, Users, Sparkles } from "lucide-react";
import heroImage from "@assets/generated_images/romantic_couple_coffee_date.png";

export function HeroSection() {
  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] pt-20 md:pt-24 pb-12 md:pb-16 flex items-center">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-primary font-medium tracking-wide uppercase text-sm">
                Five Chapters. Two People. One Story Worth Writing.
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight font-serif">
                Every Great Love Story{" "}
                <span className="text-primary">Has Chapters</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                You've already written incredible chapters of your own -- the
                growth, the discipline, the becoming. Now find someone whose
                story reads like the perfect next chapter. No subscriptions. No
                swiping. Just two people choosing to show up, one chapter at a
                time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href="/api/login">
                <Button size="lg" className="text-base px-8" data-testid="button-hero-start">
                  Start Your Story Free
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
                See the 5 Chapters
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <span>10K+ Stories Started</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <span>Free to Join</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <span>Chapter-Verified Connections</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-lg overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
              <img
                src={heroImage}
                alt="Couple having a meaningful conversation"
                className="w-full h-auto object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="absolute -bottom-4 -left-2 md:-bottom-6 md:-left-6 bg-card border border-card-border rounded-lg p-3 md:p-4 shadow-lg z-20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">87% Reach Chapter 3+</p>
                  <p className="text-xs text-muted-foreground">
                    Real conversations from real effort
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
