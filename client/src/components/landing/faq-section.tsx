import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What makes PayGate Dating different from other dating apps?",
    answer: "PayGate is 100% free to join -- no subscriptions, no monthly fees, ever. You only invest when you find someone you genuinely want to write a story with. Our 5-chapter journey means every step forward is one you both chose to take together, not a faceless monthly charge. This naturally filters out people who aren't willing to show up, so the people you meet are actually invested in getting to know you."
  },
  {
    question: "How does the chapter progression system work?",
    answer: "Think of it like the natural chapters of getting to know someone. When you express interest, you move through 5 chapters together. Each chapter is a moment where one of you leads and the other follows: Chapter 1 ($5) is The Spark -- your first move. Chapter 2 ($5) is The Curiosity -- they write back. Chapter 3 ($10) is Getting Real -- walls come down. Chapter 4 ($15) is Face to Face -- video calls and real chemistry. Chapter 5 ($20) is Beyond the Screen -- you exchange contact info. Both people take turns leading, so you're always co-authoring the story together."
  },
  {
    question: "Why is this better for women?",
    answer: "You've written incredible chapters of your own story -- the fitness, the career, the style, the growth. PayGate makes sure the men who reach out to you have written strong chapters too. When someone reaches Chapter 3 with you, it's not just a swipe -- it's proof they're willing to show up and put in real effort, the same way you do every day. No more low-effort messages or matches that go nowhere."
  },
  {
    question: "Why is this better for men?",
    answer: "You've been writing your story through discipline -- the gym, the career, the education, the personal growth. PayGate connects you with women who've written just as compelling a story -- their health, their style, their ambitions, their depth. And you lead the dynamic. Want to make the first move? Go for it. Want a partner who matches your effort chapter for chapter? The system supports that. Every dollar goes toward someone who's already shown genuine interest back."
  },
  {
    question: "Do both people have to pay?",
    answer: "Chapter payments alternate between you and your match, so both people show up. However, every story is different -- if you'd prefer the other person leads your chapter, you can send a 'payment request.' They'll see a full forecast and can accept or decline. This flexibility lets you set the tone for each connection: traditional, 50/50, or somewhere in between. It's about finding the dynamic that feels right for both of you."
  },
  {
    question: "How can I share my profile when I'm out and about?",
    answer: "Every member gets a personal QR code and a shareable profile link. Share it anywhere -- put it in your dating app bios, social media stories, text it to someone you just met at a coffee shop, or print it on cards to hand out. When someone scans your code, they see your opening page -- your profile preview and wishlist. When they sign up through your link and start their first chapter, you both earn bonus credits!"
  },
  {
    question: "Is it really free to join? What's the catch?",
    answer: "No catch. Signing up, building your profile, browsing, and being discovered are all completely free -- forever. You only invest when you actively want to start a new chapter with someone specific. We make money from chapter fees and gift service charges, not subscriptions. This means we're motivated to help you find great matches, not just keep you paying month after month."
  },
  {
    question: "How does the gift registry feature work?",
    answer: "Create your wishlist with items from Amazon, Promeed, Lashterally, Abracadabra NYC, YCZ Fragrance, or travel experiences from Viator and Klook. When someone wants to show they've been paying attention to your story, they can purchase a gift from your wishlist through PayGate. There's a small service fee (10% of gift value or $5, whichever is greater). Gifts unlock additional chapters based on their value -- it's a meaningful way to show you're reading between the lines."
  },
  {
    question: "How does gift delivery work? Do I need to share my address?",
    answer: "Your address is never shared with anyone. When someone sends you a gift through PayGate, you'll see a notification in your 'My Gifts' inbox. Just tap 'Claim & Purchase' and you'll be taken to the retailer's website where you can order the item and ship it to your own address. The sender never sees where you live -- your privacy is always protected."
  },
  {
    question: "What is match intent and why would I set it?",
    answer: "Match intent lets you label what kind of story you're looking to write with each specific connection -- Serious Romance, Casual Dating, Activity Partner, or Just Chatting. It's set per match, not globally, so you might be writing a romance with one person and looking for a hiking buddy with another. It helps set expectations early so nobody's time or energy goes to waste."
  },
  {
    question: "Can I ask the other person to pay for my chapter?",
    answer: "Yes! If it's your turn to lead but you'd prefer the other person takes it, you can send a 'payment request.' They'll see a full forecast showing what each of you has invested so far and what the remaining chapters will cost. They can accept (and lead your chapter) or decline. There's no limit on requests -- every connection has its own dynamic."
  },
  {
    question: "Can I pause chapter progression if things are going well where they are?",
    answer: "Absolutely. If you're enjoying the current chapter and don't want to feel pressured to advance, just hit 'Stay Here.' This pauses the story without ending it -- you can keep getting to know each other at your own pace. Either person can turn the page whenever they're ready for the next chapter."
  },
  {
    question: "How does the Nearby Map work?",
    answer: "Toggle 'Go Live' to appear on the map and discover singles in your area in real-time. Your location is fuzzy to about 500 meters for privacy. See who's nearby, view their profiles, and express interest -- it's like catching someone's eye across the room and deciding to walk over."
  },
  {
    question: "How do referrals work?",
    answer: "Share your unique referral code with friends. When they sign up and start their first chapter with someone, you both receive bonus credits. It's our way of rewarding you for helping build a community of people who take their love story seriously."
  },
  {
    question: "Is my personal information safe?",
    answer: "Absolutely. PayGate is designed with privacy first. Your personal details are never shared with other users. When you receive a gift, you claim it yourself and enter your own shipping details directly on the retailer's site. The gift sender only knows that you received and claimed their gift -- nothing more."
  },
  {
    question: "How does ID verification work?",
    answer: "To prevent catfishing, we offer AI-powered ID verification. Simply take a selfie and our system compares it to your profile photos. Verified users receive a badge on their profile, increasing trust and match rates. You get up to 5 verification attempts."
  },
  {
    question: "What is the friends-of-friends network?",
    answer: "Similar to how real-world relationships often form through mutual connections, our platform shows you mutual connections with potential matches. When you see '3 mutual connections' on a profile, it means you share connections with that person -- building trust and giving you conversation starters."
  },
  {
    question: "Can I pay with cryptocurrency?",
    answer: "Yes! We accept cryptocurrency payments through Stripe's secure payment system. When you add funds to your wallet, you can choose to pay with stablecoins (USDC, USDT) or other cryptocurrencies like Bitcoin and Ethereum. Simply select the crypto option at checkout."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit and debit cards, Apple Pay, Google Pay, and cryptocurrency (including Bitcoin, Ethereum, USDC, and USDT). All payments are processed securely through Stripe. Your payment details are encrypted and never stored on our servers."
  },
  {
    question: "What can I use my wallet balance for?",
    answer: "Your wallet balance is for one thing: opening chapters with your matches. Whether you deposited funds yourself or earned them through referrals, they all work the same way -- platform credits for your journey. Wallet funds cannot be withdrawn, transferred, refunded, or converted to cash. They also can't be used to purchase gifts (gift service fees are paid separately at checkout). Only deposit what you plan to use, or invite friends to grow your balance through referral bonuses."
  },
  {
    question: "What happens if a match doesn't work out?",
    answer: "That's part of the journey -- not every story is meant to be a novel, and that's perfectly okay. Because you only invested in the chapters you actually wrote together (no wasted subscription fees), your investment was modest and went toward a real interaction. You can start a new story anytime, and Chapter 1 is always just $5."
  },
  {
    question: "What are the seasonal themes and promotions?",
    answer: "PayGate features dynamic seasonal content that changes throughout the year. From spring new-beginnings themes and summer adventure campaigns to cozy fall cuffing season and winter warmth promotions, our platform evolves to match the moment. Each season brings fresh messaging, special promotions, and seasonal tips for making connections."
  },
  {
    question: "How can I attract more quality matches?",
    answer: "Quality attracts quality. Complete your profile fully with recent, genuine photos, finish ID verification to earn your trust badge, and set a clear match intent so the right people know what you're looking for. A complete, verified profile gets seen by more people and signals that you're here to write a real story -- not just browse."
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
            Everything you need to know about PayGate Dating -- free to join, pay only to turn the page.
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
