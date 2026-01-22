import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { 
  Heart, 
  MapPin, 
  Gift, 
  ExternalLink, 
  Instagram, 
  Twitter,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import { SiTiktok, SiSnapchat } from "react-icons/si";

interface PublicWishlistItem {
  id: string;
  title: string;
  price: string;
  imageUrl?: string;
  description?: string;
  platform: string;
}

interface PublicProfile {
  userId: string;
  displayName: string;
  age?: number;
  location?: string;
  city?: string;
  bio?: string;
  tagline?: string;
  photos: string[];
  verificationStatus: string;
  interests: string[];
  lookingFor?: string;
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    snapchat?: string;
  };
  referralCode?: string;
  wishlist: PublicWishlistItem[];
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();

  const { data: profile, isLoading, error } = useQuery<PublicProfile>({
    queryKey: ["/api/public-profile", userId],
    queryFn: async () => {
      const res = await fetch(`/api/public-profile/${userId}`);
      if (!res.ok) throw new Error("Profile not found");
      return res.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-pink-50 dark:from-rose-950/20 dark:via-background dark:to-pink-950/20 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-pink-50 dark:from-rose-950/20 dark:via-background dark:to-pink-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This profile may be private or no longer available.
            </p>
            <Link href="/">
              <Button data-testid="button-go-home">
                Discover Singles Near You
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'Amazon': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Etsy': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'Viator': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Klook': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'Net-a-Porter': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-pink-50 dark:from-rose-950/20 dark:via-background dark:to-pink-950/20">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="overflow-hidden" data-testid="card-public-profile">
          <div className="relative">
            <div className="h-32 bg-gradient-to-r from-rose-400 via-pink-400 to-red-400 dark:from-rose-600 dark:via-pink-600 dark:to-red-600" />
            
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
              <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                <AvatarImage src={profile.photos[0]} alt={profile.displayName} />
                <AvatarFallback className="text-3xl">
                  {profile.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <CardContent className="pt-20 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" data-testid="text-profile-name">
                {profile.displayName}
                {profile.age && `, ${profile.age}`}
              </h1>
              {profile.verificationStatus === "verified" && (
                <VerifiedBadge size="lg" />
              )}
            </div>

            {profile.tagline && (
              <p className="text-muted-foreground italic mb-2" data-testid="text-profile-tagline">
                "{profile.tagline}"
              </p>
            )}

            {(profile.location || profile.city) && (
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
                <MapPin className="w-4 h-4" />
                <span>{profile.city || profile.location}</span>
              </div>
            )}

            {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
              <div className="flex items-center justify-center gap-3 mb-4">
                {profile.socialLinks.instagram && (
                  <a 
                    href={`https://instagram.com/${profile.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-pink-500 transition-colors"
                    data-testid="link-instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {profile.socialLinks.tiktok && (
                  <a 
                    href={`https://tiktok.com/@${profile.socialLinks.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-tiktok"
                  >
                    <SiTiktok className="w-5 h-5" />
                  </a>
                )}
                {profile.socialLinks.twitter && (
                  <a 
                    href={`https://twitter.com/${profile.socialLinks.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-blue-400 transition-colors"
                    data-testid="link-twitter"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {profile.socialLinks.snapchat && (
                  <a 
                    href={`https://snapchat.com/add/${profile.socialLinks.snapchat}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-yellow-500 transition-colors"
                    data-testid="link-snapchat"
                  >
                    <SiSnapchat className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}

            {profile.bio && (
              <p className="text-sm mb-4" data-testid="text-profile-bio">
                {profile.bio}
              </p>
            )}

            {profile.interests && profile.interests.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {profile.interests.slice(0, 6).map((interest, i) => (
                  <Badge key={i} variant="secondary" data-testid={`badge-interest-${i}`}>
                    {interest}
                  </Badge>
                ))}
              </div>
            )}

            {profile.wishlist && profile.wishlist.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold flex items-center justify-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-primary" />
                  Wishlist
                </h3>
                <div className="grid gap-3">
                  {profile.wishlist.slice(0, 5).map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg text-left"
                      data-testid={`wishlist-item-${item.id}`}
                    >
                      {item.imageUrl && (
                        <img 
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-14 h-14 object-cover rounded-md"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-semibold">${item.price}</span>
                          <Badge variant="outline" className={getPlatformColor(item.platform)}>
                            {item.platform}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {profile.wishlist.length > 5 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    +{profile.wishlist.length - 5} more items
                  </p>
                )}
              </div>
            )}

            <div className="mt-8 p-4 bg-gradient-to-r from-rose-100 via-pink-100 to-red-100 dark:from-rose-900/30 dark:via-pink-900/30 dark:to-red-900/30 rounded-lg">
              <Sparkles className="w-6 h-6 mx-auto text-primary mb-2" />
              <h3 className="font-semibold mb-1">Want to connect with {profile.displayName}?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Sign up for PayGate Dating and start a meaningful conversation
              </p>
              <Link href={profile.referralCode ? `/invite/${profile.referralCode}` : "/"}>
                <Button className="w-full" data-testid="button-signup-cta">
                  <Heart className="w-4 h-4 mr-2" />
                  Join PayGate Dating
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          PayGate Dating - Where meaningful connections begin
        </p>
      </div>
    </div>
  );
}
