import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function VerifiedBadge({ size = "md", showText = false }: VerifiedBadgeProps) {
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (showText) {
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1" data-testid="badge-verified">
        <ShieldCheck className={iconSizes[size]} />
        Verified
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="inline-flex items-center justify-center rounded-full bg-green-500 p-1"
          data-testid="badge-verified-icon"
        >
          <ShieldCheck className={`${iconSizes[size]} text-white`} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Identity Verified</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface UnverifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function UnverifiedBadge({ size = "md", showText = false }: UnverifiedBadgeProps) {
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (showText) {
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1" data-testid="badge-unverified">
        <ShieldAlert className={iconSizes[size]} />
        Not Verified
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="inline-flex items-center justify-center rounded-full bg-amber-500 p-1"
          data-testid="badge-unverified-icon"
        >
          <ShieldAlert className={`${iconSizes[size]} text-white`} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Not Verified - Proceed with caution</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface PendingBadgeProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function PendingBadge({ size = "md", showText = false }: PendingBadgeProps) {
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (showText) {
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1" data-testid="badge-pending">
        <Clock className={iconSizes[size]} />
        Pending Review
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="inline-flex items-center justify-center rounded-full bg-blue-500 p-1"
          data-testid="badge-pending-icon"
        >
          <Clock className={`${iconSizes[size]} text-white`} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Verification Pending</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface VerificationStatusIndicatorProps {
  status: "none" | "pending" | "verified" | "rejected";
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function VerificationStatusIndicator({ 
  status,
  size = "sm",
  showText = false,
}: VerificationStatusIndicatorProps) {
  if (status === "verified") {
    return <VerifiedBadge size={size} showText={showText} />;
  }
  
  if (status === "pending") {
    return <PendingBadge size={size} showText={showText} />;
  }
  
  return <UnverifiedBadge size={size} showText={showText} />;
}
