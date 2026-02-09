import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { WishlistManager } from "@/components/dashboard/wishlist-manager";
import { GiftHistory } from "@/components/dashboard/gift-history";
import { IdeaInbox } from "@/components/dashboard/idea-inbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Plane, ShoppingBag, Heart, ChevronRight, ChevronLeft, X, CheckCircle2, Lightbulb } from "lucide-react";
import type { RegistryItem } from "@shared/schema";

type CategoryFilter = "all" | "gifts" | "experiences";

const categories = [
  {
    id: "all" as const,
    label: "All Items",
    icon: Sparkles,
    description: "Everything on your wishlist",
    color: "text-primary",
  },
  {
    id: "gifts" as const,
    label: "Gifts",
    icon: ShoppingBag,
    description: "Jewelry, fashion, home goods",
    color: "text-pink-500",
    platforms: ["Amazon", "Net-a-Porter"],
  },
  {
    id: "experiences" as const,
    label: "Experiences",
    icon: Plane,
    description: "Tours, activities, adventures",
    color: "text-blue-500",
    platforms: ["Viator", "Klook"],
  },
];

const guidedSteps = [
  {
    title: "Welcome to Your Wishlist",
    description: "Your wishlist shows admirers what makes you happy. When they gift you something, it proves genuine interest and unlocks deeper connection.",
    tip: "A great wishlist has variety - from sweet gestures to dream experiences!",
    icon: Gift,
  },
  {
    title: "Add Thoughtful Gifts",
    description: "Browse Amazon or Net-a-Porter for items you'd love to receive. Copy the product link and paste it here.",
    tip: "Start with a few affordable items ($25-50) so admirers can easily make a first move.",
    icon: ShoppingBag,
  },
  {
    title: "Include Dream Experiences",
    description: "Add tours, activities, or adventures from Viator or Klook. These are perfect for creating memories together!",
    tip: "A cooking class or sunset cruise says 'let's make memories' - very romantic!",
    icon: Plane,
  },
  {
    title: "Set Your Visibility",
    description: "Control who sees what. Some items can be public, others only for matches, or unlocked after the first gate.",
    tip: "Keep special items hidden until they've shown real commitment.",
    icon: Heart,
  },
];

export default function WishlistPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guideDismissed, setGuideDismissed] = useState(false);

  const { data: items = [], isLoading } = useQuery<RegistryItem[]>({
    queryKey: ["/api/registry"],
  });

  useEffect(() => {
    const dismissed = localStorage.getItem("wishlist-guide-dismissed") === "true";
    setGuideDismissed(dismissed);
    if (!dismissed && items.length === 0 && !isLoading) {
      setShowGuide(true);
    }
  }, [items.length, isLoading]);

  const dismissGuide = () => {
    setShowGuide(false);
    setGuideDismissed(true);
    localStorage.setItem("wishlist-guide-dismissed", "true");
  };

  const nextStep = () => {
    if (guideStep < guidedSteps.length - 1) {
      setGuideStep(guideStep + 1);
    } else {
      dismissGuide();
    }
  };

  const prevStep = () => {
    if (guideStep > 0) {
      setGuideStep(guideStep - 1);
    }
  };

  const currentStep = guidedSteps[guideStep];
  const StepIcon = currentStep?.icon || Gift;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">My Wishlist</h1>
          </div>
          {!showGuide && guideDismissed && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setShowGuide(true); setGuideStep(0); }}
              className="text-muted-foreground"
              data-testid="button-show-guide"
            >
              <Lightbulb className="w-4 h-4 mr-1" />
              View Guide
            </Button>
          )}
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Your wishlist is more than a shopping list - it's a glimpse into what makes you happy. 
          When someone gifts you an item, they're showing genuine interest and unlocking the next stage of connection.
        </p>
      </div>

      {showGuide && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <StepIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">Step {guideStep + 1} of {guidedSteps.length}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={dismissGuide}
                className="text-muted-foreground"
                data-testid="button-dismiss-guide"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{currentStep.description}</p>
            
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">{currentStep.tip}</p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="flex gap-1">
                {guidedSteps.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === guideStep ? "bg-primary" : idx < guideStep ? "bg-primary/50" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {guideStep > 0 && (
                  <Button variant="outline" size="sm" onClick={prevStep} data-testid="button-prev-step">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button size="sm" onClick={nextStep} data-testid="button-next-step">
                  {guideStep === guidedSteps.length - 1 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Got It!
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!showGuide && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Make your wishlist shine</p>
                <p className="text-sm text-muted-foreground">
                  Add a mix of items at different price points. Small gifts let admirers break the ice, 
                  while special items show serious commitment. Experiences create memories together!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Browse by category</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <Button
                key={category.id}
                variant={isActive ? "default" : "outline"}
                onClick={() => setActiveCategory(category.id)}
                className={`h-auto py-2 ${isActive ? "" : "bg-card"}`}
                data-testid={`filter-category-${category.id}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "" : category.color}`} />
                <div className="text-left">
                  <span className="font-medium text-sm">{category.label}</span>
                  {!isActive && (
                    <p className="text-xs text-muted-foreground font-normal">{category.description}</p>
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        {activeCategory !== "all" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing items from:</span>
            {categories.find(c => c.id === activeCategory)?.platforms?.map((platform) => {
              const platformUrls: Record<string, string> = {
                "Amazon": "https://www.amazon.com",
                "Net-a-Porter": "https://www.net-a-porter.com",
                "Viator": "https://www.viator.com",
                "Klook": "https://www.klook.com",
              };
              const url = platformUrls[platform];
              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`link-platform-${platform.toLowerCase()}`}
                >
                  <Badge variant="secondary" className="text-xs cursor-pointer">
                    {platform}
                  </Badge>
                </a>
              );
            })}
          </div>
        )}
      </div>

      <IdeaInbox />

      <WishlistManager categoryFilter={activeCategory} />
      
      <GiftHistory />
    </div>
  );
}
