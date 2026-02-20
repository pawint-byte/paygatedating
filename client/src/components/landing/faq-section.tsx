import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What makes PayGate Dating different from other dating apps?",
    answer: "PayGate is 100% free to join — no subscriptions, no monthly fees, ever. You only pay when you find someone you genuinely want to connect with. Our 5-gate progression system means every dollar you spend goes toward a real conversation with a real person, not a faceless monthly charge. This filters out casual swipers and bots, so the people you meet are actually invested in getting to know you."
  },
  {
    question: "How does the gate progression system work?",
    answer: "When you express interest in someone, you progress through 5 gates. Each gate requires a small payment that alternates between you and your match: Gate 1 ($5) sends your interest, Gate 2 ($5) continues the connection, Gate 3 ($10) unlocks chat messaging, Gate 4 ($15) deepens your access, and Gate 5 ($20) gives full access to plan dates together. Both users invest their turns — this mutual skin-in-the-game ensures both people are genuinely interested."
  },
  {
    question: "Why is this better for women?",
    answer: "Think of it this way: when a guy pays to open a gate with you, that's not just a swipe — it's a statement. He's putting real money behind his interest, which means no more wading through low-effort \"hey\" messages or endless matches that go nowhere. You'll only hear from men who are serious. Plus, you can share your profile QR code or link anywhere — at brunch, on your Instagram story, or on a night out — so the right people can find you and show their interest the right way."
  },
  {
    question: "Why is this better for men?",
    answer: "You're in control of how your connections work. Want a traditional dynamic where you lead and cover the gates? Go for it. Want a partner who has skin in the game and shares the investment? The gate system supports that too — she can pay her gates, showing she's equally invested. Either way, you're not throwing money at a subscription hoping someone shows up. Every dollar goes toward an actual connection with someone who's already shown interest back."
  },
  {
    question: "Do both people have to pay?",
    answer: "Gate payments alternate between you and your match, so both people invest. However, every connection is different — if you'd prefer the other person to cover your turn, you can send a 'payment request.' They'll see a full cost forecast and can accept or decline. This flexibility lets you set the tone for each connection: traditional, 50/50, or somewhere in between."
  },
  {
    question: "How can I share my profile when I'm out and about?",
    answer: "Every member gets a personal QR code and a shareable profile link. Share it anywhere — put it in your dating app bios, Instagram stories, text it to someone you just met at a coffee shop, or print it on pocket cards to hand out at events. When someone scans your code, they see your profile preview and wishlist — giving them a clear picture of who you are and how to impress you. If they sign up through your link, you earn bonus credits!"
  },
  {
    question: "Is it really free to join? What's the catch?",
    answer: "No catch. Signing up, building your profile, browsing other profiles, and being discovered are all completely free — forever. You only pay when you actively want to pursue a connection with someone specific. We make money from gate fees and gift service charges, not subscriptions. This means we're incentivized to help you find great matches, not just keep you paying month after month."
  },
  {
    question: "How does the gift registry feature work?",
    answer: "Create your wishlist with items from Amazon, Net-a-Porter, MR PORTER (luxury fashion), or travel experiences from Viator and Klook. When someone wants to show genuine interest, they can purchase a gift from your wishlist through PayGate. All gift purchases include a small service fee (10% of gift value or $5, whichever is greater). Gifts unlock additional gates based on their value — it's a meaningful way to stand out."
  },
  {
    question: "How does gift delivery work? Do I need to share my address?",
    answer: "No! Your address is never shared with anyone. When someone buys you a gift through PayGate, you'll see a notification in your 'My Gifts' inbox. Just tap 'Claim & Purchase' and you'll be taken to the retailer's website where you can order the item and ship it to your own address. The sender never sees where you live."
  },
  {
    question: "What is match intent and why would I set it?",
    answer: "Match intent lets you label what you're looking for with each specific connection — Serious Romance, Casual Dating, Activity Partner, or Just Chatting. It's set per match, not globally, so you might be pursuing a serious connection with one person and just looking for a hiking buddy with another. It helps set expectations so nobody's wasting time or money."
  },
  {
    question: "Can I ask the other person to pay for my gate?",
    answer: "Yes! If it's your turn to pay but you'd prefer the other person covers it, you can send a 'payment request.' They'll see a full forecast showing what each of you has paid so far and what the remaining gates will cost. They can accept (and pay your gate) or decline (leaving you to pay it yourself). There's no limit on requests — every connection is unique."
  },
  {
    question: "Can I pause gate progression if things are going well where they are?",
    answer: "Absolutely. If you're enjoying the chat phase and don't want to feel pressured to advance, just hit 'Stay Here.' This pauses gate progression without ending the match — you can keep chatting and getting to know each other. Either person can resume whenever they're ready to move forward."
  },
  {
    question: "How does the Nearby Map work?",
    answer: "Toggle 'Go Live' to appear on the map and discover singles in your area in real-time. Your location is fuzzy to about 500 meters for privacy. See who's nearby, view their profiles, and express interest — it's like a digital version of catching someone's eye across the room."
  },
  {
    question: "How do referrals work?",
    answer: "Share your unique referral code with friends. When they sign up and make their first gate payment, you both receive bonus credits in your wallet. It's our way of rewarding you for helping build a community of people who are serious about dating."
  },
  {
    question: "Is my personal information safe?",
    answer: "Absolutely. PayGate is designed with privacy first. Your shipping address and personal details are never shared with other users. When you receive a gift, you claim it yourself and enter your own shipping details directly on the retailer's site. The gift sender only knows that you received and claimed their gift — nothing more."
  },
  {
    question: "How does ID verification work?",
    answer: "To prevent catfishing, we offer AI-powered ID verification. Simply take a selfie and our system compares it to your profile photos. Verified users receive a badge on their profile, increasing trust and match rates. You get up to 5 verification attempts."
  },
  {
    question: "What is the friends-of-friends network?",
    answer: "Similar to how real-world relationships often form through mutual connections, our platform shows you mutual connections with potential matches. When you see '3 mutual connections' on a profile, it means you share connections with that person — building trust and giving you conversation starters."
  },
  {
    question: "Can I pay with cryptocurrency?",
    answer: "Yes! We accept cryptocurrency payments through Stripe's secure payment system. When you add funds to your wallet, you can choose to pay with stablecoins (USDC, USDT) or other cryptocurrencies like Bitcoin and Ethereum. Simply select the crypto option at checkout and complete your payment."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit and debit cards, Apple Pay, Google Pay, and cryptocurrency (including Bitcoin, Ethereum, USDC, and USDT). All payments are processed securely through Stripe. Your payment details are encrypted and never stored on our servers."
  },
  {
    question: "What happens if a match doesn't work out?",
    answer: "That's part of dating — not every connection leads somewhere, and that's okay. Because you only paid for the gates you actually used (no wasted subscription fees), your investment was small and went toward a real interaction. You can start a new connection anytime, and your first gate on a new match is always just $5."
  },
  {
    question: "What are the seasonal themes and promotions?",
    answer: "PayGate Dating features dynamic seasonal content that changes throughout the year. From Valentine's Day specials and spring renewal themes to summer love campaigns and cozy winter promotions, our platform evolves to match the season. Each theme brings fresh messaging, special promotions, and seasonal tips for making connections."
  },
  {
    question: "How can I become a 'walking billboard' to attract more matches?",
    answer: "Every member gets a personal QR code and shareable profile link. Share it anywhere — on your dating app bios, Instagram stories, or print it on pocket cards to hand out at events. When someone scans your QR code, they see your profile preview and wishlist. If they sign up through your link, you earn $5 in referral credits! It's the easiest way to attract quality suitors who are ready to invest in connecting with you."
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
            Everything you need to know about PayGate Dating — free to join, pay only when you're ready to connect.
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
