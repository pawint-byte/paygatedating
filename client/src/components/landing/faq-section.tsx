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
    answer: "When you express interest in someone, you progress through 5 gates. Each gate requires a small payment that alternates between you and your match: Gate 1 ($5) sends your interest request, Gate 2 ($5) continues the connection, Gate 3 ($10) unlocks bi-directional chat messaging, Gate 4 ($15) deepens your access, and Gate 5 ($20) gives full access to plan dates together. Both users must pay their turns — if it's your turn, you pay regardless of membership status. This mutual investment ensures both people are genuinely interested."
  },
  {
    question: "Do both people have to pay? What if I'm a premium member?",
    answer: "Yes, both people pay their alternating gate turns to ensure mutual investment. However, premium members get significant advantages: Gate 1 is always free on every new match, and all gate fees are 50% off. Plus, if a match doesn't work out before reaching Gate 3 (where chat unlocks), premium members get 50% of their gate payments back as consolation credits. Once Gate 3 is reached, both users can message each other freely with no extra cost to reply."
  },
  {
    question: "What are the benefits of the premium subscription?",
    answer: "Premium members ($9.99/month or $99/year) get powerful advantages: Gate 1 is free on every new match, 50% off all gate fees, consolation credits if a match ends before Gate 3, read receipts on messages, unlimited daily profile views (free users get 10/day), 2x weekend visibility boosts, priority in discover feeds, advanced search filters, exclusive badges, and enhanced profile customization."
  },
  {
    question: "How do I access PayGate Dating on my phone?",
    answer: "Simply scan the QR code on our homepage using your phone's camera! It will instantly open PayGate Dating in your mobile browser. You can also add it to your home screen for quick access. Our platform is fully optimized for mobile devices, giving you a seamless experience whether you're on desktop, tablet, or phone."
  },
  {
    question: "How does the gift registry feature work?",
    answer: "Create your wishlist with items from Amazon, Net-a-Porter, MR PORTER (luxury fashion), or travel experiences from Viator and Klook. When someone wants to show genuine interest, they can purchase a gift from your wishlist through PayGate. All gift purchases go through our secure checkout with a 10% service fee. Gifts unlock additional gates based on their value ($25 unlocks 1 gate, $50 unlocks 2 gates, $100 unlocks 3 gates). From designer bags to sunset cruises, show your personality through your wishlist."
  },
  {
    question: "How does gift delivery work? Do I need to share my address?",
    answer: "No! Your address is never shared with anyone. When someone buys you a gift through PayGate, you'll see a notification in your 'My Gifts' inbox. Just tap 'Claim & Purchase' and you'll be taken to the retailer's website where you can order the item and ship it to your own address. The sender never sees where you live."
  },
  {
    question: "Is my personal information safe?",
    answer: "Absolutely. PayGate is designed with privacy first. Your shipping address and personal details are never shared with other users. When you receive a gift, you claim it yourself and enter your own shipping details directly on the retailer's site. The gift sender only knows that you received and claimed their gift — nothing more."
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
    question: "Can I ask the other person to pay for my gate?",
    answer: "Yes! If it's your turn to pay but you'd prefer the other person covers it, you can send a 'payment request.' They'll see a full forecast showing what each of you has paid so far and what the remaining gates will cost. They can accept (and pay your gate) or decline (leaving you to pay it yourself). There's no limit on how many requests you can send — every connection is unique, and you can manage each one differently."
  },
  {
    question: "What is match intent and why would I set it?",
    answer: "Match intent lets you label what you're looking for with each specific connection — Serious Romance, Casual Dating, Activity Partner, or Just Chatting. It's set per match, not globally, so you might be pursuing a serious connection with one person and just looking for a hiking buddy with another. When you share your intent, the other person can see it, which helps set expectations."
  },
  {
    question: "Can I pause gate progression if I'm happy where things are?",
    answer: "Absolutely. If you're enjoying the chat phase and don't want to feel pressured to advance, just hit 'Stay Here.' This pauses gate progression without ending the match — you can keep chatting and getting to know each other. Either person can resume gate progression whenever they're ready to move forward."
  },
  {
    question: "What is the gate payment forecast?",
    answer: "The forecast shows you a complete picture of the financial side of your match: what each person has paid so far, what the remaining gates cost, and whose turn it is by default. When someone sends you a payment request, the forecast appears automatically so you can make an informed decision. You can also view it anytime from any active match."
  },
  {
    question: "What happens if a match doesn't work out?",
    answer: "If a match ends before reaching Gate 3 (where chat unlocks), premium members receive consolation credits — 50% of what they spent on that match is returned to their wallet. This way, you're protected if the other person loses interest early. Non-premium members don't receive consolation credits, but you can always upgrade to get this safety net."
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
  },
  {
    question: "What are Smart Notifications?",
    answer: "Our smart notification system keeps you in the loop without overwhelming you. You'll receive emails when someone expresses interest in your profile, when potential matches are nearby (within 10km of your location), and friendly reminders if you haven't been active for a while. All notifications include seasonal-themed messaging to keep things fresh and engaging."
  },
  {
    question: "What are the seasonal themes and promotions?",
    answer: "PayGate Dating features dynamic seasonal content that changes throughout the year. From Valentine's Day specials and spring renewal themes to summer love campaigns and cozy winter promotions, our platform evolves to match the season. Each theme brings fresh messaging, special promotions, and seasonal tips for making connections. It's like the app dresses up for every occasion!"
  },
  {
    question: "Will I be notified when someone is nearby?",
    answer: "Yes! When you enable the 'Go Live' feature on the Nearby Map, you'll appear to other users within your area. If someone goes live near you (within 10km), you may receive an email alert letting you know there are active singles nearby. This helps you connect with people in your area at the right moment."
  },
  {
    question: "How can I become a 'walking billboard' to attract more matches?",
    answer: "Every member gets a personal QR code and shareable profile link. Share it anywhere - on your dating app bios, Instagram stories, or print it on pocket cards to hand out at events. When someone scans your QR code, they see your profile preview and wishlist. If they sign up through your link, you earn $5 in referral credits! It's the easiest way to attract quality suitors who are ready to invest in connecting with you."
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
