import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, Radio, Heart, CheckCircle, AlertCircle, Navigation, Users 
} from "lucide-react";
import { SiInstagram, SiTiktok, SiX, SiSnapchat } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Profile } from "@shared/schema";

const defaultIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    background: linear-gradient(135deg, #ec4899, #f43f5e);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  "><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const verifiedIcon = L.divIcon({
  className: "custom-marker-verified",
  html: `<div style="
    background: linear-gradient(135deg, #22c55e, #16a34a);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  "><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function NearbyPage() {
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const { data: nearbyProfiles, isLoading: loadingNearby, refetch: refetchNearby } = useQuery<Profile[]>({
    queryKey: ["/api/nearby", userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      if (!userLocation) return [];
      const response = await fetch(
        `/api/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=15`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch nearby profiles");
      return response.json();
    },
    enabled: !!userLocation,
    refetchInterval: 30000,
  });

  const updateLiveMutation = useMutation({
    mutationFn: async ({ isLive, lat, lng }: { isLive: boolean; lat?: number; lng?: number }) => {
      return await apiRequest("POST", "/api/nearby/live", {
        isLive,
        latitude: lat?.toString(),
        longitude: lng?.toString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      refetchNearby();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update live status",
        variant: "destructive",
      });
    },
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location permissions.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out.");
            break;
          default:
            setLocationError("An unknown error occurred.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleGoLive = (checked: boolean) => {
    if (checked && userLocation) {
      updateLiveMutation.mutate({
        isLive: true,
        lat: userLocation.lat,
        lng: userLocation.lng,
      });
      toast({
        title: "You're now live!",
        description: "Others nearby can now see your general location.",
      });
    } else {
      updateLiveMutation.mutate({ isLive: false });
      toast({
        title: "You're now hidden",
        description: "Your location is no longer visible to others.",
      });
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const getSocialLink = (platform: string, username: string) => {
    const links: Record<string, string> = {
      instagram: `https://instagram.com/${username.replace("@", "")}`,
      tiktok: `https://tiktok.com/@${username.replace("@", "")}`,
      twitter: `https://x.com/${username.replace("@", "")}`,
      snapchat: `https://snapchat.com/add/${username.replace("@", "")}`,
    };
    return links[platform] || "#";
  };

  if (!userLocation && !locationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6">
        <div className="text-center space-y-2">
          <Navigation className="w-16 h-16 text-primary mx-auto animate-pulse" />
          <h2 className="text-xl font-semibold">Getting your location...</h2>
          <p className="text-muted-foreground">
            {isGettingLocation 
              ? "Please allow location access when prompted" 
              : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (locationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Location Required</h2>
            <p className="text-muted-foreground">{locationError}</p>
            <Button onClick={requestLocation} data-testid="button-retry-location">
              <MapPin className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Radio className={`w-5 h-5 ${profile?.isLive ? "text-green-500 animate-pulse" : "text-muted-foreground"}`} />
              <span className="font-medium">Go Live</span>
            </div>
            <Switch
              checked={profile?.isLive || false}
              onCheckedChange={handleGoLive}
              disabled={updateLiveMutation.isPending}
              data-testid="switch-go-live"
            />
            {profile?.isLive && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                Broadcasting
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span data-testid="text-nearby-count">
              {nearbyProfiles?.length || 0} singles nearby
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {userLocation && (
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            data-testid="map-container"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />

            {nearbyProfiles?.map((p) => {
              if (!p.latitude || !p.longitude) return null;
              const lat = parseFloat(p.latitude);
              const lng = parseFloat(p.longitude);
              const icon = p.verificationStatus === "verified" ? verifiedIcon : defaultIcon;
              const socialLinks = p.socialLinks as any;

              return (
                <Marker key={p.id} position={[lat, lng]} icon={icon}>
                  <Popup>
                    <div className="min-w-[200px] space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={p.photos?.[0]} alt={p.displayName} />
                          <AvatarFallback>{p.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{p.displayName}</span>
                            {p.age && <span>, {p.age}</span>}
                          </div>
                          {p.verificationStatus === "verified" && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </div>
                          )}
                        </div>
                      </div>

                      {p.tagline && (
                        <p className="text-sm italic text-muted-foreground">"{p.tagline}"</p>
                      )}

                      {socialLinks && (
                        <div className="flex gap-2">
                          {socialLinks.instagram && (
                            <a 
                              href={getSocialLink("instagram", socialLinks.instagram)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-white hover:opacity-80"
                            >
                              <SiInstagram className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {socialLinks.tiktok && (
                            <a 
                              href={getSocialLink("tiktok", socialLinks.tiktok)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full bg-black text-white hover:opacity-80"
                            >
                              <SiTiktok className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {socialLinks.twitter && (
                            <a 
                              href={getSocialLink("twitter", socialLinks.twitter)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full bg-black text-white hover:opacity-80"
                            >
                              <SiX className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {socialLinks.snapchat && (
                            <a 
                              href={getSocialLink("snapchat", socialLinks.snapchat)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full bg-yellow-400 text-black hover:opacity-80"
                            >
                              <SiSnapchat className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      )}

                      <Button size="sm" className="w-full" data-testid={`button-connect-${p.id}`}>
                        <Heart className="w-4 h-4 mr-2" />
                        Express Interest
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {loadingNearby && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
            <Badge variant="secondary" className="animate-pulse">
              Finding singles nearby...
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
