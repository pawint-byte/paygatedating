import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Gift, Trophy, Calendar, Users, Sparkles, CheckCircle, Wallet } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserRewards, RewardHistory } from "@shared/schema";

export function RewardsDashboard() {
  const { toast } = useToast();

  const { data: rewards, isLoading: rewardsLoading } = useQuery<UserRewards>({
    queryKey: ["/api/rewards"],
  });

  const { data: history, isLoading: historyLoading } = useQuery<RewardHistory[]>({
    queryKey: ["/api/rewards/history"],
  });

  const { data: seasonalOffers } = useQuery<Array<{
    type: string;
    title: string;
    description: string;
    discountPercent?: number;
    trialDays?: number;
    expiresAt: string;
  }>>({
    queryKey: ["/api/rewards/seasonal-offers"],
  });

  const claimProfileReward = useMutation({
    mutationFn: () => apiRequest("POST", "/api/rewards/claim-profile-completion"),
    onSuccess: () => {
      toast({
        title: "Reward Claimed!",
        description: "You earned $10 in bonus credits!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cannot Claim Reward",
        description: error.message || "Complete your profile 100% first",
        variant: "destructive",
      });
    },
  });

  if (rewardsLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-muted" />
              <CardContent className="h-24 bg-muted/50" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const streakProgress = rewards ? (rewards.loginStreak % 7) / 7 * 100 : 0;
  const referralTier1Progress = rewards ? Math.min((rewards.totalReferrals / 3) * 100, 100) : 0;
  const referralTier2Progress = rewards ? Math.min((rewards.totalReferrals / 10) * 100, 100) : 0;
  const monthlyMilestoneProgress = rewards ? Math.min((rewards.monthlyReferrals / 5) * 100, 100) : 0;

  return (
    <div className="p-6 space-y-6" data-testid="rewards-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rewards Center</h1>
          <p className="text-muted-foreground">Earn bonus credits and perks</p>
        </div>
        <Badge variant="default" className="bg-gradient-to-r from-emerald-500 to-teal-500">
          <Wallet className="w-3 h-3 mr-1" />
          Earn Credits
        </Badge>
      </div>

      {seasonalOffers && seasonalOffers.length > 0 && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Seasonal Offers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {seasonalOffers.map((offer, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div>
                  <h4 className="font-medium">{offer.title}</h4>
                  <p className="text-sm text-muted-foreground">{offer.description}</p>
                </div>
                <Badge>{offer.discountPercent ? `${offer.discountPercent}% OFF` : `${offer.trialDays} days`}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card data-testid="card-login-streak">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Login Streak
            </CardTitle>
            <CardDescription>Log in daily to earn $5 every 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold">{rewards?.loginStreak || 0}</span>
                <span className="text-muted-foreground ml-1">days</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Next reward</span>
                  <span>{7 - (rewards?.loginStreak || 0) % 7} days</span>
                </div>
                <Progress value={streakProgress} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Longest streak: {rewards?.longestStreak || 0} days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-referrals">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Referral Rewards
            </CardTitle>
            <CardDescription>Invite friends for bonus credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold">{rewards?.totalReferrals || 0}</span>
                <span className="text-muted-foreground ml-1">referrals</span>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>3 referrals = $10 credits</span>
                    {rewards && rewards.totalReferrals >= 3 ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <span>{3 - (rewards?.totalReferrals || 0)} to go</span>
                    )}
                  </div>
                  <Progress value={referralTier1Progress} className="h-2" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>10 referrals = $25 credits</span>
                    {rewards && rewards.totalReferrals >= 10 ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <span>{10 - (rewards?.totalReferrals || 0)} to go</span>
                    )}
                  </div>
                  <Progress value={referralTier2Progress} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-monthly-milestone">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Monthly Milestone
            </CardTitle>
            <CardDescription>5 referrals this month = $50 bonus!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rewards?.hasLifetimePremium ? (
                <div className="text-center py-4">
                  <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
                  <p className="font-bold text-lg">Milestone Achieved!</p>
                  <p className="text-sm text-muted-foreground">You earned the top referral bonus</p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <span className="text-4xl font-bold">{rewards?.monthlyReferrals || 0}</span>
                    <span className="text-muted-foreground ml-1">/ 5 this month</span>
                  </div>
                  <Progress value={monthlyMilestoneProgress} className="h-3" />
                  <p className="text-xs text-muted-foreground text-center">
                    Resets on the 1st of each month
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-profile-completion">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" />
              Profile Completion
            </CardTitle>
            <CardDescription>Complete 100% for $10 bonus credits</CardDescription>
          </CardHeader>
          <CardContent>
            {rewards?.profileCompletionRewardClaimed ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                <p className="font-medium">Reward Claimed!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Fill out all your profile fields to earn $10 in bonus credits toward gate fees.
                </p>
                <Button 
                  onClick={() => claimProfileReward.mutate()} 
                  disabled={claimProfileReward.isPending}
                  className="w-full"
                  data-testid="button-claim-profile-reward"
                >
                  {claimProfileReward.isPending ? "Claiming..." : "Claim Reward"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-first-match">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              First Match Free
            </CardTitle>
            <CardDescription>Gate 1 free on your first match</CardDescription>
          </CardHeader>
          <CardContent>
            {rewards?.firstMatchFreeUsed ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                <p className="font-medium">Reward Used!</p>
                <p className="text-sm text-muted-foreground">You saved $5 on Gate 1</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <Gift className="w-12 h-12 mx-auto text-primary mb-2" />
                <p className="font-medium">Ready to Use!</p>
                <p className="text-sm text-muted-foreground">Your first match will be free</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-weekend-boost">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Weekend Boost
            </CardTitle>
            <CardDescription>2x visibility on weekends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <Sparkles className="w-12 h-12 mx-auto text-purple-500 mb-2" />
              <p className="font-medium">Available for All Members!</p>
              <p className="text-sm text-muted-foreground">Your profile gets boosted visibility on weekends</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reward History</CardTitle>
            <CardDescription>Your earned rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {item.creditsAwarded && (
                      <Badge variant="outline" className="text-green-600">
                        +${item.creditsAwarded}
                      </Badge>
                    )}
                    {item.premiumDaysAwarded && (
                      <Badge variant="outline" className="text-purple-600">
                        +{item.premiumDaysAwarded} day bonus
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
