import { UserCheck, Share2, BookOpen, ArrowRight, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    icon: UserCheck,
    title: "Sign Up and Build Your Profile",
    description: "Tell people who you are, what you're about, and what makes you worth connecting with. Your \"I'm At Your Gate\" is your opening statement — your pitch for why someone should start a chapter with you. Take your time. This is the first thing people see.",
  },
  {
    number: "02",
    icon: Share2,
    title: "Share Your Link",
    description: "Put it in your bio. Text it to someone you just met. Hand out your QR code at a party. Wherever you meet people — online, at work, through friends, on a trip — your PayGate link is how they start a conversation on your terms.",
  },
  {
    number: "03",
    icon: BookOpen,
    title: "Let the Chapters Do the Screening",
    description: "Every person who opens your link starts at Chapter 1. If they're serious — about romance, friendship, an activity partner, whatever the connection is — they'll turn the page. If they're not willing to put in the effort, they won't. Either way, you'll know.",
  },
];

export function ScreeningSection() {
  return (
    <section className="py-20 bg-muted/30" data-testid="section-screening">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            Your Personal Screening Tool
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            You Don't Need a Million Matches. You Need the Right Ones.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            PayGate isn't a popularity contest. It's a filter — your personal front door for
            anyone who wants to get to know you. You decide who gets your link. The chapters
            decide who's willing to show up.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative"
                data-testid={`screening-step-${step.number}`}
              >
                <div className="bg-card border border-card-border rounded-md p-6 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-bold text-primary/20 font-serif">{step.number}</span>
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-card-border rounded-md p-8 md:p-10 max-w-3xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div className="flex items-start gap-3" data-testid="screening-point-free">
              <div className="w-9 h-9 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Live 24/7 at Zero Cost</h4>
                <p className="text-sm text-muted-foreground">
                  No monthly membership. Your profile stays active around the clock, ready for
                  anyone who wants to start a chapter with you. There's zero risk to being here.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3" data-testid="screening-point-cost">
              <div className="w-9 h-9 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Cost Only When It Counts</h4>
                <p className="text-sm text-muted-foreground">
                  You never pay to exist on the platform. Cost only happens when both sides
                  decide this connection is worth moving forward — when mutual interest meets action.
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Whether you're looking for a partner, a friend, a running buddy, or just someone
            worth knowing — the chapters work the same way. Effort in, access earned.
          </p>
        </div>

        <div className="text-center mt-12">
          <a href="/api/login">
            <Button size="lg" className="text-base px-8" data-testid="button-screening-cta">
              Sign Up Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
          <p className="text-sm text-muted-foreground mt-3 font-serif italic">
            Build your profile. Share your link. Let the chapters do the rest.
          </p>
        </div>
      </div>
    </section>
  );
}
