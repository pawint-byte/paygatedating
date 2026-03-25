import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Search, ShieldCheck, Mail, Calendar, UserCheck, UserX, Crown, ShieldAlert
} from "lucide-react";
import { Redirect } from "wouter";

interface UserWithProfile {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    isAdmin: boolean;
    createdAt: string | null;
  };
  profile: {
    id: string;
    displayName: string;
    age: number | null;
    gender: string | null;
    location: string | null;
    verificationStatus: string | null;
    subscriptionTier: string | null;
    isLive: boolean | null;
    lastActiveAt: string | null;
    photos: string[] | null;
    bio: string | null;
  } | null;
}

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: adminStatus, isLoading: adminLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  const { data: usersData, isLoading } = useQuery<UserWithProfile[]>({
    queryKey: ["/api/admin/users"],
    enabled: adminStatus?.isAdmin === true,
  });

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!adminStatus?.isAdmin) {
    return <Redirect to="/discover" />;
  }

  const filteredUsers = usersData?.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${item.user.firstName || ""} ${item.user.lastName || ""}`.toLowerCase();
    const displayName = item.profile?.displayName?.toLowerCase() || "";
    const email = item.user.email?.toLowerCase() || "";
    return name.includes(q) || displayName.includes(q) || email.includes(q);
  });

  const totalUsers = usersData?.length || 0;
  const verifiedCount = usersData?.filter(u => u.profile?.verificationStatus === "verified").length || 0;
  const withProfileCount = usersData?.filter(u => u.profile !== null).length || 0;
  const premiumCount = usersData?.filter(u => u.profile?.subscriptionTier === "premium").length || 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="admin-users-page">
      <div className="flex items-center gap-3">
        <Users className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-users-title">Members</h1>
          <p className="text-muted-foreground text-sm">View all registered members</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid="stat-total-users">
          <CardContent className="p-4">
            <p className="text-3xl font-bold">{totalUsers}</p>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-with-profile">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-blue-600">{withProfileCount}</p>
            <p className="text-sm text-muted-foreground">With Profile</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-verified">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-green-600">{verifiedCount}</p>
            <p className="text-sm text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-premium">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-purple-600">{premiumCount}</p>
            <p className="text-sm text-muted-foreground">Premium</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-users"
        />
      </div>

      <div className="space-y-3">
        {filteredUsers?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {searchQuery ? "No members match your search." : "No members yet."}
            </CardContent>
          </Card>
        )}

        {filteredUsers?.map((item) => {
          const { user, profile } = item;
          const displayName = profile?.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "No Name";
          const photo = profile?.photos?.[0] || user.profileImageUrl;

          return (
            <Card key={user.id} data-testid={`card-user-${user.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarImage src={photo || undefined} alt={displayName} />
                    <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" data-testid={`text-user-name-${user.id}`}>
                        {displayName}
                      </span>
                      {profile?.age && (
                        <span className="text-xs text-muted-foreground">{profile.age}</span>
                      )}
                      {user.isAdmin && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Crown className="w-3 h-3" /> Admin
                        </Badge>
                      )}
                      {profile?.subscriptionTier === "premium" && (
                        <Badge className="text-xs bg-purple-600">Premium</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span className="truncate" data-testid={`text-user-email-${user.id}`}>
                        {user.email || "No email"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {profile?.verificationStatus === "verified" ? (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <UserX className="w-3 h-3" />
                          <span>Not verified</span>
                        </div>
                      )}

                      {profile?.location && (
                        <span className="text-xs text-muted-foreground">{profile.location}</span>
                      )}

                      {profile?.gender && (
                        <span className="text-xs text-muted-foreground capitalize">{profile.gender}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Joined {formatDate(user.createdAt)}</span>
                      </div>
                      {profile?.lastActiveAt && (
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>Active {formatTimeAgo(profile.lastActiveAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
