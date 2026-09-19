import { Link } from "wouter";
import { AlertTriangle, ArrowLeft, Flag, MapPin, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/landing/footer";
import { Seo } from "@/components/seo";

const tips = [
  {
    icon: Shield,
    title: "Keep private details private",
    text: "Do not put your street address, passwords, financial details, or government identification in chat. Use retailer checkout and the product's designated gift flow rather than sending an address in a message.",
  },
  {
    icon: Flag,
    title: "Use report and ghost controls",
    text: "If someone pressures, threatens, scams, or disappears during an active story, use the available report or ghost control. Stop contact when you feel unsafe.",
  },
  {
    icon: MapPin,
    title: "Meet carefully",
    text: "Choose a public place, arrange your own transportation, tell someone you trust where you are going, and leave whenever you are uncomfortable.",
  },
  {
    icon: AlertTriangle,
    title: "Know the limits",
    text: "PayGate is for adults 18 and older. PayGate is not a background-check service, and Stripe verifies payment processing—not a person's identity, intent, or safety.",
  },
];

export default function Safety() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Safety Tips | PayGate Dating"
        description="Practical guidance for protecting your privacy and meeting safely while using PayGate Dating."
        canonicalPath="/safety"
      />
      <main className="container mx-auto max-w-4xl px-6 py-12 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-8" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <p className="text-primary font-medium uppercase tracking-wide text-sm mb-3">Safety first</p>
        <h1 className="text-4xl font-bold font-serif mb-4">Safety Tips</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Five chapters can pace a conversation, but no payment or product feature guarantees another person's identity or intentions.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {tips.map(({ icon: Icon, title, text }) => (
            <section key={title} className="rounded-lg border bg-card p-6">
              <Icon className="w-6 h-6 text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">{title}</h2>
              <p className="text-muted-foreground leading-relaxed">{text}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-muted-foreground">
          If there is immediate danger, contact local emergency services. For site concerns, use the{" "}
          <Link href="/contact" className="text-primary underline">contact form</Link>.
        </p>
      </main>
      <Footer />
    </div>
  );
}