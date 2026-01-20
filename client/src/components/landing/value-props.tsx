import { Target, Heart, Shield } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Quality Over Quantity",
    description:
      "Our fee-based system reduces interaction volume by 70-80%, ensuring every match you get is from someone genuinely interested in connecting.",
  },
  {
    icon: Heart,
    title: "Mutual Investment",
    description:
      "Both parties invest equally through the gates, creating balanced relationships where both sides are equally committed from the start.",
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description:
      "Stripe-powered escrow payments, anonymous gifting, and full refund protection ensure your safety and security at every step.",
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
            Dating Done Differently
          </h2>
          <p className="text-muted-foreground text-lg">
            We've reimagined online dating to prioritize meaningful connections
            over endless swiping.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <div
                key={value.title}
                className="bg-card border border-card-border rounded-lg p-8 hover-elevate"
                data-testid={`value-${value.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
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
