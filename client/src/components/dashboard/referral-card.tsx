import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Copy, Gift, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { REFERRAL_BONUS_AMOUNT, TRIAL_CREDITS_AMOUNT } from "@shared/schema";
import { useState } from "react";

interface ReferralInfo {
  referralCode: string;
  totalReferrals: number;
  bonusEarned: number;
  referrals: Array<{
    id: string;
    createdAt: string;
    bonusPaid: boolean;
  }>;
}

export function ReferralCard() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: referralInfo, isLoading } = useQuery<ReferralInfo>({
    queryKey: ["/api/referral"],
  });

  const copyToClipboard = async () => {
    if (referralInfo?.referralCode) {
      await navigator.clipboard.writeText(referralInfo.referralCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = referralInfo?.referralCode 
    ? `${window.location.origin}?ref=${referralInfo.referralCode}`
    : "";

  const copyShareLink = async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link Copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle>Referral Program</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <CardTitle>Referral Program</CardTitle>
        </div>
        <CardDescription>
          Invite friends and earn ${REFERRAL_BONUS_AMOUNT} for each friend who joins!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-primary" />
            <span className="font-medium">How it works</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Share your unique code with friends</li>
            <li>They get ${TRIAL_CREDITS_AMOUNT} free credits when they sign up</li>
            <li>You earn ${REFERRAL_BONUS_AMOUNT} for each successful referral</li>
          </ul>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Your Referral Code</label>
          <div className="flex gap-2">
            <Input
              value={referralInfo?.referralCode || ""}
              readOnly
              className="font-mono text-lg tracking-wider"
              data-testid="input-referral-code"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={copyToClipboard}
              data-testid="button-copy-referral-code"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Share Link</label>
          <div className="flex gap-2">
            <Input
              value={shareLink}
              readOnly
              className="text-sm"
              data-testid="input-share-link"
            />
            <Button 
              variant="outline" 
              onClick={copyShareLink}
              data-testid="button-copy-share-link"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary" data-testid="text-total-referrals">
              {referralInfo?.totalReferrals || 0}
            </div>
            <div className="text-sm text-muted-foreground">Friends Referred</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600" data-testid="text-bonus-earned">
              ${referralInfo?.bonusEarned || 0}
            </div>
            <div className="text-sm text-muted-foreground">Bonus Earned</div>
          </div>
        </div>

        {referralInfo?.referrals && referralInfo.referrals.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Referrals</h4>
            <div className="space-y-2">
              {referralInfo.referrals.slice(0, 5).map((referral) => (
                <div 
                  key={referral.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                >
                  <span className="text-sm text-muted-foreground">
                    {new Date(referral.createdAt).toLocaleDateString()}
                  </span>
                  <Badge variant={referral.bonusPaid ? "default" : "secondary"}>
                    {referral.bonusPaid ? `+$${REFERRAL_BONUS_AMOUNT}` : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
