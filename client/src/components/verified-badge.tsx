import { ShieldCheck } from "lucide-react";
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
        <p>Verified Identity</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function VerificationStatusIndicator({ 
  status 
}: { 
  status: "none" | "pending" | "verified" | "rejected" 
}) {
  if (status === "verified") {
    return <VerifiedBadge size="sm" />;
  }
  return null;
}
