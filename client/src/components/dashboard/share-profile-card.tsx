import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Download, 
  Share2, 
  Copy, 
  Check, 
  QrCode, 
  Sparkles,
  MessageCircle,
  Mail,
  Image as ImageIcon,
  Users,
  TrendingUp
} from "lucide-react";
import { SiWhatsapp, SiFacebook, SiX, SiInstagram } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

interface ShareProfileCardProps {
  userId: string;
  displayName: string;
  photoUrl?: string;
  referralCode?: string;
}

export function ShareProfileCard({ userId, displayName, photoUrl, referralCode }: ShareProfileCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const profileUrl = `${baseUrl}/p/${userId}`;
  const inviteUrl = referralCode ? `${baseUrl}/invite/${referralCode}` : profileUrl;
  
  const shareText = `Check out my profile on PayGate Dating! I'm looking for meaningful connections. See my wishlist and connect with me.`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Paste it anywhere to share your profile",
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

  const handleSMSShare = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(`${shareText}\n\n${inviteUrl}`)}`;
    window.open(smsUrl, '_blank');
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${inviteUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`;
    window.open(fbUrl, '_blank', 'width=600,height=400');
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(inviteUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Connect with ${displayName} on PayGate Dating`,
          text: shareText,
          url: inviteUrl,
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

  const handleDownloadProfileCard = async () => {
    setGeneratingCard(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      canvas.width = 600;
      canvas.height = 800;

      const gradient = ctx.createLinearGradient(0, 0, 600, 800);
      gradient.addColorStop(0, '#fce7f3');
      gradient.addColorStop(0.5, '#fdf2f8');
      gradient.addColorStop(1, '#fff1f2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 800);

      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 28px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PayGate Dating', 300, 50);

      if (photoUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = photoUrl;
        }).catch(() => {});
        
        if (img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(300, 160, 80, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 220, 80, 160, 160);
          ctx.restore();

          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(300, 160, 82, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(300, 160, 80, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Inter, system-ui, sans-serif';
        ctx.fillText(displayName.charAt(0).toUpperCase(), 300, 175);
      }

      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 32px Inter, system-ui, sans-serif';
      ctx.fillText(displayName, 300, 290);

      ctx.fillStyle = '#6b7280';
      ctx.font = '18px Inter, system-ui, sans-serif';
      ctx.fillText('Scan to view my profile & wishlist', 300, 330);

      const qrSvg = document.getElementById('share-profile-qr-code');
      if (qrSvg) {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const qrImg = new Image();
        
        await new Promise<void>((resolve) => {
          qrImg.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(175, 370, 250, 250);
            ctx.drawImage(qrImg, 175, 370, 250, 250);
            resolve();
          };
          qrImg.onerror = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(175, 370, 250, 250);
            ctx.fillStyle = '#6b7280';
            ctx.font = '14px Inter, system-ui, sans-serif';
            ctx.fillText('QR Code - Scan at:', 300, 480);
            ctx.fillText(inviteUrl, 300, 510);
            resolve();
          };
          qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        });
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(175, 370, 250, 250);
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.fillText('Visit:', 300, 480);
        ctx.fillText(inviteUrl, 300, 510);
      }

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 20px Inter, system-ui, sans-serif';
      ctx.fillText('Join & Get $15 Free Credits!', 300, 680);

      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillText(inviteUrl, 300, 720);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText('Meaningful connections worth investing in', 300, 770);

      const link = document.createElement('a');
      link.download = `paygate-${displayName.toLowerCase().replace(/\s+/g, '-')}-profile-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: "Profile card downloaded!",
        description: "Share it on social media or print it out",
      });
    } catch (err) {
      toast({
        title: "Failed to generate card",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setGeneratingCard(false);
    }
  };

  return (
    <Card data-testid="card-share-profile">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Share Your Profile
        </CardTitle>
        <CardDescription>
          Turn yourself into a walking billboard - every share could bring you closer to your perfect match
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-gradient-to-r from-rose-100 via-pink-100 to-red-100 dark:from-rose-900/30 dark:via-pink-900/30 dark:to-red-900/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Boost Your Visibility</p>
              <p className="text-sm text-muted-foreground">
                Members who share their profile receive 3x more interest from quality suitors. 
                Your QR code lets people see your wishlist before they even sign up!
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center p-4 bg-white rounded-lg border">
          <QRCodeSVG
            id="share-profile-qr-code"
            value={inviteUrl}
            size={180}
            level="H"
            includeMargin
            imageSettings={{
              src: "/favicon.ico",
              height: 24,
              width: 24,
              excavate: true,
            }}
          />
        </div>

        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <code className="flex-1 text-xs truncate" data-testid="text-share-url">
            {inviteUrl}
          </code>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={handleCopyLink}
            data-testid="button-copy-share-link"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div>
          <p className="text-sm font-medium mb-3">Quick Share</p>
          <div className="grid grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleSMSShare}
              className="h-12 w-full"
              data-testid="button-share-sms"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleWhatsAppShare}
              className="h-12 w-full text-green-600 hover:text-green-700"
              data-testid="button-share-whatsapp"
            >
              <SiWhatsapp className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleFacebookShare}
              className="h-12 w-full text-blue-600 hover:text-blue-700"
              data-testid="button-share-facebook"
            >
              <SiFacebook className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleTwitterShare}
              className="h-12 w-full"
              data-testid="button-share-twitter"
            >
              <SiX className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownloadProfileCard}
            disabled={generatingCard}
            data-testid="button-download-profile-card"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            {generatingCard ? 'Creating...' : 'Profile Card'}
          </Button>
          <Button 
            onClick={handleNativeShare}
            data-testid="button-share-native"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Pro Tips</p>
              <ul className="text-muted-foreground text-xs mt-1 space-y-1">
                <li>Add your QR code to your dating app bios</li>
                <li>Print pocket cards to hand out at events</li>
                <li>Share on Instagram Stories with "Scan to connect"</li>
                <li>You earn $5 when someone signs up through your link!</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
