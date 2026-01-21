import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MapPin, Sparkles, Shield, CheckCircle } from "lucide-react";

interface PublicProfileData {
  displayName: string;
  age?: number;
  location?: string;
  city?: string;
  bio?: string;
  tagline?: string;
  photos?: string[];
  verificationStatus: string;
  interests?: string[];
  referralCode?: string;
}

export default function InvitePage() {
  const [match, params] = useRoute("/invite/:referralCode");
  const [, setLocation] = useLocation();
  const referralCode = params?.referralCode;

  const { data: profile, isLoading, error } = useQuery<PublicProfileData>({
    queryKey: [`/api/invite/${referralCode}`],
    enabled: !!referralCode,
    retry: false,
  });

  const handleSignUp = () => {
    localStorage.setItem("referralCode", referralCode || "");
    setLocation("/");
  };

  const handleGoHome = () => {
    setLocation("/");
  };

  if (!match) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-pink-50 dark:from-rose-950/20 dark:via-background dark:to-pink-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-pink-50 dark:from-rose-950/20 dark:via-background dark:to-pink-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" data-testid="icon-not-found" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-not-found-title">Profile Not Found</h2>
            <p className="text-muted-foreground mb-6" data-testid="text-not-found-description">
              This invite link may have expired or the profile is no longer available.
            </p>
            <Button onClick={handleGoHome} data-testid="button-go-home">
              Go to PayGate Dating
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const photoUrl = profile.photos?.[0];
  const displayLocation = profile.city || profile.location;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-pink-50 dark:from-rose-950/20 dark:via-background dark:to-pink-950/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full overflow-hidden">
        <div className="relative">
          {photoUrl ? (
            <div className="h-64 w-full">
              <img 
                src={photoUrl} 
                alt={profile.displayName}
                className="w-full h-full object-cover"
                data-testid="img-profile-photo"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Heart className="w-20 h-20 text-primary/30" />
            </div>
          )}
          
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" data-testid="text-display-name">
                {profile.displayName}
                {profile.age && `, ${profile.age}`}
              </h1>
              {profile.verificationStatus === "verified" && (
                <Badge variant="secondary" className="bg-green-500/90 text-white border-0" data-testid="badge-verified">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            {displayLocation && (
              <p className="flex items-center gap-1 text-white/90 text-sm" data-testid="text-location">
                <MapPin className="w-4 h-4" />
                {displayLocation}
              </p>
            )}
          </div>
        </div>

        <CardHeader className="text-center pt-4 pb-2">
          {profile.tagline && (
            <CardDescription className="text-base italic" data-testid="text-tagline">
              "{profile.tagline}"
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {profile.bio && (
            <div className="text-center" data-testid="text-bio">
              <p className="text-muted-foreground line-clamp-3">{profile.bio}</p>
            </div>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center" data-testid="list-interests">
              {profile.interests.slice(0, 5).map((interest, i) => (
                <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-interest-${i}`}>
                  {interest}
                </Badge>
              ))}
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 text-center" data-testid="cta-container">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="font-medium" data-testid="text-cta-title">Want to connect?</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-cta-description">
              {profile.displayName} is on PayGate Dating. Sign up to send interest and start a conversation!
            </p>
            <Button 
              size="lg" 
              className="w-full"
              onClick={handleSignUp}
              data-testid="button-sign-up"
            >
              <Heart className="w-5 h-5 mr-2" />
              Sign Up to Connect
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2" data-testid="footer-info">
            <div className="flex items-center gap-1" data-testid="text-verified-profiles">
              <Shield className="w-4 h-4" />
              <span>ID Verified Profiles</span>
            </div>
            <div className="flex items-center gap-1" data-testid="text-serious-connections">
              <Heart className="w-4 h-4" />
              <span>Serious Connections</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
