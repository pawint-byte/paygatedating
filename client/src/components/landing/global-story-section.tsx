import { Globe, MapPin, Plane, ArrowRight, Users, Heart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const stories = [
  {
    icon: Plane,
    location: "Barcelona",
    title: "The Traveler",
    story: "You're in Barcelona for a week. Someone at the hotel bar catches your eye. You hand them your link. They open it that night. By the time your flight lands back home, you're already on Chapter 2. Distance didn't kill it — the chapters kept the momentum going.",
    accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: MapPin,
    location: "Your City",
    title: "The Local",
    story: "Saturday morning. You check who's nearby. Three new faces within 5 miles this week. One already visited your profile twice. You didn't swipe, didn't message first, didn't compete for attention. They found you. The chapters will tell you who's serious.",
    accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: Users,
    location: "London to New York",
    title: "The Introduction",
    story: "A friend in London sends your link to someone they think you'd click with. That person opens it in New York. By Chapter 3, you're video calling every night. By Chapter 5, someone's booking a flight. The story started 3,500 miles apart — it didn't stay that way.",
    accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: Globe,
    location: "Lagos, Tokyo, Your Street",
    title: "The Network Effect",
    story: "You post your link once. A follower in Lagos opens it. Another in Tokyo. A third lives right down your street. Each person brought themselves — you didn't need an app with 10 million users in your zip code. You just needed your link and people who are willing to show up.",
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
];

export function GlobalStorySection() {
  return (
    <section className="py-20" data-testid="section-global-story">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            No Borders. No Boundaries.
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Your Story Doesn't Have a Zip Code
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Most dating apps need millions of users in your city to be useful. PayGate doesn't.
            Every person who signs up brings their own connections with them — from across the
            street or across the world. The platform grows with every link shared.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {stories.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-card border border-card-border rounded-md p-6 hover:shadow-md transition-shadow"
                data-testid={`global-story-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-md ${item.accent} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.location}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.story}
                </p>
              </div>
            );
          })}
        </div>

        <div className="bg-muted/40 border border-border rounded-md p-8 md:p-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold font-serif mb-3">
                You Don't Need Millions of Users. You Need Yours.
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Traditional dating apps are empty until they hit critical mass in your area.
                PayGate flips that model. Every user is their own marketing channel — they bring
                the people already interested in them.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3" data-testid="global-point-growth">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Every Link Grows the Network</h4>
                    <p className="text-sm text-muted-foreground">
                      When you share your link and someone signs up, they share theirs too.
                      The platform grows organically — no ad spend required.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3" data-testid="global-point-works">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Works With One Person or a Million</h4>
                    <p className="text-sm text-muted-foreground">
                      Even if you're the only person in your city on PayGate, it works — because
                      the people you meet in real life come to your profile, not to an app they
                      haven't heard of.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full max-w-[280px]">
                <div className="bg-card border border-card-border rounded-lg p-6 text-center">
                  <Globe className="w-16 h-16 text-primary/20 mx-auto mb-4" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">3 people nearby this week</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Profile visited from 4 countries</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">2 new stories started this month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <a href="/api/login">
            <Button size="lg" className="text-base px-8" data-testid="button-global-cta">
              Start Your Story Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
          <p className="text-sm text-muted-foreground mt-3 font-serif italic">
            Your next chapter could start anywhere.
          </p>
        </div>
      </div>
    </section>
  );
}
