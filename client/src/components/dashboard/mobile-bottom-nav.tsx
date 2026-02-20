import { Link, useLocation } from "wouter";
import { Heart, Users, MessageSquare, User, Compass, Gift } from "lucide-react";

const navItems = [
  { title: "Discover", url: "/discover", icon: Compass },
  { title: "Matches", url: "/matches", icon: Heart },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Gifts", url: "/gifts", icon: Gift },
  { title: "Profile", url: "/profile", icon: User },
];

export function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border md:hidden safe-area-bottom"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex items-center justify-around gap-1 h-16 px-2">
        {navItems.map((item) => {
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
      </div>
    </nav>
  );
}
