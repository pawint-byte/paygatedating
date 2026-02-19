import { Gift, Heart, Shield, ShoppingBag } from "lucide-react";

const values = [
  {
    icon: Gift,
    title: "Gifts Show Intent",
    description:
      "Browse wishlists and send thoughtful gifts to show genuine interest. Every gift proves you're serious about connecting, filtering out low-effort matches.",
  },
  {
    icon: Heart,
    title: "Mutual Investment",
    description:
      "Both parties invest through our 5-gate system, creating balanced relationships where both sides show commitment from the start.",
  },
  {
    icon: ShoppingBag,
    title: "Curated Wishlists",
    description:
      "Build your wishlist from Amazon, Net-a-Porter, MR PORTER, Viator, and Klook. Suitors see exactly what you'd love, making gift-giving effortless and personal.",
  },
];

export function ValueProps() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            Why PayGate?
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Where Gifts Meet Genuine Connection
          </h2>
          <p className="text-muted-foreground text-lg">
            Your wishlist is your cover page. Thoughtful gifts unlock deeper
            stages of connection, ensuring every interaction is meaningful.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <div
                key={value.title}
                className="bg-card border border-card-border rounded-md p-8 hover-elevate"
                data-testid={`value-${value.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
