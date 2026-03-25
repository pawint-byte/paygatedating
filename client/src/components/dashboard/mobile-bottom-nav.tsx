import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Heart, MessageSquare, Compass, Gift, Menu, User, Radio, Package,
  Settings, Trophy, HelpCircle, ShieldCheck, Shield, MapPin, X
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
  { title: "Discover", url: "/discover", icon: Compass },
  { title: "Matches", url: "/matches", icon: Heart },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Gifts", url: "/gifts", icon: Gift },
];

const moreMenuItems = [
  { title: "My Profile", url: "/profile", icon: User },
  { title: "Nearby", url: "/nearby", icon: MapPin },
  { title: "Radar", url: "/radar", icon: Radio },
  { title: "My Wishlist", url: "/wishlist", icon: Package },
  { title: "Verification", url: "/verification", icon: ShieldCheck },
  { title: "Rewards", url: "/rewards", icon: Trophy },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help & Support", url: "/help", icon: HelpCircle },
];

const adminMenuItems = [
  { title: "Feedback Manager", url: "/admin/feedback", icon: Shield },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: user } = useQuery<{ id: string }>({
    queryKey: ["/api/auth/user"],
  });

  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
    enabled: !!user,
  });

  const isMoreActive = [...moreMenuItems, ...adminMenuItems].some(
    (item) => location === item.url || location.startsWith(item.url + "/")
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border md:hidden safe-area-bottom"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex items-center justify-around gap-1 h-16 px-2">
        {mainNavItems.map((item) => {
          const isActive = location === item.url;
          return (
            <Link key={item.url} href={item.url}>
              <button
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                data-testid={`mobile-nav-${item.title.toLowerCase()}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium leading-tight">{item.title}</span>
              </button>
            </Link>
          );
        })}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
                isMoreActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
              data-testid="mobile-nav-more"
            >
              <Menu className={`w-5 h-5 ${isMoreActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium leading-tight">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
            <SheetHeader className="pb-2">
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto space-y-1 pb-6">
              {moreMenuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <Link key={item.url} href={item.url}>
                    <button
                      onClick={() => setSheetOpen(false)}
                      className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                      }`}
                      data-testid={`mobile-more-${item.title.toLowerCase().replace(/[^a-z]/g, "-")}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm">{item.title}</span>
                    </button>
                  </Link>
                );
              })}

              {adminStatus?.isAdmin && (
                <>
                  <Separator className="my-2" />
                  <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Admin
                  </p>
                  {adminMenuItems.map((item) => {
                    const isActive = location === item.url;
                    return (
                      <Link key={item.url} href={item.url}>
                        <button
                          onClick={() => setSheetOpen(false)}
                          className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-muted"
                          }`}
                          data-testid={`mobile-more-admin-${item.title.toLowerCase().replace(/[^a-z]/g, "-")}`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-sm">{item.title}</span>
                        </button>
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
