import { MapPin, Heart, Lock, Users, Gift, ShoppingBag, DollarSign, DoorOpen } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VerificationStatusIndicator } from "@/components/verified-badge";
import type { Profile } from "@shared/schema";
import { GATE_COSTS } from "@shared/schema";

interface WishlistPreviewItem {
  id: string;
  title: string;
  price: string;
  imageUrl?: string | null;
  platform: string;
  priceTier: string;
}

interface EnrichedProfile extends Profile {
  wishlistPreview?: WishlistPreviewItem[];
  wishlistCount?: number;
}

interface MatchCardProps {
  profile: EnrichedProfile;
  onSendInterest: (profile: Profile) => void;
  isPending?: boolean;
  mutualConnections?: number;
}

const platformColors: Record<string, string> = {
  Amazon: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Net-a-Porter": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "MR PORTER": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  Viator: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Klook: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Gift: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
};

export function MatchCard({ profile, onSendInterest, isPending, mutualConnections }: MatchCardProps) {
  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const primaryPhoto = profile.photos?.[0];
  const isDemoProfile = profile.userId?.startsWith("demo_");
  
  const showPhoto = profile.showPhotoPublicly !== false;
  const showName = profile.showFirstNamePublicly !== false;
  const showAge = profile.showAgePublicly !== false;
  const showLocation = profile.showLocationPublicly !== false;

  const displayName = showName ? profile.displayName : initials;
  const wishlistItems = profile.wishlistPreview || [];
  const wishlistCount = profile.wishlistCount || 0;

  return (
    <div
      className="bg-card border border-card-border rounded-md overflow-visible hover-elevate flex flex-col"
      data-testid={`match-card-${profile.id}`}
    >
      <div className="relative aspect-[4/5] bg-muted rounded-t-md overflow-hidden">
        {showPhoto && primaryPhoto ? (
          <img
            src={primaryPhoto}
            alt={showName ? profile.displayName : "Profile"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                {showPhoto ? initials : <Lock className="w-10 h-10" />}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <Badge variant="secondary" className="bg-black/50 text-white border-white/20 text-xs">
            <DollarSign className="w-3 h-3 mr-0.5" />
            ${GATE_COSTS.gate1} to connect
          </Badge>
          {isDemoProfile && (
            <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/50 text-xs">
              Demo
            </Badge>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg" data-testid={`text-name-${profile.id}`}>
              {displayName}
              {showAge && <span>, {profile.age}</span>}
            </h3>
            <VerificationStatusIndicator 
              status={profile.verificationStatus || "none"} 
              size="sm" 
            />
          </div>
          {showLocation && (profile.city || profile.location) && (
            <div className="flex items-center gap-1 text-sm text-white/80">
              <MapPin className="w-3 h-3" />
              <span>{profile.city || profile.location}</span>
            </div>
          )}
          {!showLocation && (profile.city || profile.location) && (
            <div className="flex items-center gap-1 text-sm text-white/60">
              <Lock className="w-3 h-3" />
              <span>Location hidden</span>
            </div>
          )}
          {mutualConnections && mutualConnections > 0 && (
            <div className="flex items-center gap-1 text-sm text-white/80 mt-1" data-testid={`mutual-connections-${profile.id}`}>
              <Users className="w-3 h-3" />
              <span>{mutualConnections} mutual {mutualConnections === 1 ? 'connection' : 'connections'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        {profile.tagline && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {profile.tagline}
          </p>
        )}

        {profile.imAtYourGate && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50/80 dark:bg-amber-950/20" data-testid={`im-at-your-gate-${profile.id}`}>
            <DoorOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300/90 line-clamp-2 leading-relaxed">
              {profile.imAtYourGate}
            </p>
          </div>
        )}

        {wishlistItems.length > 0 ? (
          <div className="space-y-2 flex-1" data-testid={`wishlist-preview-${profile.id}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Gift className="w-3 h-3" />
                Wishlist
              </span>
              {wishlistCount > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{wishlistCount - 3} more
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {wishlistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                  data-testid={`wishlist-item-${item.id}`}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-primary">${item.price}</span>
                      <Badge variant="outline" className={`text-[10px] leading-tight py-0 px-1 ${platformColors[item.platform] || ''}`}>
                        {item.platform}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-3">
            <div className="text-center text-muted-foreground">
              <Gift className="w-5 h-5 mx-auto mb-1 opacity-40" />
              <p className="text-xs">No wishlist items yet</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-1">
          <Button
            onClick={() => onSendInterest(profile)}
            disabled={isPending || isDemoProfile}
            className="flex-1 gap-1.5"
            data-testid={`button-send-interest-${profile.id}`}
          >
            <Heart className="w-4 h-4" />
            {isDemoProfile ? "Browse Only" : `Interest $${GATE_COSTS.gate1}`}
          </Button>
          {wishlistItems.length > 0 && (
            <Link href={`/profile/${profile.userId}`}>
              <Button
                variant="outline"
                size="icon"
                disabled={isDemoProfile}
                data-testid={`button-view-wishlist-${profile.id}`}
                title="View full wishlist"
              >
                <Gift className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
