import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, X, Plus, DollarSign } from "lucide-react";
import type { Profile } from "@shared/schema";

export function DatePreferences() {
  const { toast } = useToast();
  const [newPreference, setNewPreference] = useState("");
  const [newBlacklist, setNewBlacklist] = useState("");
  
  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      datePreferences?: string[];
      dateBlacklist?: string[];
      dateBudgetFloor?: number | null;
      dateBudgetCeiling?: number | null;
    }) => {
      return await apiRequest("PATCH", "/api/profile/date-preferences", data);
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your date preferences have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update preferences.",
        variant: "destructive",
      });
    },
  });

  const addPreference = () => {
    if (!newPreference.trim()) return;
    const current = profile?.datePreferences || [];
    if (current.includes(newPreference.trim())) return;
    updateMutation.mutate({
      datePreferences: [...current, newPreference.trim()],
    });
    setNewPreference("");
  };

  const removePreference = (item: string) => {
    const current = profile?.datePreferences || [];
    updateMutation.mutate({
      datePreferences: current.filter(p => p !== item),
    });
  };

  const addBlacklist = () => {
    if (!newBlacklist.trim()) return;
    const current = profile?.dateBlacklist || [];
    if (current.includes(newBlacklist.trim())) return;
    updateMutation.mutate({
      dateBlacklist: [...current, newBlacklist.trim()],
    });
    setNewBlacklist("");
  };

  const removeBlacklist = (item: string) => {
    const current = profile?.dateBlacklist || [];
    updateMutation.mutate({
      dateBlacklist: current.filter(b => b !== item),
    });
  };

  const updateBudget = (floor: number | null, ceiling: number | null) => {
    updateMutation.mutate({
      dateBudgetFloor: floor,
      dateBudgetCeiling: ceiling,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle>Date Preferences</CardTitle>
        </div>
        <CardDescription>
          Let your matches know what kind of dates you enjoy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Things I Enjoy</Label>
          <p className="text-sm text-muted-foreground">
            Activities and experiences you'd love on a date
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {(profile?.datePreferences || []).map((pref) => (
              <Badge key={pref} variant="secondary" className="gap-1">
                {pref}
                <button
                  onClick={() => removePreference(pref)}
                  className="ml-1 hover:text-destructive"
                  data-testid={`button-remove-preference-${pref}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newPreference}
              onChange={(e) => setNewPreference(e.target.value)}
              placeholder="e.g., outdoor dining, live music"
              onKeyDown={(e) => e.key === "Enter" && addPreference()}
              data-testid="input-add-preference"
            />
            <Button
              size="icon"
              onClick={addPreference}
              disabled={updateMutation.isPending}
              data-testid="button-add-preference"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Things to Avoid</Label>
          <p className="text-sm text-muted-foreground">
            Activities or places you'd prefer to skip
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {(profile?.dateBlacklist || []).map((item) => (
              <Badge key={item} variant="outline" className="gap-1 border-destructive/30 text-destructive">
                {item}
                <button
                  onClick={() => removeBlacklist(item)}
                  className="ml-1 hover:text-destructive"
                  data-testid={`button-remove-blacklist-${item}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newBlacklist}
              onChange={(e) => setNewBlacklist(e.target.value)}
              placeholder="e.g., loud bars, seafood"
              onKeyDown={(e) => e.key === "Enter" && addBlacklist()}
              data-testid="input-add-blacklist"
            />
            <Button
              size="icon"
              onClick={addBlacklist}
              disabled={updateMutation.isPending}
              data-testid="button-add-blacklist"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <Label>Budget Range</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Set your comfortable spending range for dates
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Minimum</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  className="pl-7"
                  value={profile?.dateBudgetFloor ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    updateBudget(val, profile?.dateBudgetCeiling ?? null);
                  }}
                  placeholder="0"
                  data-testid="input-budget-floor"
                />
              </div>
            </div>
            <span className="text-muted-foreground mt-5">to</span>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Maximum</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  className="pl-7"
                  value={profile?.dateBudgetCeiling ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    updateBudget(profile?.dateBudgetFloor ?? null, val);
                  }}
                  placeholder="No limit"
                  data-testid="input-budget-ceiling"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
