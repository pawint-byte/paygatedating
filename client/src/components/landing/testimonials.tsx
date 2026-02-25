import { Star, Crown, Scale, Target, Dumbbell, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

const testimonials = [
  {
    name: "Marcus T.",
    age: 33,
    location: "Atlanta",
    avatar: "MT",
    quote:
      "I was done being the only one putting in effort. On other apps, I'd plan dates, pay for everything, and then get ghosted. Here, by Chapter 2 I already know she's showing up too. That changed the whole game for me.",
    rating: 5,
  },
  {
    name: "Alicia R.",
    age: 30,
    location: "Chicago",
    avatar: "AR",
    quote:
      "I shared my PayGate link on my Instagram story and let people come to me. The guys who weren't serious didn't even make it past Chapter 1. The one who did? We're on Chapter 4 and planning our first real date.",
    rating: 5,
  },
  {
    name: "David & Priya",
    age: 31,
    location: "New York",
    avatar: "DP",
    quote:
      "We both swiped on other apps for years and hated it. PayGate felt different because we were both investing equally — taking turns, showing up, proving it chapter by chapter. By Chapter 3 we already felt like we knew each other.",
    rating: 5,
  },
  {
    name: "Jasmine K.",
    age: 28,
    location: "Miami",
    avatar: "JK",
    quote:
      "I wasn't even looking for anything serious — just wanted someone to go to concerts and try new restaurants with. We matched as activity partners and it was zero pressure. Best decision I've made on a dating app.",
    rating: 5,
  },
  {
    name: "Carlos M.",
    age: 36,
    location: "Austin",
    avatar: "CM",
    quote:
      "I'm old school. I like to lead, take her out, make the first move. PayGate lets me do that while knowing she's actually interested — not just looking for a free dinner. Chapter 1 was my move. She made Chapter 2 hers. That's respect.",
    rating: 5,
  },
];

const stats = [
  { value: "87%", label: "Say connections feel more genuine" },
  { value: "70%", label: "Less ghosting than other apps" },
  { value: "3.2x", label: "Higher response rates" },
];

function TraditionalCard() {
  return (
    <Card className="p-6 relative overflow-hidden" data-testid="style-traditional">
      <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500 dark:bg-purple-400" />
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-500/10 dark:bg-purple-400/10">
          <Crown className="w-5 h-5 text-purple-500 dark:text-purple-400" />
        </div>
        <div>
          <h4 className="font-semibold">Traditional</h4>
          <p className="text-xs text-muted-foreground">One leads, one chooses</p>
        </div>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4 italic text-sm">
        "I like knowing he made the effort to be here. He opened Chapter 1 and led the way. I chose to respond in Chapter 2 because he earned it. We're writing the kind of love story my grandmother would recognize."
      </p>
      <p className="text-sm font-medium">-- Victoria K., 34</p>
    </Card>
  );
}

function PartnershipCard() {
  return (
    <Card className="p-6 relative overflow-hidden" data-testid="style-50-50-partnership">
      <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 dark:bg-blue-400" />
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-400/10">
          <Scale className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        </div>
        <div>
          <h4 className="font-semibold">Equal Partnership</h4>
          <p className="text-xs text-muted-foreground">We match each other's energy</p>
        </div>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4 italic text-sm">
        "We take turns. I led Chapter 1, she led Chapter 2. By Chapter 3 we were both all in. No scorekeeping, no games — just two people who respect each other enough to show up equally."
      </p>
      <p className="text-sm font-medium">-- Jordan T., 31</p>
    </Card>
  );
}

function IntentionalCard() {
  return (
    <Card className="p-6 relative overflow-hidden" data-testid="style-intentional">
      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 dark:bg-amber-400" />
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-400/10">
          <Target className="w-5 h-5 text-amber-500 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="font-semibold">Intentional</h4>
          <p className="text-xs text-muted-foreground">Every chapter is deliberate</p>
        </div>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4 italic text-sm">
        "I didn't spend years building myself up just to settle for someone who won't even write a proper first message. The chapters proved he was intentional before I ever gave him my time. That's all I ever wanted."
      </p>
      <p className="text-sm font-medium">-- Diamond R., 27</p>
    </Card>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            Real Stories from Real People
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Different People. Different Styles. Same Result.
          </h2>
          <p className="text-muted-foreground text-lg">
            Pursuers, the pursued, equal partners, romantics, explorers — they
            all found what they were looking for. The chapters just made sure
            everyone was actually showing up.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-card border border-card-border rounded-lg p-6"
              data-testid={`testimonial-${testimonial.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-primary text-primary"
                  />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6 italic">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {testimonial.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {testimonial.name}, {testimonial.age}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center max-w-2xl mx-auto mb-12">
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight font-serif mb-4">
            Every Dynamic Works Here
          </h3>
          <p className="text-muted-foreground text-lg">
            Traditional courtship, equal partnership, or something entirely your
            own — PayGate doesn't pick sides. The chapters just make sure both
            people are in it.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <TraditionalCard />
          <PartnershipCard />
          <IntentionalCard />
        </div>

        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
