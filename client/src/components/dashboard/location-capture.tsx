import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface LocationCaptureProps {
  currentCity?: string | null;
  onLocationUpdated?: () => void;
}

export function LocationCapture({ currentCity, onLocationUpdated }: LocationCaptureProps) {
  const { toast } = useToast();
  const [isDetecting, setIsDetecting] = useState(false);
  const [manualCity, setManualCity] = useState(currentCity || "");

  const updateLocationMutation = useMutation({
    mutationFn: async (data: { latitude?: number; longitude?: number; city?: string }) => {
      const response = await apiRequest("PATCH", "/api/profile/location", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Location Updated",
        description: "Your location has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      onLocationUpdated?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location.",
        variant: "destructive",
      });
    },
  });

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "Unknown";
          
          updateLocationMutation.mutate({ latitude, longitude, city });
        } catch {
          updateLocationMutation.mutate({ latitude, longitude, city: "Unknown" });
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        setIsDetecting(false);
        let message = "Unable to get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location permission denied. Please enable location access.";
        }
        toast({
          title: "Location Error",
          description: message,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleManualSubmit = () => {
    if (manualCity.trim()) {
      updateLocationMutation.mutate({ city: manualCity.trim() });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <Label className="text-base font-medium">Your Location</Label>
      </div>

      {currentCity && (
        <p className="text-sm text-muted-foreground">
          Current location: <span className="font-medium text-foreground">{currentCity}</span>
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={detectLocation}
          disabled={isDetecting || updateLocationMutation.isPending}
          className="flex-1"
          data-testid="button-detect-location"
        >
          {isDetecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Detect My Location
            </>
          )}
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Or enter city manually..."
          value={manualCity}
          onChange={(e) => setManualCity(e.target.value)}
          data-testid="input-manual-city"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleManualSubmit}
          disabled={!manualCity.trim() || updateLocationMutation.isPending}
          data-testid="button-save-city"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
