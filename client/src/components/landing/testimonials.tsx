import { BookOpen, DoorOpen, PauseCircle, Users } from "lucide-react";

const storyPrinciples = [
  {
    icon: DoorOpen,
    title: "A knock starts with intent",
    text: "The person reaching out says why they are knocking. The other person sees that intent and decides whether to open the door.",
  },
  {
    icon: Users,
    title: "Both people choose each chapter",
    text: "Joining, creating a profile, and browsing are free. Chapter fees happen only as two people choose to continue their shared story.",
  },
  {
    icon: PauseCircle,
    title: "Stopping is always allowed",
    text: "Either person can pause or stop. Paying for a chapter never guarantees a reply, a date, a relationship, or any outcome from another member.",
  },
  {
    icon: BookOpen,
    title: "Your real story is yours",
    text: "PayGate provides the structure. Members provide their own words, choices, boundaries, and pace. We do not publish invented member testimonials.",
  },
];

export function Testimonials() {
  return (
    <section id="stories" className="py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            How stories work
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            Five Chapters. Two People. One Story.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            PayGate is a concierge, not a swipe mill. Knock, state your intent,
            and wait for the other person to open the door.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {storyPrinciples.map(({ icon: Icon, title, text }) => (
            <article key={title} className="bg-card border border-card-border rounded-lg p-6">
              <Icon className="w-6 h-6 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground leading-relaxed">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}