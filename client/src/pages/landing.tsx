import { useState } from "react";
import { NavHeader } from "@/components/landing/nav-header";
import { SeasonalBanner } from "@/components/landing/seasonal-banner";
import { SeasonalHero } from "@/components/landing/seasonal-hero";
import { ScreeningSection } from "@/components/landing/screening-section";
import { GateTimeline } from "@/components/landing/gate-timeline";
import { PersonasSection } from "@/components/landing/personas-section";
import { FrontDoorSection } from "@/components/landing/front-door-section";
import { ValueProps } from "@/components/landing/value-props";
import { FeaturesSection } from "@/components/landing/features-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { Testimonials } from "@/components/landing/testimonials";
import { SecuritySection } from "@/components/landing/security-section";
import { ConciergeSection } from "@/components/landing/concierge-section";
import { GlobalStorySection } from "@/components/landing/global-story-section";
import { FAQSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { Chatbot } from "@/components/chatbot";
import { BookOpen, Star, DollarSign, Shield, HelpCircle } from "lucide-react";

const sections = [
  {
    id: "how-it-works",
    label: "How It Works",
    icon: BookOpen,
    content: () => (
      <>
        <ScreeningSection />
        <GateTimeline />
        <PersonasSection />
        <FrontDoorSection />
      </>
    ),
  },
  {
    id: "features",
    label: "Features",
    icon: Star,
    content: () => (
      <>
        <ValueProps />
        <ConciergeSection />
        <GlobalStorySection />
        <FeaturesSection />
      </>
    ),
  },
  {
    id: "pricing",
    label: "Pricing",
    icon: DollarSign,
    content: () => <PricingSection />,
  },
  {
    id: "stories",
    label: "Stories",
    icon: Shield,
    content: () => (
      <>
        <Testimonials />
        <SecuritySection />
      </>
    ),
  },
  {
    id: "faq",
    label: "FAQ",
    icon: HelpCircle,
    content: () => <FAQSection />,
  },
];

export default function Landing() {
  const [activeTab, setActiveTab] = useState("how-it-works");

  const ActiveContent = sections.find((s) => s.id === activeTab)?.content;

  return (
    <div className="min-h-screen bg-background">
      <SeasonalBanner />
      <NavHeader />
      <main>
        <SeasonalHero />

        <div id="section-content" className="container mx-auto px-4 md:px-6 py-8">
          <div className="flex gap-6">
            <nav className="hidden md:flex flex-col gap-1 w-52 shrink-0 sticky top-[80px] self-start" data-testid="section-sidebar-desktop">
              {sections.map((section) => {
                const isActive = activeTab === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    data-testid={`sidebar-${section.id}`}
                  >
                    <section.icon className="w-4 h-4 shrink-0" />
                    {section.label}
                  </button>
                );
              })}
            </nav>

            <div className="md:hidden sticky top-[57px] z-40 -mx-4 px-4 bg-background/95 backdrop-blur-md border-b border-border pb-2 pt-2 mb-4">
              <div className="flex overflow-x-auto gap-1 scrollbar-hide">
                {sections.map((section) => {
                  const isActive = activeTab === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveTab(section.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                      data-testid={`tab-${section.id}`}
                    >
                      <section.icon className="w-3.5 h-3.5" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {ActiveContent && <ActiveContent />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}
