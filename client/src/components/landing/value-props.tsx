import { Eye, Sliders, Zap, Dumbbell, Sparkles } from "lucide-react";

const values = [
  {
    icon: Eye,
    title: "Effort You Can Actually See",
    description:
      "No more guessing if they're interested. Every chapter someone turns with you is visible proof they showed up. By Chapter 3, you both know this one's real — not just another match collecting dust.",
  },
  {
    icon: Sliders,
    title: "You Choose the Dynamic",
    description:
      "Want to lead? Lead. Want to be pursued? Share your link and wait. Want equal effort? The chapters alternate who goes first. Traditional, modern, or somewhere in between — the system supports your style.",
  },
  {
    icon: Zap,
    title: "No Wasted Energy",
    description:
      "On other apps, you invest time in people who were never serious. Here, you only invest in connections where both people are turning pages. No subscriptions draining your wallet. No messages disappearing into the void.",
  },
];

function HisReality() {
  return (
    <div className="bg-card border border-card-border rounded-md p-6 hover-elevate" data-testid="value-his-investment">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-md bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center">
          <Dumbbell className="w-6 h-6 text-blue-500 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">What He's Thinking</h3>
          <p className="text-xs text-muted-foreground">The frustration is real</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
        "I plan dates, I pay, I put in real effort — and half the time I get ghosted or
        it feels like she was just there for a free night out. I'm done investing in
        people who don't invest back."
      </p>
      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium">
          How chapters fix this:
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          By Chapter 2, she's already shown up too. You're not guessing anymore — the
          chapters proved she's just as interested as you are. Your effort goes toward
          someone who's matching it.
        </p>
      </div>
    </div>
  );
}

function HerReality() {
  return (
    <div className="bg-card border border-card-border rounded-md p-6 hover-elevate" data-testid="value-her-investment">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-md bg-rose-500/10 dark:bg-rose-400/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-rose-500 dark:text-rose-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">What She's Thinking</h3>
          <p className="text-xs text-muted-foreground">The frustration is real</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
        "Men don't put in effort anymore. I get low-effort messages, no follow-through,
        and guys who won't commit to making plans — let alone actually showing up. I've
        done the work on myself. Where are the men who've done the same?"
      </p>
      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium">
          How chapters fix this:
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          When a man opens Chapter 1, he's already proven he's serious — not just
          swiping. By Chapter 3, you know he's invested real effort. The chapters filter
          out everything you're tired of.
        </p>
      </div>
    </div>
  );
}

export function ValueProps() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            The Real Problem — and How Chapters Solve It
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Both Sides Are Tired of the Same Thing
          </h2>
          <p className="text-muted-foreground text-lg">
            Men feel like effort goes unreciprocated. Women feel like effort from
            men has disappeared. Both sides are saying the same thing: "I'm
            putting in work and not getting it back." The chapters make effort
            visible — so you always know where you stand.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <HisReality />
          <HerReality />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <div
                key={value.title}
                className="bg-card border border-card-border rounded-md p-8 hover-elevate"
                data-testid={`value-${value.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
