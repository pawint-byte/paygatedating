import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PREMIUM_MONTHLY_COST, PREMIUM_YEARLY_COST } from "@shared/schema";

const freeTierFeatures = [
  "Create your profile",
  "Browse all profiles",
  "View member photos",
  "Basic search filters",
];

const premiumFeatures = [
  "Everything in Free, plus:",
  "Unlock likes & requests",
  "Fund your wallet for gates",
  "Priority visibility",
  "Profile boost (monthly)",
  "Advanced matching filters",
  "Read receipts on messages",
  "See who viewed your profile",
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-card/50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            Simple Pricing
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground text-lg">
            Start free, upgrade when you're ready to connect.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-card border border-card-border rounded-lg p-8" data-testid="pricing-free">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <p className="text-muted-foreground mt-2">
                Perfect for exploring the platform
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {freeTierFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <a href="/api/login">
              <Button variant="outline" className="w-full" data-testid="button-start-free">
                Start Free
              </Button>
            </a>
          </div>

          <div
            className="bg-card border-2 border-primary rounded-lg p-8 relative"
            data-testid="pricing-premium"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Premium</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">${PREMIUM_MONTHLY_COST}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground mt-2">
                or ${PREMIUM_YEARLY_COST}/year (save 17%)
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <a href="/api/login">
              <Button className="w-full" data-testid="button-go-premium">
                Go Premium
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Gate payments are separate from subscription.{" "}
            <span className="text-foreground font-medium">
              Minimum wallet balance: $20 to start interacting.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
