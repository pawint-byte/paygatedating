import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Scan, Share2 } from "lucide-react";

export function QRCodeSection() {
  const siteUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : "https://paygate.pawint-app.com";

  return (
    <section className="py-16 md:py-24 bg-muted/30" data-testid="section-qr-code">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-qr-title">
            Take PayGate Dating With You
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-qr-description">
            Scan the QR code below to instantly access PayGate Dating on your mobile device. 
            Share it with friends to help them find meaningful connections too.
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
                Scan to open PayGate Dating
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6 max-w-sm">
            <div className="flex items-start gap-4" data-testid="card-qr-feature-easy-access">
              <div className="p-3 rounded-full bg-primary/10">
                <Scan className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Easy Access</h3>
                <p className="text-sm text-muted-foreground">
                  Open your phone's camera and point it at the QR code to instantly access the app
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4" data-testid="card-qr-feature-mobile-optimized">
              <div className="p-3 rounded-full bg-primary/10">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Mobile Optimized</h3>
                <p className="text-sm text-muted-foreground">
                  Our platform is fully responsive and works beautifully on any device
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4" data-testid="card-qr-feature-share">
              <div className="p-3 rounded-full bg-primary/10">
                <Share2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Share With Friends</h3>
                <p className="text-sm text-muted-foreground">
                  Screenshot the QR code and share it with friends looking for genuine connections
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
