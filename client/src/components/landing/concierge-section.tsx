import { ShieldCheck, Link2, QrCode, ArrowRight, UserCheck, MessageCircleX, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";

const steps = [
  {
    icon: UserCheck,
    step: "1",
    title: "Create Your Profile",
    description: "Set up your profile once -- your photos, your vibe, your wishlist. This becomes your personal screening page.",
  },
  {
    icon: Link2,
    step: "2",
    title: "Share Your Link, Not Your Number",
    description: "Met someone at the gym, a party, or on social media? Hand them your PayGate link instead of your phone number. Let the gates do the vetting.",
  },
  {
    icon: ShieldCheck,
    step: "3",
    title: "Let PayGate Screen Them",
    description: "If they're serious, they'll open a gate. If they're not, you just saved yourself the wasted time, energy, and awkward conversations.",
  },
];

export function ConciergeSection() {
  const siteUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://paygate.pawint-app.com";

  return (
    <section className="py-20 bg-muted/30" data-testid="section-concierge">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-primary font-medium tracking-wide uppercase text-sm">
                Your Personal Dating Concierge
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif">
                Stop Giving Out Your Number.{" "}
                <span className="text-primary">Give Them Your Link.</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                You wouldn't let a stranger walk into your house without knocking.
                So why let them into your life without being screened? Create your
                profile once, then route every future suitor through PayGate. Think
                of it as a velvet rope for your dating life -- only the serious ones
                get through.
              </p>
            </div>

            <div className="space-y-6">
              {steps.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="flex items-start gap-4"
                    data-testid={`concierge-step-${item.step}`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">
                        <span className="text-primary mr-1.5">{item.step}.</span>
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <a href="/api/login">
              <Button size="lg" className="text-base px-8 mt-2" data-testid="button-concierge-signup">
                Create Your Free Profile
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-card-border rounded-lg p-8" data-testid="concierge-for-her">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 dark:bg-rose-400/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold">For Her</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You've invested too much in yourself to let just anyone in.
                Your fitness routine, your skincare, your career, your growth --
                all of that deserves to be met with equal effort.
              </p>
              <p className="text-sm font-medium">
                Share your PayGate profile at brunch, on your Instagram story, or
                at the next event. Any guy who's interested has to come through the
                front door and prove he's serious before he gets your time.
              </p>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-8" data-testid="concierge-for-him">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold">For Him</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You don't chase -- you attract. You've built yourself into someone
                worth knowing through discipline, ambition, and self-improvement.
              </p>
              <p className="text-sm font-medium">
                Put your PayGate profile in your bio, on your business card, or share
                it directly. The women who are genuinely interested will come to you --
                and the gates ensure she's equally invested in the connection.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-16">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight font-serif mb-3">
              Your QR Code. Your Velvet Rope.
            </h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every profile gets a unique QR code. Print it, post it, share it anywhere.
              Anyone who scans it lands on your profile -- and the gates handle the rest.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div className="bg-card border border-card-border rounded-lg p-6" data-testid="concierge-qr-code">
              <div className="p-4 bg-background rounded-lg border">
                <QRCodeSVG
                  value={siteUrl}
                  size={180}
                  level="H"
                  includeMargin={true}
                  className="dark:invert"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Scan to see PayGate in action
              </p>
            </div>

            <div className="flex flex-col gap-6 max-w-sm">
              <div className="flex items-start gap-4" data-testid="concierge-feature-screen">
                <div className="p-3 rounded-full bg-primary/10">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Screen Before You Share</h3>
                  <p className="text-sm text-muted-foreground">
                    Anyone who scans your code lands on your profile. They can express
                    interest -- but they have to go through the gates to reach you.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4" data-testid="concierge-feature-no-dms">
                <div className="p-3 rounded-full bg-primary/10">
                  <MessageCircleX className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">No More Cold DMs</h3>
                  <p className="text-sm text-muted-foreground">
                    Instead of fielding random messages on every platform, funnel
                    all interest through one place. Serious people show up. The rest won't bother.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4" data-testid="concierge-feature-share">
                <div className="p-3 rounded-full bg-primary/10">
                  <Share2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Share It Everywhere</h3>
                  <p className="text-sm text-muted-foreground">
                    Instagram bio, business card, group chat, brunch with friends --
                    your QR code works anywhere. Print it, screenshot it, post it.
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
