import { ShieldCheck, Link2, QrCode, ArrowRight, Wine, Globe, Users, Music, MessageCircleX, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";

const scenarios = [
  {
    icon: Wine,
    title: "At a Bar or Party",
    description: "Someone cute? Hand them your link. If they're real about it, they'll show up at Chapter 1. If not, they never had your number.",
  },
  {
    icon: Globe,
    title: "On Social Media",
    description: "Put your PayGate link in your bio. Anyone who's interested starts there — not in your DMs. No more strangers sliding in uninvited.",
  },
  {
    icon: Users,
    title: "Through Friends",
    description: "Your friend knows someone? Send them your link. Let the chapters do the vetting your friend can't — no awkward \"it didn't work out\" conversations.",
  },
  {
    icon: Music,
    title: "At Events",
    description: "Networking, concerts, weddings — your QR code goes everywhere you go. One scan and they're at your front door, not in your contacts.",
  },
];

export function ConciergeSection() {
  const siteUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://paygate.pawint-app.com";

  return (
    <section className="py-20 bg-muted/30" data-testid="section-concierge">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-14 space-y-4">
          <p className="text-primary font-medium tracking-wide uppercase text-sm">
            How It Works In Real Life
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif">
            One Link.{" "}
            <span className="text-primary">Every Situation Covered.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Wherever you meet someone, the move is the same: share your PayGate
            link. They start at Chapter 1. The chapters filter for you. You
            never give out your number again.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {scenarios.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <Card
                key={scenario.title}
                className="p-6"
                data-testid={`concierge-scenario-${scenario.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{scenario.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {scenario.description}
                </p>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-16">
          <Card className="p-8" data-testid="concierge-for-her">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 dark:bg-rose-400/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-rose-500 dark:text-rose-400" />
              </div>
              <h3 className="text-lg font-semibold">For Her</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You never have to give out your number again. Your PayGate link is
              your bouncer — it stands between you and every stranger who wants
              access to your life.
            </p>
            <p className="text-sm font-medium">
              No more blocking. No more screenshots of your profile floating
              around. No more "how did he get my number?" Every connection starts
              on your terms, through your gate.
            </p>
          </Card>

          <Card className="p-8" data-testid="concierge-for-him">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold">For Him</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Standing out in her DMs is impossible. Show up at her gate instead
              — that's how she knows you're different. You're not sliding in.
              You're stepping up.
            </p>
            <p className="text-sm font-medium">
              The chapters prove you're serious before she ever has to wonder.
              No ghosting, no guessing — just a clear path that separates you
              from everyone else trying to get her attention.
            </p>
          </Card>
        </div>

        <div className="border-t border-border pt-16">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight font-serif mb-3">
              Your QR Code. Your Front Door.
            </h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Print it on a sticker, put it on your phone case, add it to your
              business card. Anyone who scans it lands at your gate — and the
              chapters take it from there.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <Card className="p-6" data-testid="concierge-qr-code">
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
            </Card>

            <div className="flex flex-col gap-6 max-w-sm">
              <div className="flex items-start gap-4" data-testid="concierge-feature-screen">
                <div className="p-3 rounded-full bg-primary/10">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Works Offline Too</h3>
                  <p className="text-sm text-muted-foreground">
                    At a concert and it's too loud to talk? Show your QR code.
                    At a gym and don't want to interrupt their set? Share your
                    code. It works when words don't.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4" data-testid="concierge-feature-no-dms">
                <div className="p-3 rounded-full bg-primary/10">
                  <MessageCircleX className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">One Funnel, Zero Noise</h3>
                  <p className="text-sm text-muted-foreground">
                    Instead of fielding random messages across five different
                    apps, funnel every interested person through one place.
                    Serious people start the chapters. The rest don't bother.
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
                    Instagram bio, dating app profile, group chat, brunch with
                    friends — one link replaces giving out your number on every
                    platform.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <a href="/api/login">
              <Button size="lg" className="text-base px-8" data-testid="button-concierge-signup">
                Create Your Link Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
