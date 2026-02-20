import { Button } from "@/components/ui/button";
import { Check, Shield, Users } from "lucide-react";
import heroImage from "@assets/generated_images/romantic_couple_coffee_date.png";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] pt-24 pb-16 flex items-center">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-primary font-medium tracking-wide uppercase text-sm">
                Dating With Intent
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight font-serif">
                Meaningful Connections{" "}
                <span className="text-primary">Worth Investing In</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                PayGate transforms dating into a deliberate, invested journey.
                Our 5-gate progression system ensures every connection is
                genuine, eliminating spam and low-effort interactions.
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
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <span>10K+ Active Members</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <span>Free to Join</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <span>Secure Payments</span>
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
            <div className="absolute -bottom-6 -left-6 bg-card border border-card-border rounded-lg p-4 shadow-lg z-20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">87% Success Rate</p>
                  <p className="text-xs text-muted-foreground">
                    Meaningful connections
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
