import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Heart, Users, MessageSquare, User, Settings, LogOut, Crown, ShieldCheck, Radio, HelpCircle, Shield } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { ProfileProgress } from "@/components/dashboard/profile-progress";
import type { User as UserType } from "@shared/models/auth";
import type { Profile } from "@shared/schema";
import type { ProfileCompleteness } from "@/lib/types";

interface AppSidebarProps {
  user: UserType | null;
  profile: Profile | null;
}

const mainMenuItems = [
  {
    title: "Discover",
    url: "/discover",
    icon: Users,
  },
  {
    title: "Nearby",
    url: "/nearby",
    icon: Radio,
  },
  {
    title: "My Matches",
    url: "/matches",
    icon: Heart,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
  },
];

const settingsMenuItems = [
  {
    title: "My Profile",
    url: "/profile",
    icon: User,
  },
  {
    title: "Verification",
    url: "/verification",
    icon: ShieldCheck,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Help & Support",
    url: "/help",
    icon: HelpCircle,
  },
];

export function AppSidebar({ user, profile }: AppSidebarProps) {
  const [location] = useLocation();
  
  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
    enabled: !!user,
  });

  const { data: completeness } = useQuery<ProfileCompleteness>({
    queryKey: ["/api/profile/completeness"],
    enabled: !!user,
    refetchInterval: 60000,
  });

  const displayName = profile?.displayName || user?.firstName || "Member";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/discover" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">PayGate</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminStatus?.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin/feedback"}
                    data-testid="nav-admin-feedback"
                  >
                    <Link href="/admin/feedback">
                      <Shield className="w-4 h-4" />
                      <span>Feedback Manager</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        {completeness && (
          <ProfileProgress 
            completeness={completeness} 
            isVerified={profile?.verificationStatus === "verified"} 
          />
        )}

        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar>
              <AvatarImage src={profile?.photos?.[0] || user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {profile?.verificationStatus === "verified" && (
              <div className="absolute -bottom-1 -right-1">
                <VerifiedBadge size="sm" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-medium text-sm truncate">{displayName}</p>
            </div>
            <div className="flex items-center gap-1">
              {profile?.subscriptionTier === "premium" ? (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-0.5">
                  <Crown className="w-2.5 h-2.5" />
                  Premium
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Free Member</span>
              )}
            </div>
          </div>
        </div>

        <a href="/api/logout" className="block">
          <SidebarMenuButton className="w-full" data-testid="button-logout">
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </SidebarMenuButton>
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
