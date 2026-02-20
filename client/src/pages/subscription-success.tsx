import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Heart, Sparkles } from "lucide-react";

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2" data-testid="text-subscription-success-title">
            <Heart className="w-6 h-6 text-primary" />
            Welcome to PayGate!
          </CardTitle>
          <CardDescription data-testid="text-subscription-confirmed">
            Your account is all set
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2" data-testid="text-premium-benefits">
              <Sparkles className="w-4 h-4 text-primary" />
              What's Included — Free Forever
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2" data-testid="list-benefits">
              <li className="flex items-start gap-2" data-testid="benefit-unlimited-matches">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>Browse all profiles and get discovered</span>
              </li>
              <li className="flex items-start gap-2" data-testid="benefit-see-interested">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>Build your wishlist and share your QR code</span>
              </li>
              <li className="flex items-start gap-2" data-testid="benefit-priority-visibility">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>Pay only when you connect — starting at $5</span>
              </li>
              <li className="flex items-start gap-2" data-testid="benefit-advanced-filters">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>No subscriptions, no monthly fees</span>
              </li>
            </ul>
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={() => setLocation("/discover")}
            data-testid="button-start-discovering"
          >
            Start Discovering Matches
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Thank you for choosing PayGate Dating. We're excited to help you find meaningful connections!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
