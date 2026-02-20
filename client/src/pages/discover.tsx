import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MatchCard } from "@/components/dashboard/match-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ReferrerHighlight } from "@/components/dashboard/referrer-highlight";
import { SharePromoBanner } from "@/components/dashboard/share-promo-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { SlidersHorizontal } from "lucide-react";
import type { Profile, SearchPreferences } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/auth-utils";

interface EnrichedProfile extends Profile {
  wishlistPreview?: Array<{
    id: string;
    title: string;
    price: string;
    imageUrl?: string | null;
    platform: string;
    priceTier: string;
  }>;
  wishlistCount?: number;
}

export default function Discover() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [filterOpen, setFilterOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    minAge: 18,
    maxAge: 60,
    maxDistance: 100,
    genderPreference: [] as string[],
  });

  const { data: myProfile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const { data: searchPrefs } = useQuery<SearchPreferences>({
    queryKey: ["/api/search-preferences"],
  });

  useEffect(() => {
    if (searchPrefs) {
      setLocalFilters({
        minAge: searchPrefs.minAge ?? 18,
        maxAge: searchPrefs.maxAge ?? 60,
        maxDistance: searchPrefs.maxDistance ?? 100,
        genderPreference: searchPrefs.genderPreference ?? [],
      });
    }
  }, [searchPrefs]);

  const { data: profiles, isLoading, error } = useQuery<EnrichedProfile[]>({
    queryKey: ["/api/profiles/discover"],
  });

  // Debug: Log profiles data on production
  useEffect(() => {
    console.log("[Discover] profiles data:", profiles);
    console.log("[Discover] profiles length:", profiles?.length);
    console.log("[Discover] isLoading:", isLoading);
    console.log("[Discover] error:", error);
  }, [profiles, isLoading, error]);

  // Get profile user IDs for mutual connection counts
  const profileUserIds = useMemo(() => 
    profiles?.map(p => p.userId).filter(Boolean) || [], 
    [profiles]
  );

  // Fetch mutual connection counts for all discovered profiles (using GET with encoded params)
  const userIdsParam = profileUserIds.join(",");
  const { data: mutualCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/connections/mutual-counts", userIdsParam],
    enabled: profileUserIds.length > 0,
  });

  const updateFiltersMutation = useMutation({
    mutationFn: async (filters: Partial<SearchPreferences>) => {
      return await apiRequest("POST", "/api/search-preferences", filters);
    },
    onSuccess: () => {
      toast({
        title: "Filters Updated",
        description: "Your search preferences have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/discover"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search-preferences"] });
      setFilterOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update filters.",
        variant: "destructive",
      });
    },
  });

  const sendInterestMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest("POST", "/api/matches", { recipientId });
    },
    onSuccess: () => {
      toast({
        title: "Interest Sent!",
        description: "Your interest request has been sent. $5 has been deducted from your wallet.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/discover"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to send interest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const seedDemoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/setup/seed-demo-profiles");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Demo Profiles Added!",
        description: `Created ${data.count} demo profiles to explore.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/discover"] });
    },
    onError: (error: Error) => {
      if (error.message.includes("already exist")) {
        toast({
          title: "Already Set Up",
          description: "Demo profiles have already been added.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add demo profiles.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSendInterest = (profile: Profile) => {
    sendInterestMutation.mutate(profile.userId);
  };

  const handleApplyFilters = () => {
    updateFiltersMutation.mutate(localFilters);
  };

  const genderOptions = [
    { value: "male", label: "Men" },
    { value: "female", label: "Women" },
    { value: "non-binary", label: "Non-binary" },
  ];

  const toggleGenderPreference = (gender: string) => {
    setLocalFilters(prev => ({
      ...prev,
      genderPreference: prev.genderPreference.includes(gender)
        ? prev.genderPreference.filter(g => g !== gender)
        : [...prev.genderPreference, gender]
    }));
  };

  const handleShareClick = () => {
    setLocation("/profile");
  };

  return (
    <div className="p-4 md:p-6">
      {myProfile && (
        <div className="space-y-4 mb-6">
          <ReferrerHighlight currentUserId={myProfile.userId} />
          <SharePromoBanner 
            onShareClick={handleShareClick} 
            displayName={myProfile.displayName || "there"} 
          />
        </div>
      )}

      <div className="mb-4 md:mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-discover-title">Discover</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-discover-subtitle">
            Browse profiles and wishlists to find your match
          </p>
        </div>
        
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" data-testid="button-filters">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Search Filters</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              <div className="space-y-3">
                <Label>Age Range: {localFilters.minAge} - {localFilters.maxAge}</Label>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Minimum Age</span>
                    <Slider
                      value={[localFilters.minAge]}
                      onValueChange={([val]) => setLocalFilters(prev => ({ ...prev, minAge: val }))}
                      min={18}
                      max={99}
                      step={1}
                      className="mt-2"
                      data-testid="slider-min-age"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Maximum Age</span>
                    <Slider
                      value={[localFilters.maxAge]}
                      onValueChange={([val]) => setLocalFilters(prev => ({ ...prev, maxAge: val }))}
                      min={18}
                      max={99}
                      step={1}
                      className="mt-2"
                      data-testid="slider-max-age"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Maximum Distance: {localFilters.maxDistance} miles</Label>
                <Slider
                  value={[localFilters.maxDistance]}
                  onValueChange={([val]) => setLocalFilters(prev => ({ ...prev, maxDistance: val }))}
                  min={5}
                  max={500}
                  step={5}
                  data-testid="slider-distance"
                />
              </div>

              <div className="space-y-3">
                <Label>Show Me</Label>
                <div className="space-y-2">
                  {genderOptions.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`gender-${option.value}`}
                        checked={localFilters.genderPreference.includes(option.value)}
                        onCheckedChange={() => toggleGenderPreference(option.value)}
                        data-testid={`checkbox-gender-${option.value}`}
                      />
                      <Label htmlFor={`gender-${option.value}`} className="cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleApplyFilters} 
                className="w-full"
                disabled={updateFiltersMutation.isPending}
                data-testid="button-apply-filters"
              >
                {updateFiltersMutation.isPending ? "Applying..." : "Apply Filters"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/5] rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : !profiles || profiles.length === 0 ? (
        <div className="flex flex-col items-center gap-6">
          <EmptyState type="discover" />
          <Button 
            onClick={() => seedDemoMutation.mutate()}
            disabled={seedDemoMutation.isPending}
            variant="outline"
            data-testid="button-seed-demo"
          >
            {seedDemoMutation.isPending ? "Adding Demo Profiles..." : "Add Demo Profiles to Explore"}
          </Button>
        </div>
      ) : profiles.length < 5 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {profiles.map((profile) => (
              <MatchCard
                key={profile.id}
                profile={profile}
                onSendInterest={handleSendInterest}
                isPending={sendInterestMutation.isPending}
                mutualConnections={profile.userId ? mutualCounts?.[profile.userId] : undefined}
              />
            ))}
          </div>
          <div className="flex justify-center">
            <Button 
              onClick={() => seedDemoMutation.mutate()}
              disabled={seedDemoMutation.isPending}
              variant="outline"
              data-testid="button-seed-demo-more"
            >
              {seedDemoMutation.isPending ? "Adding Demo Profiles..." : "Add More Demo Profiles to Explore"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {profiles.map((profile) => (
            <MatchCard
              key={profile.id}
              profile={profile}
              onSendInterest={handleSendInterest}
              isPending={sendInterestMutation.isPending}
              mutualConnections={profile.userId ? mutualCounts?.[profile.userId] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
