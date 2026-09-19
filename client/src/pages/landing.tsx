import { useEffect, useState } from "react";
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
import { FAQSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { Chatbot } from "@/components/chatbot";
import { Seo } from "@/components/seo";
import { Home, BookOpen, Star, DollarSign, Shield, HelpCircle } from "lucide-react";
import { Link } from "wouter";

const sections = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    content: () => <SeasonalHero />,
  },
  {
    id: "how-it-works",
    label: "How It Works",
    icon: BookOpen,
    content: () => (
      <div className="overflow-y-auto" style={{ height: "calc(100vh - 120px)" }}>
        <ScreeningSection />
        <GateTimeline />
        <PersonasSection />
        <FrontDoorSection />
      </div>
    ),
  },
  {
    id: "features",
    label: "Features",
    icon: Star,
    content: () => (
      <div className="overflow-y-auto" style={{ height: "calc(100vh - 120px)" }}>
        <ValueProps />
        <ConciergeSection />
        <FeaturesSection />
      </div>
    ),
  },
  {
    id: "pricing",
    label: "Pricing",
    icon: DollarSign,
    content: () => (
      <div className="overflow-y-auto" style={{ height: "calc(100vh - 120px)" }}>
        <PricingSection />
      </div>
    ),
  },
  {
    id: "stories",
    label: "Stories",
    icon: Shield,
    content: () => (
      <div className="overflow-y-auto" style={{ height: "calc(100vh - 120px)" }}>
        <Testimonials />
        <SecuritySection />
      </div>
    ),
  },
  {
    id: "faq",
    label: "FAQ",
    icon: HelpCircle,
    content: () => (
      <div className="overflow-y-auto" style={{ height: "calc(100vh - 120px)" }}>
        <FAQSection />
      </div>
    ),
  },
];

type LandingProps = {
  initialTab?: string;
};

export default function Landing({ initialTab = "home" }: LandingProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const ActiveContent = sections.find((s) => s.id === activeTab)?.content;
  const pageTitle = activeTab === "home"
    ? "PayGate Dating - Five Chapters. Two People. One Story."
    : `${sections.find((section) => section.id === activeTab)?.label ?? "PayGate Dating"} - PayGate Dating`;
  const canonicalPath = activeTab === "home" ? "/" : `/${activeTab}`;

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title={pageTitle}
        description="Join and browse PayGate Dating for free. State your intent, knock, and move through five pay-as-you-go chapters only when both people choose to continue."
        canonicalPath={canonicalPath}
      />
      <SeasonalBanner />
      <NavHeader />

      <div className="flex flex-1">
        <nav className="hidden md:flex flex-col gap-1 w-56 shrink-0 border-r border-border p-4 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto bg-background" data-testid="section-sidebar-desktop">
          {sections.map((section) => {
            const isActive = activeTab === section.id;
            if (section.id !== "home") {
              return (
                <Link
                  key={section.id}
                  href={`/${section.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  data-testid={`sidebar-${section.id}`}
                >
                  <section.icon className="w-4 h-4 shrink-0" />
                  {section.label}
                </Link>
              );
            }
            return (
              <button
                key={section.id}
                onClick={() => handleTabChange(section.id)}
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

        <div className="flex-1 flex flex-col min-w-0">
          <div className="md:hidden sticky top-[53px] z-40 bg-background/95 backdrop-blur-md border-b border-border px-2 py-2">
            <div className="flex flex-wrap justify-center gap-1">
              {sections.map((section) => {
                const isActive = activeTab === section.id;
                if (section.id !== "home") {
                  return (
                    <Link
                      key={section.id}
                      href={`/${section.id}`}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                      data-testid={`tab-${section.id}`}
                    >
                      <section.icon className="w-3.5 h-3.5" />
                      {section.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={section.id}
                    onClick={() => handleTabChange(section.id)}
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

          <main className="flex-1">
            {ActiveContent && <ActiveContent />}
          </main>
          <Footer />
        </div>
      </div>

      <Chatbot />
    </div>
  );
}
