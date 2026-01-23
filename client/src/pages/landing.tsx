import { NavHeader } from "@/components/landing/nav-header";
import { SeasonalBanner } from "@/components/landing/seasonal-banner";
import { SeasonalHero } from "@/components/landing/seasonal-hero";
import { GateTimeline } from "@/components/landing/gate-timeline";
import { ValueProps } from "@/components/landing/value-props";
import { FeaturesSection } from "@/components/landing/features-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { Testimonials } from "@/components/landing/testimonials";
import { SecuritySection } from "@/components/landing/security-section";
import { QRCodeSection } from "@/components/landing/qr-code-section";
import { FAQSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { Chatbot } from "@/components/chatbot";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SeasonalBanner />
      <NavHeader />
      <main>
        <SeasonalHero />
        <GateTimeline />
        <ValueProps />
        <FeaturesSection />
        <PricingSection />
        <Testimonials />
        <SecuritySection />
        <QRCodeSection />
        <FAQSection />
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}
