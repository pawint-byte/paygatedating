import { NavHeader } from "@/components/landing/nav-header";
import { HeroSection } from "@/components/landing/hero-section";
import { GateTimeline } from "@/components/landing/gate-timeline";
import { ValueProps } from "@/components/landing/value-props";
import { PricingSection } from "@/components/landing/pricing-section";
import { Testimonials } from "@/components/landing/testimonials";
import { SecuritySection } from "@/components/landing/security-section";
import { Footer } from "@/components/landing/footer";
import { Chatbot } from "@/components/chatbot";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main>
        <HeroSection />
        <GateTimeline />
        <ValueProps />
        <PricingSection />
        <Testimonials />
        <SecuritySection />
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}
