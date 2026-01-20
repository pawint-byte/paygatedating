import { Button } from "@/components/ui/button";
import { SiFacebook, SiX, SiLinkedin, SiWhatsapp } from "react-icons/si";
import { Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SocialShareProps {
  url?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function SocialShare({ 
  url = typeof window !== 'undefined' ? window.location.href : 'https://paygate-dating.replit.app',
  title = "PayGate Dating - Meaningful Connections Worth Investing In",
  description = "Join PayGate Dating and get $15 in free credits! Find meaningful connections with our unique 5-gate system.",
  className = ""
}: SocialShareProps) {
  const { toast } = useToast();
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = [
    {
      name: "Facebook",
      icon: SiFacebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:text-[#1877F2]"
    },
    {
      name: "X",
      icon: SiX,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: "hover:text-foreground"
    },
    {
      name: "LinkedIn",
      icon: SiLinkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:text-[#0A66C2]"
    },
    {
      name: "WhatsApp",
      icon: SiWhatsapp,
      url: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: "hover:text-[#25D366]"
    }
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Share it with your friends to earn referral bonuses.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {shareLinks.map((link) => (
        <Button
          key={link.name}
          variant="ghost"
          size="icon"
          data-testid={`button-share-${link.name.toLowerCase()}`}
          className={`${link.color} transition-colors`}
          onClick={() => window.open(link.url, '_blank', 'width=600,height=400')}
          title={`Share on ${link.name}`}
        >
          <link.icon className="h-5 w-5" />
        </Button>
      ))}
      <Button
        variant="ghost"
        size="icon"
        data-testid="button-copy-link"
        onClick={copyToClipboard}
        title="Copy link"
      >
        <Link2 className="h-5 w-5" />
      </Button>
    </div>
  );
}
