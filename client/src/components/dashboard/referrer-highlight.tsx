import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { MATCH_INTENT_OPTIONS, type MatchIntent, type Profile, type UserRewards, type Wallet } from "@shared/schema";
import { sendKnockWithIntent } from "@/lib/knock-intent";
import { WalletSpendConfirmation } from "./wallet-spend-confirmation";
import {
  confirmedSpend,
  isStaleSpendConfirmation,
  knockSpendQuote,
  type ConfirmedSpend,
} from "@/lib/wallet-spend";

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
  const [intent, setIntent] = useState<MatchIntent | "">("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
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

  const { data: profile } = useQuery<Profile>({ queryKey: ["/api/profile"] });
  const { data: wallet } = useQuery<Wallet>({ queryKey: ["/api/wallet"] });
  const { data: rewards } = useQuery<UserRewards>({ queryKey: ["/api/rewards"] });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('referrerHighlightShown', 'true');
    localStorage.removeItem('referrerUserId');
  };

  const interestMutation = useMutation({
    mutationFn: async (confirmation: ConfirmedSpend) => {
      if (!referrerUserId || !intent) throw new Error("Choose an intent before confirming.");
      return sendKnockWithIntent(apiRequest, referrerUserId, intent, confirmation);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      toast({
        title: "Interest sent!",
        description: `${referrer?.displayName} will see your stated intent on this connection.`,
      });
      handleDismiss();
    },
    onError: (error: Error) => {
      if (isStaleSpendConfirmation(error)) {
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
        toast({
          title: "Confirmation expired",
          description: "The price or eligibility changed. Reopen the confirmation and review the updated details.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Couldn't express interest",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  if (dismissed || !referrerUserId || isLoading || !referrer) {
    return null;
  }

  const interestQuote = knockSpendQuote(wallet, profile?.subscriptionTier, rewards);

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
          <Select value={intent} onValueChange={(value) => setIntent(value as MatchIntent)}>
            <SelectTrigger className="flex-1" aria-label="Choose your intent" data-testid="select-referrer-knock-intent">
              <SelectValue placeholder="Choose intent" />
            </SelectTrigger>
            <SelectContent>
              {MATCH_INTENT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          State why you are knocking. Only choose an intent you mean.
        </p>
        <div className="flex gap-2 mt-3">
          <Button 
            className="flex-1"
            onClick={() => setConfirmationOpen(true)}
            disabled={!intent || interestMutation.isPending}
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
      <WalletSpendConfirmation
        open={confirmationOpen}
        onOpenChange={setConfirmationOpen}
        memberName={referrer.displayName}
        chapterLabel="Chapter 1: The Spark — paid interest / pending knock"
        quote={interestQuote}
        accessDescription="Creates a paid pending interest. The other member must accept before the match becomes active; this payment alone does not unlock the next chapter for both."
        onConfirm={() => interestMutation.mutate(confirmedSpend("gate1", interestQuote))}
        isPending={interestMutation.isPending}
        testId="confirm-referrer-knock"
        canConfirm={!!intent}
      />
    </Card>
  );
}
