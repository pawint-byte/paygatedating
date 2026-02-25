import { Flame, Shield, Scale, Heart, Compass, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const personas = [
  {
    title: "The One Who Leads",
    tagline: "You see someone. You make the move.",
    description:
      "You don't wait for a signal. When you're interested, you show it — with intention, not just a 'hey.' Chapter 1 is yours. And the chapters make sure they know you're serious, not just another message in their inbox.",
    icon: Flame,
    color: "bg-orange-500/10 dark:bg-orange-400/10",
    textColor: "text-orange-500 dark:text-orange-400",
    accent: "bg-orange-500 dark:bg-orange-400",
  },
  {
    title: "The One Who's Pursued",
    tagline: "Share your link. Let them come to you.",
    description:
      "You've put in the work on yourself. You're not chasing anyone. Post your profile, share your QR code — the chapters filter out everyone who isn't willing to show up the way you deserve. Only the serious ones make it past Chapter 1.",
    icon: Shield,
    color: "bg-rose-500/10 dark:bg-rose-400/10",
    textColor: "text-rose-500 dark:text-rose-400",
    accent: "bg-rose-500 dark:bg-rose-400",
  },
  {
    title: "The One Who Wants Equal Effort",
    tagline: "Both people show up. Period.",
    description:
      "You're tired of being the only one investing — emotionally, financially, energetically. Here, both people turn the page. If they're not matching your effort, you'll know by Chapter 2. No more guessing.",
    icon: Scale,
    color: "bg-blue-500/10 dark:bg-blue-400/10",
    textColor: "text-blue-500 dark:text-blue-400",
    accent: "bg-blue-500 dark:bg-blue-400",
  },
  {
    title: "The Serious Romantic",
    tagline: "Dating with purpose, not for sport.",
    description:
      "Not every connection is worth 5 chapters — but when one is, every page you turned together meant something. You're here because you're ready for the real thing, and you want someone who's ready too.",
    icon: Heart,
    color: "bg-purple-500/10 dark:bg-purple-400/10",
    textColor: "text-purple-500 dark:text-purple-400",
    accent: "bg-purple-500 dark:bg-purple-400",
  },
  {
    title: "The Explorer",
    tagline: "No pressure. See where it goes.",
    description:
      "Not every story has to be a novel. Maybe you're looking for an activity partner, a great conversation, or just someone to explore the city with. The chapters work for that too — low stakes, real people.",
    icon: Compass,
    color: "bg-teal-500/10 dark:bg-teal-400/10",
    textColor: "text-teal-500 dark:text-teal-400",
    accent: "bg-teal-500 dark:bg-teal-400",
  },
];

export function PersonasSection() {
  return (
    <section className="py-20" data-testid="section-personas">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            However You Date, This Works for You
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Your Story, Your Rules
          </h2>
          <p className="text-muted-foreground text-lg">
            We don't tell you how to date. We don't pick sides. We just built a
            system where effort is visible — so whoever's in your story is
            actually showing up. Here's how different people use PayGate.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {personas.map((persona) => {
            const Icon = persona.icon;
            return (
              <div
                key={persona.title}
                className="bg-card border border-card-border rounded-lg p-6 relative overflow-hidden hover-elevate"
                data-testid={`persona-${persona.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 ${persona.accent}`} />
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg ${persona.color} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${persona.textColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{persona.title}</h3>
                    <p className="text-xs text-muted-foreground">{persona.tagline}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {persona.description}
                </p>
              </div>
            );
          })}

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 flex flex-col items-center justify-center text-center hover-elevate">
            <p className="text-lg font-semibold font-serif mb-2">
              Which one are you?
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              It doesn't matter. The chapters work the same way for all of them —
              effort in, connection out.
            </p>
            <a href="/api/login">
              <Button className="gap-2" data-testid="button-persona-cta">
                Start Your Story Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
