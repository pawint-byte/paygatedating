import { Heart, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "matches" | "discover" | "wallet";
  onAction?: () => void;
}

const emptyStates = {
  matches: {
    icon: Heart,
    title: "No Active Matches Yet",
    description: "Start sending interest requests to connect with other members. Quality connections are just a few gates away!",
    actionLabel: "Discover Matches",
  },
  discover: {
    icon: Users,
    title: "No Profiles to Show",
    description: "We're working on finding great matches for you. Check back soon or update your preferences to see more profiles.",
    actionLabel: "Update Preferences",
  },
  wallet: {
    icon: Wallet,
    title: "Fund Your Wallet",
    description: "Add funds to your wallet to start sending interest requests and writing chapters with your matches.",
    actionLabel: "Add Funds",
  },
};

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const state = emptyStates[type];
  const Icon = state.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{state.description}</p>
      {onAction && (
        <Button onClick={onAction} data-testid={`button-empty-${type}`}>
          {state.actionLabel}
        </Button>
      )}
    </div>
  );
}
