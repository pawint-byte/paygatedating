import {
  ArrowRight,
  Link2,
  Phone,
  MessageSquare,
  Camera,
  ShieldOff,
  Ban,
  X,
  CheckCircle2,
  ShieldCheck,
  EyeOff,
  Filter,
} from "lucide-react";
import { SiInstagram, SiSnapchat } from "react-icons/si";
import { Button } from "@/components/ui/button";

const oldWaySteps = [
  {
    icon: Phone,
    text: "Give out your number",
  },
  {
    icon: MessageSquare,
    text: "Get flooded with texts",
  },
  {
    icon: Ban,
    text: "Ghost, block, repeat",
  },
  {
    icon: ShieldOff,
    text: "They still have your info",
  },
];

const newWaySteps = [
  {
    icon: Link2,
    text: "Share your PayGate link",
  },
  {
    icon: Filter,
    text: "They start at Chapter 1",
  },
  {
    icon: ShieldCheck,
    text: "Chapters filter for you",
  },
  {
    icon: CheckCircle2,
    text: "Only serious people reach you",
  },
];

export function FrontDoorSection() {
  return (
    <section className="py-20 bg-muted/30" data-testid="section-front-door">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            The Smartest Link You'll Ever Share
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Your Link Is Your Front Door
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            You meet someone at the gym, at a bar, on Instagram, at a party.
            Instead of giving out your number and hoping for the best, give
            them your PayGate link. If they're serious, they'll start at
            Chapter 1. If they're not, they never had your number in the first
            place.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div
            className="bg-card border border-card-border rounded-md p-8 relative overflow-hidden"
            data-testid="front-door-old-way"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-destructive/60" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center">
                <X className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold">The Old Way</h3>
            </div>

            <div className="space-y-4 mb-6">
              {oldWaySteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3"
                    data-testid={`front-door-old-step-${i}`}
                  >
                    <div className="w-8 h-8 rounded-md bg-destructive/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-destructive" />
                    </div>
                    <p className="text-sm text-muted-foreground">{step.text}</p>
                    {i < oldWaySteps.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40 ml-auto shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 py-4 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground/50">
                <Phone className="w-5 h-5" />
                <span className="text-sm line-through">Your number</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground/50">
                <SiInstagram className="w-5 h-5" />
                <span className="text-sm line-through">Your IG</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground/50">
                <SiSnapchat className="w-5 h-5" />
                <span className="text-sm line-through">Your Snap</span>
              </div>
            </div>
          </div>

          <div
            className="bg-card border border-card-border rounded-md p-8 relative overflow-hidden"
            data-testid="front-door-new-way"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">The PayGate Way</h3>
            </div>

            <div className="space-y-4 mb-6">
              {newWaySteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3"
                    data-testid={`front-door-new-step-${i}`}
                  >
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm">{step.text}</p>
                    {i < newWaySteps.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-primary/40 ml-auto shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-3 py-4 border-t border-border">
              <Link2 className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">
                paygate.dating/you
              </span>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <div
            className="bg-card border border-card-border rounded-md p-6 text-center hover-elevate"
            data-testid="front-door-benefit-blocking"
          >
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Ban className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">No Blocking Needed</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              They never had your number, your socials, or your email.
              Nothing to block because nothing was given away.
            </p>
          </div>

          <div
            className="bg-card border border-card-border rounded-md p-6 text-center hover-elevate"
            data-testid="front-door-benefit-screenshots"
          >
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">No Screenshots Floating Around</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your profile is your front door, not your whole house.
              They see what you choose to share, nothing more.
            </p>
          </div>

          <div
            className="bg-card border border-card-border rounded-md p-6 text-center hover-elevate"
            data-testid="front-door-benefit-dms"
          >
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <EyeOff className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">No Strangers in Your DMs</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The chapters handle the vetting so you don't have to.
              Only people who've proven effort get through.
            </p>
          </div>
        </div>

        <div className="text-center">
          <a href="/api/login">
            <Button size="lg" className="text-base px-8" data-testid="button-front-door-cta">
              Create Your Link Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
          <p className="text-sm text-muted-foreground mt-3">
            Every suitor comes through here. That's the point.
          </p>
        </div>
      </div>
    </section>
  );
}
