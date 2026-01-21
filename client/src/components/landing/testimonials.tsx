import { Star, Crown, Scale, Gift } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

const testimonials = [
  {
    name: "Sarah M.",
    age: 32,
    location: "San Francisco",
    avatar: "SM",
    quote:
      "I was skeptical about paying for dating interactions, but PayGate completely changed my perspective. Every match I've had has been someone genuinely interested in getting to know me.",
    rating: 5,
  },
  {
    name: "Michael R.",
    age: 35,
    location: "New York",
    avatar: "MR",
    quote:
      "The quality of conversations here is incredible. No more ghosting, no more low-effort 'hey' messages. Worth every penny.",
    rating: 5,
  },
  {
    name: "Jessica L.",
    age: 29,
    location: "Austin",
    avatar: "JL",
    quote:
      "Met my partner through PayGate. The investment aspect weeds out people who aren't serious. We're now 8 months strong!",
    rating: 5,
  },
];

const stats = [
  { value: "87%", label: "Report meaningful connections" },
  { value: "70%", label: "Reduction in ghosting" },
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
        "I believe a man should provide and protect. In return, I give my complete devotion and make our home a haven. PayGate helps me find men who value traditional roles."
      </p>
      <p className="text-sm font-medium">— Victoria K., 34</p>
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
          <h4 className="font-semibold">50/50 Partnership</h4>
          <p className="text-xs text-muted-foreground">Equal in everything</p>
        </div>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4 italic text-sm">
        "We split bills, decisions, and responsibilities right down the middle. I wanted a true partner, not a provider or dependent. Found exactly that here."
      </p>
      <p className="text-sm font-medium">— Jordan T., 31</p>
    </Card>
  );
}

function TransactionalCard() {
  return (
    <Card className="p-6 relative overflow-hidden" data-testid="style-transactional">
      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 dark:bg-amber-400" />
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-400/10">
          <Gift className="w-5 h-5 text-amber-500 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="font-semibold">Transactional</h4>
          <p className="text-xs text-muted-foreground">Clear expectations, clear value</p>
        </div>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4 italic text-sm">
        "I respond to effort that I can see and measure - gifts, money, acts of service. It's honest and upfront. PayGate's gate system aligns perfectly with how I date."
      </p>
      <p className="text-sm font-medium">— Diamond R., 27</p>
    </Card>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            Success Stories
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Real People, Real Connections
          </h2>
          <p className="text-muted-foreground text-lg">
            See what our members are saying about their PayGate experience.
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
            Whether you prefer traditional dynamics, equal partnership, or something else entirely - 
            PayGate welcomes all relationship styles.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <TraditionalCard />
          <PartnershipCard />
          <TransactionalCard />
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
