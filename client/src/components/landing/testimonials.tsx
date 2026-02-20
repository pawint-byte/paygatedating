import { Star, Crown, Scale, Gift, Dumbbell, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

const testimonials = [
  {
    name: "Sarah M.",
    age: 32,
    location: "San Francisco",
    avatar: "SM",
    quote:
      "I spend hours on my fitness, my skincare, my career -- I've worked hard to become who I am. PayGate is the first app where the men I meet have clearly put in the same effort. No more low-energy messages from guys who can't even hold a conversation.",
    rating: 5,
  },
  {
    name: "Michael R.",
    age: 35,
    location: "New York",
    avatar: "MR",
    quote:
      "I've built a career, I stay in shape, I've done the personal growth work. When I match with someone on PayGate, I know she's invested in herself too. The conversations are on a completely different level.",
    rating: 5,
  },
  {
    name: "Jessica L.",
    age: 29,
    location: "Austin",
    avatar: "JL",
    quote:
      "Met my partner through PayGate. We both showed up as our best selves -- him with his ambition and emotional depth, me with my confidence and independence. It started with both of us choosing to invest in something real.",
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
          <p className="text-xs text-muted-foreground">He leads, she nurtures</p>
        </div>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4 italic text-sm">
        "He built his career and his character so he could provide. I've invested in my grace, my presence, and my ability to create warmth. We both did the work -- just in different ways. PayGate lets us find each other."
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
          <p className="text-xs text-muted-foreground">We grow together</p>
        </div>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4 italic text-sm">
        "We both hit the gym, we both have ambitions, we both invest in how we show up. I wanted someone who matches my energy across the board -- not just financially, but emotionally, physically, and mentally. Found exactly that here."
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
          <Gift className="w-5 h-5 text-amber-500 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="font-semibold">Intentional</h4>
          <p className="text-xs text-muted-foreground">Actions speak louder</p>
        </div>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4 italic text-sm">
        "I didn't spend years perfecting my style, my fitness, and my mindset just to settle. I notice the guys here have done the same -- they're educated, driven, and they show up with real effort. That's all I ever wanted."
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
            Real Stories
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            People Who've Done the Work
          </h2>
          <p className="text-muted-foreground text-lg">
            They invested in themselves first. Then they found someone who did the same.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
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
            Your Relationship, Your Rules
          </h3>
          <p className="text-muted-foreground text-lg">
            Whether you prefer traditional dynamics, equal partnership, or your own unique approach --
            PayGate welcomes every way of showing up for love.
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
