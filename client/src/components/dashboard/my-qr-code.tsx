import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Copy, Check, QrCode, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MyQRCodeProps {
  userId: string;
  displayName: string;
}

export function MyQRCode({ userId, displayName }: MyQRCodeProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const profileUrl = `${baseUrl}/p/${userId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share it with potential matches",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('profile-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 50, 50, 300, 300);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Scan to connect with ${displayName}`, 200, 380);
      }
      
      const link = document.createElement('a');
      link.download = `paygate-${displayName.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({
        title: "QR Code downloaded!",
        description: "Share it on social media or print it out",
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Connect with ${displayName} on PayGate Dating`,
          text: `Check out my profile and wishlist on PayGate Dating!`,
          url: profileUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Card data-testid="card-my-qr-code">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          Your Personal QR Code
        </CardTitle>
        <CardDescription>
          Share with people you meet - they can scan to view your profile and wishlist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCodeSVG
            id="profile-qr-code"
            value={profileUrl}
            size={200}
            level="H"
            includeMargin
            imageSettings={{
              src: "/favicon.ico",
              height: 30,
              width: 30,
              excavate: true,
            }}
          />
        </div>

        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <code className="flex-1 text-xs truncate" data-testid="text-profile-url">
            {profileUrl}
          </code>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={handleCopyLink}
            data-testid="button-copy-link"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownload}
            data-testid="button-download-qr"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button 
            onClick={handleShare}
            data-testid="button-share-qr"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        <div className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Pro tip for Valentine's Day</p>
              <p className="text-muted-foreground">
                Print your QR code on a card or add it to your dating profile bio to let potential suitors see your wishlist!
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
