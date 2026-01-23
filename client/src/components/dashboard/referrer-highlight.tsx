import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  X,
  Sparkles,
  MapPin,
  Gift,
  CheckCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReferrerProfile {
  userId: string;
  displayName: string;
  age?: number;
  city?: string;
  photos: string[];
  tagline?: string;
  verificationStatus: string;
  interests: string[];
  wishlist?: { id: string }[];
}

interface ReferrerHighlightProps {
  currentUserId: string;
}

export function ReferrerHighlight({ currentUserId }: ReferrerHighlightProps) {
  const [dismissed, setDismissed] = useState(false);
  const [referrerUserId, setReferrerUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedReferrer = localStorage.getItem('referrerUserId');
    const alreadyShown = localStorage.getItem('referrerHighlightShown');
    
    if (storedReferrer && !alreadyShown) {
      setReferrerUserId(storedReferrer);
    }
  }, []);

  const { data: referrer, isLoading } = useQuery<ReferrerProfile>({
    queryKey: ["/api/public-profile", referrerUserId],
    queryFn: async () => {
      const res = await fetch(`/api/public-profile/${referrerUserId}`);
      if (!res.ok) throw new Error("Profile not found");
      return res.json();
    },
    enabled: !!referrerUserId && !dismissed,
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('referrerHighlightShown', 'true');
    localStorage.removeItem('referrerUserId');
  };

  const handleExpressInterest = async () => {
    try {
      await apiRequest("POST", "/api/matches", { 
        recipientId: referrerUserId 
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      
      toast({
        title: "Interest sent!",
        description: `${referrer?.displayName} will be notified that you're interested.`,
      });
      
      handleDismiss();
    } catch (error: any) {
      toast({
        title: "Couldn't express interest",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    }
  };

  if (dismissed || !referrerUserId || isLoading || !referrer) {
    return null;
  }

  return (
    <Card 
      className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-r from-rose-50 via-pink-50 to-red-50 dark:from-rose-950/30 dark:via-pink-950/30 dark:to-red-950/30"
      data-testid="card-referrer-highlight"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 z-10"
        onClick={handleDismiss}
        data-testid="button-dismiss-referrer"
      >
        <X className="w-4 h-4" />
      </Button>

      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span className="font-semibold text-sm">Someone invited you to connect!</span>
        </div>

        <div className="flex items-start gap-4">
          <Avatar className="w-20 h-20 border-2 border-primary/30">
            <AvatarImage src={referrer.photos[0]} alt={referrer.displayName} />
            <AvatarFallback className="text-2xl">
              {referrer.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg">
                {referrer.displayName}
                {referrer.age && `, ${referrer.age}`}
              </h3>
              {referrer.verificationStatus === "verified" && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>

            {referrer.city && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                <MapPin className="w-3 h-3" />
                {referrer.city}
              </p>
            )}

            {referrer.tagline && (
              <p className="text-sm italic text-muted-foreground mb-2">
                "{referrer.tagline}"
              </p>
            )}

            {referrer.interests && referrer.interests.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {referrer.interests.slice(0, 3).map((interest, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            )}

            {referrer.wishlist && referrer.wishlist.length > 0 && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Gift className="w-3 h-3 text-primary" />
                {referrer.wishlist.length} items on wishlist
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button 
            className="flex-1"
            onClick={handleExpressInterest}
            data-testid="button-express-interest-referrer"
          >
            <Heart className="w-4 h-4 mr-2" />
            Express Interest
          </Button>
          <Button 
            variant="outline"
            onClick={handleDismiss}
            data-testid="button-skip-referrer"
          >
            Maybe Later
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-3">
          {referrer.displayName} shared their profile with you. Show them you're interested!
        </p>
      </CardContent>
    </Card>
  );
}
