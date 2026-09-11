import { useState, useEffect, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { 
  MapPin, Radio, Heart, CheckCircle, Navigation, Users 
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

function coordinates(lat: unknown, lng: unknown) {
  if (lat == null || lng == null || lat === "" || lng === "") return null;
  const point = { lat: Number(lat), lng: Number(lng) };
  return Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 &&
    Number.isFinite(point.lng) && Math.abs(point.lng) <= 180 ? point : null;
}

export default function NearbyPage() {
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [manualCity, setManualCity] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const locationRequestRef = useRef(0);
  const locationTimeoutRef = useRef<number | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const awaitingSavedRef = useRef(false);

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const savedLocation = coordinates(profile?.latitude, profile?.longitude);
  const savedCity = profile?.city || profile?.location;

  const { data: nearbyProfiles, isLoading: loadingNearby } = useQuery<Profile[]>({
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
    onSuccess: (_data, { isLive }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nearby"] });
      toast({
        title: isLive ? "You're now live!" : "You're now hidden",
        description: isLive ? "Others nearby can now see your selected general location." : "Your location is no longer visible to others.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update live status",
        variant: "destructive",
      });
    },
  });

  const cancelLocationRequest = () => {
    locationRequestRef.current += 1;
    if (locationTimeoutRef.current !== null) {
      window.clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }
    geocodeAbortRef.current?.abort();
    geocodeAbortRef.current = null;
    awaitingSavedRef.current = false;
    setIsGettingLocation(false);
    setIsGeocoding(false);
  };

  const requestLocation = () => {
    cancelLocationRequest();
    const requestId = locationRequestRef.current;
    setIsGettingLocation(true);
    setLocationError(null);

    const fallback = () => {
      if (locationRequestRef.current !== requestId) return;
      cancelLocationRequest();
      const currentProfile = profileRef.current;
      const saved = coordinates(currentProfile?.latitude, currentProfile?.longitude);
      if (saved) {
        setUserLocation(saved);
        setLocationError("Using your saved location. You can choose a different area anytime.");
      } else {
        awaitingSavedRef.current = true;
        setLocationError("Choose a city to explore nearby. Current location isn't available, and that's okay.");
        setChooserOpen(true);
      }
    };

    if (!navigator.geolocation) return fallback();
    locationTimeoutRef.current = window.setTimeout(fallback, 5000);
    try {
      navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestRef.current !== requestId) return;
        const point = coordinates(position.coords.latitude, position.coords.longitude);
        if (!point) return fallback();
        cancelLocationRequest();
        setUserLocation(point);
        setChooserOpen(false);
      },
      fallback,
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
      );
    } catch {
      fallback();
    }
  };

  const geocodeCity = async (city = manualCity) => {
    if (!city.trim()) return;
    cancelLocationRequest();
    const requestId = locationRequestRef.current;
    const controller = new AbortController();
    geocodeAbortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    setIsGeocoding(true);
    setLocationError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city.trim())}`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error("City search unavailable");
      const data = await response.json();
      if (locationRequestRef.current !== requestId) return;
      const point = Array.isArray(data) && data.length ? coordinates(data[0].lat, data[0].lon) : null;
      if (point) {
        setUserLocation(point);
        setChooserOpen(false);
      } else {
        setLocationError("Couldn't find that place. Try a different city or town name.");
      }
    } catch {
      if (locationRequestRef.current === requestId) {
        setLocationError("City search isn't available right now. Try again or use your saved location.");
      }
    } finally {
      window.clearTimeout(timeout);
      if (locationRequestRef.current === requestId) {
        geocodeAbortRef.current = null;
        setIsGeocoding(false);
      }
    }
  };

  const useSavedLocation = () => {
    if (savedLocation) {
      cancelLocationRequest();
      setLocationError(null);
      setUserLocation(savedLocation);
      setChooserOpen(false);
    } else if (savedCity) {
      void geocodeCity(savedCity);
    }
  };

  const handleGoLive = (checked: boolean) => {
    if (checked && !userLocation) return;
    if (checked && userLocation) {
      updateLiveMutation.mutate({
        isLive: true,
        lat: userLocation.lat,
        lng: userLocation.lng,
      });
    } else {
      updateLiveMutation.mutate({ isLive: false });
    }
  };

  useEffect(() => {
    requestLocation();
    return () => {
      locationRequestRef.current += 1;
      if (locationTimeoutRef.current !== null) {
        window.clearTimeout(locationTimeoutRef.current);
      }
      geocodeAbortRef.current?.abort();
    };
  }, []);

  // Profile loading can finish after the browser's location deadline.
  useEffect(() => {
    if (!awaitingSavedRef.current || !savedLocation) return;
    awaitingSavedRef.current = false;
    setUserLocation(savedLocation);
    setLocationError("Using your saved location. You can choose a different area anytime.");
  }, [profile?.latitude, profile?.longitude]);

  const getSocialLink = (platform: string, username: string) => {
    const links: Record<string, string> = {
      instagram: `https://instagram.com/${username.replace("@", "")}`,
      tiktok: `https://tiktok.com/@${username.replace("@", "")}`,
      twitter: `https://x.com/${username.replace("@", "")}`,
      snapchat: `https://snapchat.com/add/${username.replace("@", "")}`,
    };
    return links[platform] || "#";
  };

  const manualEntry = (
    <div className="w-full space-y-3">
      <Button variant="outline" className="w-full" onClick={requestLocation}
        disabled={isGettingLocation} data-testid="button-use-current-location">
        <Navigation className="w-4 h-4 mr-2" />
        {isGettingLocation ? "Finding current location…" : "Use current location"}
      </Button>
      {(savedLocation || savedCity) && (
        <Button
          variant="outline"
          className="w-full h-auto whitespace-normal"
          onClick={useSavedLocation}
          data-testid="button-use-saved-location"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Use my saved location{savedCity ? ` (${savedCity})` : ""}
        </Button>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="Enter your city or town..."
          aria-label="Search for a city or town"
          value={manualCity}
          onChange={(e) => setManualCity(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") geocodeCity(); }}
          data-testid="input-manual-city-nearby"
        />
        <Button
          onClick={() => void geocodeCity()}
          disabled={!manualCity.trim() || isGeocoding}
          data-testid="button-search-city"
        >
          {isGeocoding ? "..." : "Go"}
        </Button>
      </div>
    </div>
  );

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
              disabled={updateLiveMutation.isPending || (!userLocation && !profile?.isLive)}
              aria-label="Go Live"
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
        {locationError && <p className="mt-2 text-sm text-muted-foreground" role="status">{locationError}</p>}
        {profile?.isLive && userLocation && (!savedLocation ||
          savedLocation.lat !== userLocation.lat || savedLocation.lng !== userLocation.lng) && (
          <p className="mt-2 text-sm text-muted-foreground">
            You're still live at your saved location. Turn Go Live off and on to share this map area instead.
          </p>
        )}
      </div>

      <div className="flex-1 relative isolate min-h-[400px]">
        <div className="absolute top-3 right-3 z-[1001]">
          <Button variant="outline" className="bg-background shadow-md"
            onClick={() => setChooserOpen(open => !open)}
            aria-expanded={chooserOpen || !userLocation} aria-controls="nearby-location-chooser"
            data-testid="button-choose-location">
            <MapPin className="w-4 h-4 mr-2" /> Choose location
          </Button>
        </div>
        {(chooserOpen || !userLocation) && (
          <Card id="nearby-location-chooser" className={userLocation
            ? "absolute top-16 right-3 z-[1001] w-[calc(100%_-_1.5rem)] max-w-sm max-h-[70vh] overflow-y-auto"
            : "mx-auto mt-16 mb-6 w-[calc(100%_-_2rem)] max-w-sm"}>
            <CardHeader>
              <CardTitle className="text-lg">Choose where to explore</CardTitle>
              <CardDescription>
                {isGettingLocation ? "Allow location access, or choose a city below. We'll wait no more than five seconds."
                  : "Use your current location, your saved area, or search for a city."}
              </CardDescription>
            </CardHeader>
            <CardContent>{manualEntry}</CardContent>
          </Card>
        )}
        {userLocation && (
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={14}
            style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
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
                              className="p-1.5 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-white hover-elevate"
                              data-testid={`link-instagram-nearby-${p.id}`}
                            >
                              <SiInstagram className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {socialLinks.tiktok && (
                            <a 
                              href={getSocialLink("tiktok", socialLinks.tiktok)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full bg-black text-white hover-elevate"
                              data-testid={`link-tiktok-nearby-${p.id}`}
                            >
                              <SiTiktok className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {socialLinks.twitter && (
                            <a 
                              href={getSocialLink("twitter", socialLinks.twitter)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full bg-black text-white hover-elevate"
                              data-testid={`link-twitter-nearby-${p.id}`}
                            >
                              <SiX className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {socialLinks.snapchat && (
                            <a 
                              href={getSocialLink("snapchat", socialLinks.snapchat)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full bg-yellow-400 text-black hover-elevate"
                              data-testid={`link-snapchat-nearby-${p.id}`}
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
