import { Gift, Heart, Compass, Dumbbell, Sparkles, GraduationCap } from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "You've Already Paid the Price",
    description:
      "The hours at the gym. The degree you earned. The career you built. The skincare routine, the wardrobe, the discipline. You've invested in becoming someone worth knowing -- PayGate is where that investment finally pays off.",
  },
  {
    icon: Compass,
    title: "A Journey, Not a Transaction",
    description:
      "Our 5-gate system mirrors how real relationships grow: slowly, deliberately, and with both people equally committed. Each step forward means you're both choosing each other -- not just swiping.",
  },
  {
    icon: Gift,
    title: "Thoughtful Gestures Speak Volumes",
    description:
      "Browse wishlists and send meaningful gifts to show you've been paying attention. It's the digital version of remembering their favorite flower or their dream vacation spot -- small acts that say 'I see you.'",
  },
];

function HisInvestment() {
  return (
    <div className="bg-card border border-card-border rounded-md p-6 hover-elevate" data-testid="value-his-investment">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-md bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center">
          <Dumbbell className="w-6 h-6 text-blue-500 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">How He Shows Up</h3>
          <p className="text-xs text-muted-foreground">The work he's already done</p>
        </div>
      </div>
      <ul className="space-y-2.5 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>Building his career and financial stability</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>Staying disciplined at the gym and taking care of his health</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>Earning degrees, certifications, and professional growth</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>Developing emotional maturity and communication skills</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>Building a life worth sharing with someone</span>
        </li>
      </ul>
    </div>
  );
}

function HerInvestment() {
  return (
    <div className="bg-card border border-card-border rounded-md p-6 hover-elevate" data-testid="value-her-investment">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-md bg-rose-500/10 dark:bg-rose-400/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-rose-500 dark:text-rose-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">How She Shows Up</h3>
          <p className="text-xs text-muted-foreground">The work she's already done</p>
        </div>
      </div>
      <ul className="space-y-2.5 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 flex-shrink-0" />
          <span>Staying fit through exercise, yoga, pilates, or the gym</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 flex-shrink-0" />
          <span>Investing in skincare, beauty routines, hair, and nails</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 flex-shrink-0" />
          <span>Curating her style -- the wardrobe, the confidence, the presence</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 flex-shrink-0" />
          <span>Building her education, career, and independence</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 flex-shrink-0" />
          <span>Nurturing her emotional depth, friendships, and sense of self</span>
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
            You've Been Investing in Yourself for Years
          </h2>
          <p className="text-muted-foreground text-lg">
            "Pay" isn't just about money. It's the gym sessions, the late nights
            studying, the self-care routines, the career moves, the personal growth.
            Both men and women invest deeply in becoming their best selves --
            PayGate is where that effort meets someone who appreciates it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <HisInvestment />
          <HerInvestment />
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
