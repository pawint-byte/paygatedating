import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle, Camera, FileText, Gift, ShieldCheck, MapPin, Heart, Target } from "lucide-react";
import type { ProfileCompleteness } from "@/lib/types";

interface ProfileProgressProps {
  completeness: ProfileCompleteness | undefined;
  isVerified?: boolean;
}

export function ProfileProgress({ completeness, isVerified }: ProfileProgressProps) {
  if (!completeness) return null;

  const score = completeness.score;
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-orange-500";
  };

  const getRingColor = () => {
    if (score >= 80) return "stroke-green-500";
    if (score >= 50) return "stroke-yellow-500";
    return "stroke-orange-500";
  };

  const tasks = [
    { key: "hasPhotos", label: "Add photos", icon: Camera, href: "/profile" },
    { key: "hasBio", label: "Write bio", icon: FileText, href: "/profile" },
    { key: "hasInterests", label: "Add interests", icon: Heart, href: "/profile" },
    { key: "hasLookingFor", label: "What you're looking for", icon: Target, href: "/profile" },
    { key: "hasLocation", label: "Set location", icon: MapPin, href: "/settings" },
    { key: "hasWishlistItems", label: "Add wishlist items", icon: Gift, href: "/settings" },
  ];

  const incompleteTasks = tasks.filter(task => !completeness[task.key as keyof ProfileCompleteness]);
  const completedCount = tasks.length - incompleteTasks.length;

  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
            <circle
              className="stroke-muted-foreground/20"
              strokeWidth="4"
              fill="none"
              r="18"
              cx="22"
              cy="22"
            />
            <circle
              className={cn("transition-all duration-500", getRingColor())}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              r="18"
              cx="22"
              cy="22"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-xs font-bold", getScoreColor())}>
              {score}%
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">Profile Completion</p>
          <p className="text-[10px] text-muted-foreground">
            {completedCount}/{tasks.length} tasks complete
          </p>
        </div>
      </div>

      {incompleteTasks.length > 0 && (
        <div className="mt-3 space-y-1">
          {incompleteTasks.slice(0, 3).map((task) => {
            const Icon = task.icon;
            return (
              <Link key={task.key} href={task.href}>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-0.5" data-testid={`task-${task.key}`}>
                  <Circle className="w-3 h-3 shrink-0" />
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{task.label}</span>
                </div>
              </Link>
            );
          })}
          {incompleteTasks.length > 3 && (
            <p className="text-[10px] text-muted-foreground pl-5">
              +{incompleteTasks.length - 3} more
            </p>
          )}
        </div>
      )}

      {score >= 80 && !isVerified && (
        <Link href="/verification">
          <div className="mt-3 flex items-center gap-2 text-[11px] text-primary hover:underline cursor-pointer" data-testid="task-verify">
            <ShieldCheck className="w-3 h-3" />
            <span>Get verified for more matches</span>
          </div>
        </Link>
      )}

      {score === 100 && isVerified && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-green-600">
          <CheckCircle className="w-3 h-3" />
          <span>Profile complete!</span>
        </div>
      )}
    </div>
  );
}
