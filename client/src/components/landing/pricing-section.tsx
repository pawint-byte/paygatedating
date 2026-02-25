import { Check, Heart, Gift, BookOpen } from "lucide-react";
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

const chapterSteps = [
  "Chapter 1: $5 -- Light the spark, make your first move",
  "Chapter 2: $5 -- They write back, curiosity takes hold",
  "Chapter 3: $10 -- Walls come down, the real you shows up",
  "Chapter 4: $15 -- See the smile, hear the laugh, feel the chemistry",
  "Chapter 5: $20 -- Take your story beyond the screen",
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-card/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            No Subscriptions. No Wasted Chapters.
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Free to Begin. Pay Only to Turn the Page.
          </h2>
          <p className="text-muted-foreground text-lg">
            You've already invested in your own story -- the growth, the
            discipline, the becoming. Don't waste that on a monthly subscription
            hoping someone notices. Write the next chapter only when you've found
            someone worth writing it with.
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
                Everything you need to put your story out there and get discovered
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
                Turn the Page
              </span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">The 5 Chapters</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$5</span>
                <span className="text-muted-foreground">to start</span>
              </div>
              <p className="text-muted-foreground mt-2">
                You and your match take turns leading -- both people show up, both people write
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {chapterSteps.map((detail) => (
                <li key={detail} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{detail}</span>
                </li>
              ))}
            </ul>

            <a href="/api/login">
              <Button className="w-full" data-testid="button-start-connecting">
                Begin Your Story
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
              Full story cost: ~$55 split between two people.
            </span>
            {" "}Less than dinner for two -- and infinitely more meaningful.
          </p>
        </div>
      </div>
    </section>
  );
}
