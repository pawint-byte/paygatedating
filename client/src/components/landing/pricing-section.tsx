import { Check, Heart, Gift, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const freeFeatures = [
  "Create your full profile",
  "Browse and discover other members",
  "Build your personal wishlist",
  "Share your QR code and profile link",
  "Get noticed by interested singles",
  "Explore the Nearby Map",
  "Earn your verification badge",
];

const journeySteps = [
  "Gate 1: $5 -- Take the leap, say hello",
  "Gate 2: $5 -- Show you're genuinely interested",
  "Gate 3: $10 -- Open up, share more of yourself",
  "Gate 4: $15 -- Invest quality time together",
  "Gate 5: $20 -- Step into each other's real lives",
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-card/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            No Subscriptions. No Wasted Money.
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Free to Begin. Invest Only in People Who Matter.
          </h2>
          <p className="text-muted-foreground text-lg">
            You've already invested in yourself -- the growth, the discipline, the self-care.
            Don't waste that on a monthly subscription hoping someone notices. Invest only when
            you've found someone who's done the same work on themselves.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-card border border-card-border rounded-lg p-8" data-testid="pricing-free">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">Explore Free</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <p className="text-muted-foreground mt-2">
                Everything you need to put yourself out there and get discovered
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <a href="/api/login">
              <Button variant="outline" className="w-full" data-testid="button-start-free">
                Create My Free Profile
              </Button>
            </a>
          </div>

          <div
            className="bg-card border-2 border-primary rounded-lg p-8 relative"
            data-testid="pricing-payg"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Invest As You Go
              </span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Compass className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">The Journey</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$5</span>
                <span className="text-muted-foreground">to start</span>
              </div>
              <p className="text-muted-foreground mt-2">
                You and your match take turns investing -- equal effort, equal commitment
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {journeySteps.map((detail) => (
                <li key={detail} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{detail}</span>
                </li>
              ))}
            </ul>

            <a href="/api/login">
              <Button className="w-full" data-testid="button-start-connecting">
                Begin Your Journey
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-12 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Gift className="w-4 h-4 text-primary" />
            <span>
              Gifts include a small service fee (10% or $5 minimum) -- that's how we keep this community running.
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">
              Full connection cost: ~$55 split between two people.
            </span>
            {" "}Less than dinner for two -- and infinitely more meaningful.
          </p>
        </div>
      </div>
    </section>
  );
}
