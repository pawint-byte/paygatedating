import { Flame, Eye, Heart, Video, Phone, ArrowRight } from "lucide-react";
import { GATE_COSTS } from "@shared/schema";

const chapters = [
  {
    number: 1,
    title: "The Spark",
    description: "Not a swipe. Not a 'hey.' You craft a real first move -- something that says 'I see you, and I'm showing up.'",
    icon: Flame,
    cost: GATE_COSTS.gate1,
    whoLeads: "You make the move",
    unlocks: "Your story begins",
    feeling: "Courage",
  },
  {
    number: 2,
    title: "The Curiosity",
    description: "They showed up. Now it's your turn. Write back, ask a question, let them know the spark landed.",
    icon: Eye,
    cost: GATE_COSTS.gate2,
    whoLeads: "They respond",
    unlocks: "Conversation opens",
    feeling: "Interest",
  },
  {
    number: 3,
    title: "Getting Real",
    description: "Walls down. Stories out. Share photos, swap real talk, and let each other in. This is where it gets good.",
    icon: Heart,
    cost: GATE_COSTS.gate3,
    whoLeads: "Either of you",
    unlocks: "Photos & deeper chat",
    feeling: "Vulnerability",
  },
  {
    number: 4,
    title: "Face to Face",
    description: "You've read the words. Now hear the voice, see the smile. Video dates and shared moments bring it all to life.",
    icon: Video,
    cost: GATE_COSTS.gate4,
    whoLeads: "Either of you",
    unlocks: "Video calls & activities",
    feeling: "Chemistry",
  },
  {
    number: 5,
    title: "Beyond the Screen",
    description: "You've co-authored something real. Now take it with you -- exchange numbers, plan your first real date.",
    icon: Phone,
    cost: GATE_COSTS.gate5,
    whoLeads: "Both of you",
    unlocks: "Contact exchange",
    feeling: "Commitment",
  },
];

export function GateTimeline() {
  return (
    <section id="how-it-works" className="py-20 bg-card/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            Your Story, Five Chapters
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Every Great Love Story Has Chapters
          </h2>
          <p className="text-muted-foreground text-lg">
            Real connection isn't instant -- it's built. Each chapter is a moment
            where you both choose to show up a little more. Not because you have
            to, but because this one feels worth turning the page for.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
            {chapters.map((chapter, index) => {
              const Icon = chapter.icon;
              return (
                <div
                  key={chapter.number}
                  className="relative flex flex-col items-center text-center"
                  data-testid={`gate-${chapter.number}`}
                >
                  <div className="relative z-10 mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center ring-4 ring-background">
                      <Icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                      <span className="text-xs font-bold">{chapter.number}</span>
                    </div>
                  </div>

                  <div className="bg-card border border-card-border rounded-lg p-5 w-full hover-elevate">
                    <h3 className="font-semibold text-base mb-2">{chapter.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {chapter.description}
                    </p>

                    <div className="space-y-2 pt-3 border-t border-border">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">The feeling:</span>
                        <span className="font-medium text-primary">{chapter.feeling}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Your move:</span>
                        <span className="font-bold">${chapter.cost}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Who leads:</span>
                        <span className="font-medium">{chapter.whoLeads}</span>
                      </div>
                    </div>
                  </div>

                  {index < chapters.length - 1 && (
                    <div className="hidden lg:flex absolute top-8 -right-2 z-20">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Your whole love story: ~$55 shared between two people -- less than one dinner out
          </p>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <span>Can't wait? Skip to Chapter 5 for $50 and exchange contact info now</span>
          </div>
        </div>
      </div>
    </section>
  );
}
