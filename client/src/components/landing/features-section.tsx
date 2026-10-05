import { 
  Shield, 
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
import { Link } from "wouter";

const features = [
  {
    icon: BadgeCheck,
    title: "AI ID Verification",
    description: "Our AI compares your selfie to profile photos to prevent catfishing. Verified users get a trusted badge.",
    category: "trust"
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
    description: "Use wishlist and retailer links without treating PayGate as the seller or shipper. Product cost and retailer shipping are separate from PayGate's service fee.",
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
    description: "Get personalized help writing your bio, understanding the 5 chapters, and making great first impressions.",
    category: "support"
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Get notified when someone expresses interest and receive reminders about activity on your account.",
    category: "engagement"
  },
  {
    icon: Sparkles,
    title: "Seasonal Themes",
    description: "Enjoy fresh, seasonal content and promotions throughout the year. Each season brings new themes, offers, and ways to connect.",
    category: "experience"
  },
  {
    icon: QrCode,
    title: "Your Personal Screening Link",
    description: "Stop giving out your number. Share your QR code or profile link instead -- at events, on social media, anywhere. Anyone interested has to start at Chapter 1 first. Your story, your terms.",
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
        <Link
          href="/assistant-guide"
          className="group mt-8 flex flex-col gap-4 rounded-xl border border-primary/20 bg-card p-5 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          data-testid="feature-member-owned-ai-pilot"
        >
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">Connect your own AI</h3>
                <span className="rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">Development pilot</span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Queue a task for your own private AI to read permitted context and prepare private drafts. You stay in control; this development pilot is not released publicly.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium text-primary underline underline-offset-4">Read the connection guide</span>
        </Link>
      </div>
    </section>
  );
}
