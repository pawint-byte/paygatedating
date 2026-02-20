import { Check, DollarSign, Heart, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const freeFeatures = [
  "Create your full profile",
  "Browse all profiles and photos",
  "Build your gift wishlist",
  "Share your QR code and profile link",
  "Get discovered by interested singles",
  "Use the Nearby Map",
  "ID verification badge",
];

const payAsYouGoDetails = [
  "Gate 1: $5 — Break the ice",
  "Gate 2: $5 — Keep the conversation going",
  "Gate 3: $10 — Unlock chat messaging",
  "Gate 4: $15 — Go deeper",
  "Gate 5: $20 — Plan your first date",
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-card/50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            No Subscriptions. Ever.
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Free to Join. Pay Only When You Connect.
          </h2>
          <p className="text-muted-foreground text-lg">
            No monthly fees, no hidden charges. You invest only when you find someone worth pursuing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-card border border-card-border rounded-lg p-8" data-testid="pricing-free">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">Join Free</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <p className="text-muted-foreground mt-2">
                Everything you need to get started and get noticed
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
                Pay As You Go
              </span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">Gate Fees</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$5</span>
                <span className="text-muted-foreground">to start</span>
              </div>
              <p className="text-muted-foreground mt-2">
                Costs alternate between you and your match
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {payAsYouGoDetails.map((detail) => (
                <li key={detail} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{detail}</span>
                </li>
              ))}
            </ul>

            <a href="/api/login">
              <Button className="w-full" data-testid="button-start-connecting">
                Start Connecting
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-12 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Gift className="w-4 h-4 text-primary" />
            <span>
              Gift purchases include a small service fee (10% or $5 minimum) — that's how we keep the lights on.
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">
              Total cost for a full 5-gate connection: $55 split between two people.
            </span>
            {" "}No subscription needed.
          </p>
        </div>
      </div>
    </section>
  );
}
