import { Gift, BookOpen, Compass, Dumbbell, Sparkles, GraduationCap } from "lucide-react";

const values = [
  {
    icon: BookOpen,
    title: "A Story, Not a Transaction",
    description:
      "Our 5-chapter journey mirrors how real relationships unfold: slowly, deliberately, with both people choosing to turn the page together. Every chapter forward means you're both writing this story -- not just swiping through someone else's.",
  },
  {
    icon: Compass,
    title: "Both People Show Up",
    description:
      "No more one-sided effort. Each chapter alternates who leads, so both of you put in the work. When someone reaches Chapter 3 with you, you know they've been just as intentional as you have.",
  },
  {
    icon: Gift,
    title: "Thoughtful Gestures Speak Volumes",
    description:
      "Browse wishlists and send meaningful gifts that say 'I've been paying attention to your story.' It's the difference between a generic like and remembering their favorite thing -- small acts that show you're reading between the lines.",
  },
];

function HisStory() {
  return (
    <div className="bg-card border border-card-border rounded-md p-6 hover-elevate" data-testid="value-his-investment">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-md bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center">
          <Dumbbell className="w-6 h-6 text-blue-500 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">His Story So Far</h3>
          <p className="text-xs text-muted-foreground">The chapters he's already written</p>
        </div>
      </div>
      <ul className="space-y-2.5 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>Built a career through discipline, late nights, and showing up</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>Earned his health through consistency at the gym and on the plate</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>Grew through education, mentors, and real-world experience</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>Learned how to communicate, listen, and be present</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>Built a life that's ready for someone to share it with</span>
        </li>
      </ul>
    </div>
  );
}

function HerStory() {
  return (
    <div className="bg-card border border-card-border rounded-md p-6 hover-elevate" data-testid="value-her-investment">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-md bg-rose-500/10 dark:bg-rose-400/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-rose-500 dark:text-rose-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Her Story So Far</h3>
          <p className="text-xs text-muted-foreground">The chapters she's already written</p>
        </div>
      </div>
      <ul className="space-y-2.5 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 flex-shrink-0" />
          <span>Stayed committed to her health through fitness, yoga, and self-care</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 flex-shrink-0" />
          <span>Curated her confidence -- the style, the presence, the way she carries herself</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 flex-shrink-0" />
          <span>Built her education, career, and independence on her own terms</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 flex-shrink-0" />
          <span>Nurtured deep friendships and emotional intelligence</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 flex-shrink-0" />
          <span>Knows exactly who she is -- and what she deserves in a partner</span>
        </li>
      </ul>
    </div>
  );
}

export function ValueProps() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            Why PayGate?
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            You've Already Written Incredible Chapters
          </h2>
          <p className="text-muted-foreground text-lg">
            The gym sessions, the degrees, the late nights building something.
            The skincare routines, the career moves, the personal growth. Both
            men and women have been writing their own story for years -- PayGate
            is where two great stories finally meet.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <HisStory />
          <HerStory />
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
