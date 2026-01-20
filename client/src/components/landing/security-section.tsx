import { Shield, Lock, CreditCard, RefreshCcw } from "lucide-react";
import { SiStripe } from "react-icons/si";

const securityFeatures = [
  {
    icon: CreditCard,
    title: "Stripe Secure Payments",
    description: "All transactions are processed through Stripe's PCI-compliant infrastructure.",
  },
  {
    icon: Lock,
    title: "Anonymous Shipping",
    description: "Send gifts without revealing your address. We handle delivery anonymously.",
  },
  {
    icon: RefreshCcw,
    title: "Escrow Protected",
    description: "Skip-ahead payments held in escrow. Full refund if no response in 7 days.",
  },
  {
    icon: Shield,
    title: "Data Privacy",
    description: "GDPR/CCPA compliant. Your data is encrypted and never sold to third parties.",
  },
];

export function SecuritySection() {
  return (
    <section className="py-20 bg-card/50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            Trust & Security
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Your Safety, Our Priority
          </h2>
          <p className="text-muted-foreground text-lg">
            We've built PayGate with security at its core, so you can focus on
            finding meaningful connections.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-card border border-card-border rounded-lg p-6 text-center"
                data-testid={`security-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <SiStripe className="w-12 h-8" />
            <span className="text-sm">Powered by Stripe</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="text-sm">256-bit SSL Encryption</span>
          </div>
        </div>
      </div>
    </section>
  );
}
