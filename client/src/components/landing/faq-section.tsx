import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What makes PayGate Dating different from other dating apps?",
    answer: "PayGate Dating uses a unique 5-gate progression system where users invest $5-$20 at each stage. This financial commitment filters out casual swipers and spammers, ensuring everyone you connect with is serious about finding a meaningful relationship. Our platform attracts relationship-focused singles aged 25-45 who value quality over quantity."
  },
  {
    question: "How does the gate progression system work?",
    answer: "When you express interest in someone, you progress through 5 gates. Each gate requires a small payment ($5-$20) that alternates between the initiator and recipient. Gate 1 unlocks initial messaging, Gate 2 enables photo sharing, Gate 3 allows video calls, Gate 4 unlocks location sharing, and Gate 5 gives you full access to plan dates together. This gradual investment builds trust and commitment."
  },
  {
    question: "What are the benefits of the premium subscription?",
    answer: "Premium members ($9.99/month or $99/year) enjoy unlimited profile views, priority in discover feeds, advanced search filters, the ability to see who viewed their profile, exclusive badges, and reduced gate fees. Premium also unlocks features like gift registry management and enhanced profile customization."
  },
  {
    question: "How do I access PayGate Dating on my phone?",
    answer: "Simply scan the QR code on our homepage using your phone's camera! It will instantly open PayGate Dating in your mobile browser. You can also add it to your home screen for quick access. Our platform is fully optimized for mobile devices, giving you a seamless experience whether you're on desktop, tablet, or phone."
  },
  {
    question: "How does the gift registry feature work?",
    answer: "Create your wishlist with items from Amazon, Etsy, Net-a-Porter (luxury fashion), or travel experiences from Viator and Klook. When someone wants to show genuine interest, they can purchase a gift from your wishlist. Gifts unlock additional gates based on their value ($25 unlocks 1 gate, $50 unlocks 2 gates, $100 unlocks 3 gates). From designer bags to sunset cruises, show your personality through your wishlist."
  },
  {
    question: "What is the friends-of-friends network?",
    answer: "Similar to how real-world relationships often form through mutual connections, our platform shows you mutual connections with potential matches. When you see '3 mutual connections' on a profile, it means you share connections with that person, building trust and giving you conversation starters."
  },
  {
    question: "How does ID verification work?",
    answer: "To prevent catfishing, we offer AI-powered ID verification. Simply take a selfie and our system compares it to your profile photos. Verified users receive a badge on their profile, increasing trust and match rates. You get up to 5 verification attempts."
  },
  {
    question: "What is the Nearby Map feature?",
    answer: "The Nearby Map lets you discover singles in your area in real-time. Toggle 'Go Live' to appear on the map (your location is fuzzy to ~500m for privacy). See who's nearby, view their profiles, and express interest. It's like a digital version of catching someone's eye across the room."
  },
  {
    question: "How do referrals work?",
    answer: "Share your unique referral code with friends. When they sign up and make their first gate payment, you both receive bonus credits in your wallet. It's our way of rewarding you for helping grow a community of serious daters."
  },
  {
    question: "What is my Personal QR Code and how does it help me?",
    answer: "Every user gets a unique QR code linking to their public profile. Share it with people you meet in real life - at coffee shops, events, or anywhere you go. When someone scans your code, they see your profile preview and wishlist, giving them a clear idea of what you're looking for and how to impress you. When they sign up through your code, you earn bonus credits! It's the perfect way to attract high-value suitors who are ready to invest in connecting with you."
  },
  {
    question: "Can I pay with cryptocurrency?",
    answer: "Yes! We accept cryptocurrency payments through Stripe's secure payment system. When you add funds to your wallet, you can choose to pay with stablecoins (USDC, USDT) or other cryptocurrencies like Bitcoin and Ethereum. Simply select the crypto option at checkout and complete your payment. Your wallet will be credited once the transaction is confirmed."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit and debit cards, Apple Pay, Google Pay, and cryptocurrency (including Bitcoin, Ethereum, USDC, and USDT). All payments are processed securely through Stripe, the same trusted platform used by millions of businesses worldwide. Your payment details are encrypted and never stored on our servers."
  },
  {
    question: "Is my payment information secure?",
    answer: "Absolutely. We use Stripe for all payment processing, the industry-leading payment platform trusted by millions of businesses. Your payment details are encrypted end-to-end and never stored on our servers. All transactions are secure, PCI-compliant, and protected by fraud detection. Whether you pay by card or crypto, your financial information is always safe."
  }
];

export function FAQSection() {
  return (
    <section className="py-16 md:py-24" id="faq" data-testid="section-faq">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-faq-title">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-faq-description">
            Everything you need to know about PayGate Dating and how our unique approach helps you find genuine connections.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full" data-testid="faq-accordion">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger 
                  className="text-left hover:no-underline"
                  data-testid={`faq-trigger-${index}`}
                >
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent 
                  className="text-muted-foreground"
                  data-testid={`faq-content-${index}`}
                >
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
