import { 
  Shield, 
  MapPin, 
  Users, 
  Gift, 
  Calendar, 
  Bot, 
  BadgeCheck, 
  Share2,
  Lock,
  UserPlus,
  Bell,
  Sparkles,
  QrCode
} from "lucide-react";

const features = [
  {
    icon: BadgeCheck,
    title: "AI ID Verification",
    description: "Our AI compares your selfie to profile photos to prevent catfishing. Verified users get a trusted badge.",
    category: "trust"
  },
  {
    icon: MapPin,
    title: "Nearby Discovery",
    description: "Find singles in your area with our real-time map. Go live to appear nearby with privacy-protected locations.",
    category: "discovery"
  },
  {
    icon: Users,
    title: "Friends Network",
    description: "See mutual connections and degrees of separation. Build trust through your social network.",
    category: "trust"
  },
  {
    icon: Gift,
    title: "Thoughtful Gift Giving",
    description: "Show you've been paying attention. Send gifts from their wishlist -- from everyday favorites to luxury items and travel experiences. Effort speaks louder than words.",
    category: "connection"
  },
  {
    icon: Calendar,
    title: "Date Planning",
    description: "Propose dates with activities, locations, and payment preferences. Set expectations before meeting.",
    category: "connection"
  },
  {
    icon: Bot,
    title: "AI Dating Coach",
    description: "Get personalized help writing your bio, understanding the gate system, and making great first impressions.",
    category: "support"
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Get notified when someone expresses interest, when matches are nearby, and gentle reminders to stay active on the platform.",
    category: "engagement"
  },
  {
    icon: Sparkles,
    title: "Seasonal Themes",
    description: "Enjoy fresh, seasonal content and promotions throughout the year. From Valentine's specials to summer love campaigns.",
    category: "experience"
  },
  {
    icon: QrCode,
    title: "Personal QR Code",
    description: "Your unique QR code lets anyone view your profile and wishlist. Share on social media, at events, or hand out on cards -- make it easy for the right people to find you.",
    category: "discovery"
  },
  {
    icon: Share2,
    title: "Social Linking",
    description: "Connect Instagram, TikTok, and more. Additional verification and easy discovery across platforms.",
    category: "trust"
  },
  {
    icon: Lock,
    title: "Privacy Controls",
    description: "Control exactly what's visible on your profile. Show or hide your photo, age, name, and location.",
    category: "privacy"
  },
  {
    icon: UserPlus,
    title: "Grow Your Circle",
    description: "Invite friends and earn credits when they join. The best connections often come through the people you already trust.",
    category: "rewards"
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            Tools for Intentional Daters
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Everything You Need to Build Something Real
          </h2>
          <p className="text-muted-foreground text-lg">
            More than just swiping. PayGate gives you the tools to invest your
            time and energy into connections that actually matter.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-card border border-card-border rounded-lg p-6 hover-elevate"
                data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
