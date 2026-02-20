import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
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
  ShoppingBag,
  DollarSign,
  ArrowRight,
  Crown,
  Gem,
  Waves,
  Handshake
} from "lucide-react";
import { SiTiktok, SiSnapchat } from "react-icons/si";
import { GATE_COSTS, DATING_STYLES, type DatingStyleKey } from "@shared/schema";

const DATING_STYLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  handshake: Handshake,
  crown: Crown,
  gem: Gem,
  waves: Waves,
};

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
  datingStyle?: string;
  profileMode?: string;
  viewerMessage?: string;
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
      case 'Viator': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Klook': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'Net-a-Porter': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'MR PORTER': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const primaryPhoto = profile.photos?.[0];
  const hasWishlist = profile.wishlist && profile.wishlist.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-pink-50 dark:from-rose-950/20 dark:via-background dark:to-pink-950/20">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-card border border-card-border rounded-md overflow-visible shadow-xl" data-testid="card-public-profile">
          <div className="relative aspect-[16/9] sm:aspect-[2/1] overflow-hidden rounded-t-md">
            {primaryPhoto ? (
              <img
                src={primaryPhoto}
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-rose-400 via-pink-400 to-red-400 dark:from-rose-600 dark:via-pink-600 dark:to-red-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            <div className="absolute top-4 right-4 flex flex-col gap-1.5">
              <Badge variant="secondary" className="bg-black/50 text-white border-white/20">
                <DollarSign className="w-3 h-3 mr-0.5" />
                ${GATE_COSTS.gate1} to connect
              </Badge>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex items-end gap-4">
                <Avatar className="w-20 h-20 border-3 border-white/30 shadow-lg flex-shrink-0">
                  <AvatarImage src={primaryPhoto} alt={profile.displayName} />
                  <AvatarFallback className="text-2xl bg-primary/20 text-white">
                    {profile.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-profile-name">
                      {profile.displayName}
                      {profile.age && <span>, {profile.age}</span>}
                    </h1>
                    {profile.verificationStatus === "verified" && (
                      <VerifiedBadge size="lg" />
                    )}
                  </div>
                  {profile.tagline && (
                    <p className="text-white/80 text-sm mb-1" data-testid="text-profile-tagline">
                      {profile.tagline}
                    </p>
                  )}
                  {(profile.location || profile.city) && (
                    <div className="flex items-center gap-1 text-sm text-white/70">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{profile.city || profile.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {profile.photos.length > 1 && (
            <div className="flex gap-1 p-3 overflow-x-auto">
              {profile.photos.slice(1, 5).map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`${profile.displayName} photo ${i + 2}`}
                  className="w-20 h-20 rounded-md object-cover flex-shrink-0"
                  data-testid={`img-photo-${i}`}
                />
              ))}
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Dating Style Badge & Viewer Message */}
            {(profile.datingStyle || profile.viewerMessage) && (
              <div className="space-y-3" data-testid="section-dating-style">
                {profile.datingStyle && DATING_STYLES[profile.datingStyle as DatingStyleKey] && (() => {
                  const styleData = DATING_STYLES[profile.datingStyle as DatingStyleKey];
                  const Icon = DATING_STYLE_ICONS[styleData.icon];
                  return (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                      {Icon && <Icon className="w-4 h-4 text-primary" />}
                      <span className="font-semibold text-sm">{styleData.label}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">-- {styleData.description}</span>
                    </div>
                  );
                })()}
                {profile.viewerMessage && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border" data-testid="text-viewer-message">
                    <p className="text-sm italic text-foreground leading-relaxed">"{profile.viewerMessage}"</p>
                  </div>
                )}
              </div>
            )}

            {hasWishlist && (
              <div data-testid="section-wishlist">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    {profile.displayName}'s Wishlist
                  </h2>
                  <Badge variant="outline">
                    {profile.wishlist.length} {profile.wishlist.length === 1 ? 'item' : 'items'}
                  </Badge>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {profile.wishlist.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate"
                      data-testid={`wishlist-item-${item.id}`}
                    >
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-14 h-14 object-cover rounded-md flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-sm font-semibold text-primary">${item.price}</span>
                          <Badge variant="outline" className={`text-[10px] leading-tight py-0 px-1 ${getPlatformColor(item.platform)}`}>
                            {item.platform}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.bio && (
              <div data-testid="section-about">
                <h2 className="text-lg font-semibold mb-2">About {profile.displayName}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-profile-bio">
                  {profile.bio}
                </p>
              </div>
            )}

            {profile.lookingFor && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Looking For</h2>
                <p className="text-sm text-muted-foreground">{profile.lookingFor}</p>
              </div>
            )}

            {profile.interests && profile.interests.length > 0 && (
              <div data-testid="section-interests">
                <h2 className="text-lg font-semibold mb-2">Interests</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, i) => (
                    <Badge key={i} variant="secondary" data-testid={`badge-interest-${i}`}>
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.socialLinks && Object.values(profile.socialLinks).some(v => v) && (
              <div className="flex items-center gap-3" data-testid="section-social">
                <span className="text-sm text-muted-foreground">Follow:</span>
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

            <div className="p-5 bg-gradient-to-r from-rose-100 via-pink-100 to-red-100 dark:from-rose-900/30 dark:via-pink-900/30 dark:to-red-900/30 rounded-md">
              <div className="text-center">
                <Sparkles className="w-6 h-6 mx-auto text-primary mb-2" />
                <h3 className="font-semibold mb-1">
                  {hasWishlist 
                    ? `Send ${profile.displayName} a gift to show you're serious`
                    : `Connect with ${profile.displayName}`
                  }
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasWishlist
                    ? "Thoughtful gifts unlock deeper stages of connection on PayGate"
                    : "Sign up for PayGate Dating and start a meaningful conversation"
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Link href={profile.referralCode ? `/invite/${profile.referralCode}` : "/"}>
                    <Button className="w-full sm:w-auto gap-2" data-testid="button-signup-cta">
                      <Heart className="w-4 h-4" />
                      Join PayGate Dating
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  {hasWishlist && (
                    <Link href={profile.referralCode ? `/invite/${profile.referralCode}` : "/"}>
                      <Button variant="outline" className="w-full sm:w-auto gap-2" data-testid="button-gift-cta">
                        <Gift className="w-4 h-4" />
                        Send a Gift
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          PayGate Dating - Where gifts build genuine connection
        </p>
      </div>
    </div>
  );
}
