import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Share2, MessageCircleX } from "lucide-react";

export function QRCodeSection() {
  const siteUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : "https://paygate.pawint-app.com";

  return (
    <section className="py-16 md:py-24 bg-muted/30" data-testid="section-qr-code">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-qr-title">
            Your Link Is Your Velvet Rope
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-qr-description">
            Stop handing out your number to people who haven't earned it.
            Share your PayGate QR code instead -- at events, on social media,
            or anywhere you meet someone new. Let the chapters screen them first.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          <Card className="p-6" data-testid="card-qr-code">
            <CardContent className="p-0 flex flex-col items-center">
              <div className="p-4 bg-background rounded-lg border" data-testid="qr-code-container">
                <QRCodeSVG 
                  value={siteUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                  className="dark:invert"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground text-center" data-testid="text-qr-scan-label">
                Scan to see PayGate in action
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6 max-w-sm">
            <div className="flex items-start gap-4" data-testid="card-qr-feature-screen">
              <div className="p-3 rounded-full bg-primary/10">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Screen Before You Share</h3>
                <p className="text-sm text-muted-foreground">
                  Anyone who scans your code lands on your profile. They can express
                  interest -- but they have to start at Chapter 1 to reach you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4" data-testid="card-qr-feature-no-cold-dms">
              <div className="p-3 rounded-full bg-primary/10">
                <MessageCircleX className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">No More Cold DMs</h3>
                <p className="text-sm text-muted-foreground">
                  Instead of fielding random messages on every platform, funnel
                  all interest through one place. Serious people will show up.
                  The rest won't bother.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4" data-testid="card-qr-feature-share-anywhere">
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
    </section>
  );
}
