import { MapPin, Heart, Lock, Users, Instagram, Twitter, ExternalLink } from "lucide-react";
import { SiTiktok, SiSnapchat } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VerificationStatusIndicator } from "@/components/verified-badge";
import type { Profile } from "@shared/schema";
import { GATE_COSTS } from "@shared/schema";

interface MatchCardProps {
  profile: Profile;
  onSendInterest: (profile: Profile) => void;
  isPending?: boolean;
  mutualConnections?: number;
}

export function MatchCard({ profile, onSendInterest, isPending, mutualConnections }: MatchCardProps) {
  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const primaryPhoto = profile.photos?.[0];
  
  const showPhoto = profile.showPhotoPublicly !== false;
  const showName = profile.showFirstNamePublicly !== false;
  const showAge = profile.showAgePublicly !== false;
  const showLocation = profile.showLocationPublicly !== false;
  const showInterests = profile.showInterestsPublicly !== false;

  const displayName = showName ? profile.displayName : initials;

  return (
    <div
      className="bg-card border border-card-border rounded-lg overflow-hidden hover-elevate"
      data-testid={`match-card-${profile.id}`}
    >
      <div className="relative aspect-[4/5] bg-muted">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">
                {displayName}
                {showAge && <span>, {profile.age}</span>}
              </h3>
              <VerificationStatusIndicator 
                status={profile.verificationStatus || "none"} 
                size="sm" 
              />
            </div>
            {profile.subscriptionTier === "premium" && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
                Premium
              </Badge>
            )}
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

      <div className="p-4 space-y-3">
        {profile.tagline && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {profile.tagline}
          </p>
        )}

        {showInterests && profile.interests && profile.interests.length > 0 && (
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
        
        {!showInterests && profile.interests && profile.interests.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Interests visible after connecting</span>
          </div>
        )}

        {profile.socialLinks && Object.values(profile.socialLinks).some(v => v) && (
          <div className="flex items-center gap-2 py-2 px-3 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-lg" data-testid={`social-links-${profile.id}`}>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              View more:
            </span>
            <div className="flex items-center gap-2">
              {profile.socialLinks.instagram && (
                <a 
                  href={`https://instagram.com/${profile.socialLinks.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 hover-elevate p-1 rounded"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`link-instagram-${profile.id}`}
                  title={`@${profile.socialLinks.instagram.replace('@', '')}`}
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {profile.socialLinks.tiktok && (
                <a 
                  href={`https://tiktok.com/@${profile.socialLinks.tiktok.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover-elevate p-1 rounded"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`link-tiktok-${profile.id}`}
                  title={`@${profile.socialLinks.tiktok.replace('@', '')}`}
                >
                  <SiTiktok className="w-4 h-4" />
                </a>
              )}
              {profile.socialLinks.twitter && (
                <a 
                  href={`https://twitter.com/${profile.socialLinks.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover-elevate p-1 rounded"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`link-twitter-${profile.id}`}
                  title={`@${profile.socialLinks.twitter.replace('@', '')}`}
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {profile.socialLinks.snapchat && (
                <a 
                  href={`https://snapchat.com/add/${profile.socialLinks.snapchat.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-500 hover-elevate p-1 rounded"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`link-snapchat-${profile.id}`}
                  title={`@${profile.socialLinks.snapchat.replace('@', '')}`}
                >
                  <SiSnapchat className="w-4 h-4" />
                </a>
              )}
            </div>
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
