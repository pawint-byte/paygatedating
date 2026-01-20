import { MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@shared/schema";
import { GATE_COSTS } from "@shared/schema";

interface MatchCardProps {
  profile: Profile;
  onSendInterest: (profile: Profile) => void;
  isPending?: boolean;
}

export function MatchCard({ profile, onSendInterest, isPending }: MatchCardProps) {
  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const primaryPhoto = profile.photos?.[0];

  return (
    <div
      className="bg-card border border-card-border rounded-lg overflow-hidden hover-elevate"
      data-testid={`match-card-${profile.id}`}
    >
      <div className="relative aspect-[4/5] bg-muted">
        {primaryPhoto ? (
          <img
            src={primaryPhoto}
            alt={profile.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-lg">
              {profile.displayName}, {profile.age}
            </h3>
            {profile.subscriptionTier === "premium" && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
                Premium
              </Badge>
            )}
          </div>
          {profile.location && (
            <div className="flex items-center gap-1 text-sm text-white/80">
              <MapPin className="w-3 h-3" />
              <span>{profile.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {profile.tagline && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {profile.tagline}
          </p>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.interests.slice(0, 3).map((interest) => (
              <Badge key={interest} variant="secondary" className="text-xs">
                {interest}
              </Badge>
            ))}
            {profile.interests.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{profile.interests.length - 3}
              </Badge>
            )}
          </div>
        )}

        <Button
          onClick={() => onSendInterest(profile)}
          disabled={isPending}
          className="w-full gap-2"
          data-testid={`button-send-interest-${profile.id}`}
        >
          <Heart className="w-4 h-4" />
          Send Interest (${GATE_COSTS.gate1})
        </Button>
      </div>
    </div>
  );
}
