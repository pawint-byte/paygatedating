// Curated from the existing landing FAQ/pricing and the wallet payment-confirmation
// route. Shared by server HTML, client navigation, and FAQPage structured data.
import { SKIP_FAQ } from "./skip-copy";
export const FAQ_TITLE = "FAQ | PayGate Dating";
export const FAQ_H1 = "PayGate Dating FAQ";
export const FAQ_CANONICAL = "https://paygatedating.com/faq";
export const FAQ_DESCRIPTION = "Answers about joining PayGate Dating for free, five pay-as-you-go chapters, wallet funds, Stripe payments, and how chapter fees support the community.";

export const FAQ_ITEMS = [
  SKIP_FAQ,
  {
    question: "When does messaging unlock, and do I pay per message?",
    answer: "Messaging unlocks for both people when your match reaches Chapter 3 (Getting Real), also called Gate 3, and stays available in later chapters and at Connected. Messaging is not pay-per-message and does not require a subscription. Chapter fees apply to progressing your match, not to each message. If you are still in Chapter 1 or 2, visit My Matches to continue your chapter journey together, then return to Messages to chat.",
  },
  {
    question: "Is PayGate Dating free to join?",
    answer: "Signing up, building your profile, browsing, and being discovered are all free. You only invest when you actively want to start a new chapter with someone specific.",
  },
  {
    question: "Do I need a monthly subscription?",
    answer: "No monthly subscription is required for the pay-as-you-go chapter journey. You invest in individual chapters when you choose to pursue a connection, rather than paying a monthly fee.",
  },
  {
    question: "What do the five chapters cost?",
    answer: "Chapter 1, The Spark: $5 — light the spark, make your first move. Chapter 2, The Curiosity: $5 — they write back, curiosity takes hold. Chapter 3, Getting Real: $10 — walls come down, the real you shows up. Chapter 4, Face to Face: $15 — see the smile, hear the laugh, feel the chemistry. Chapter 5, Beyond the Screen: $20 — take your story beyond the screen. These are the standard pay-as-you-go chapter prices.",
  },
  {
    question: "Is this a love-story journey or a paywall for access?",
    answer: "Think of it like the natural chapters of getting to know someone. You only invest when you find someone you genuinely want to write a story with. Our five-chapter journey means every step forward is one you both choose to take together, not a faceless monthly charge. Joining and browsing are free; the paid steps are the chapters you choose to pursue together.",
  },
  {
    question: "Do both people have to pay?",
    answer: "Chapter payments alternate between you and your match, so both people show up. If you would prefer the other person to lead your chapter, you can send a payment request. They see a full forecast and can accept or decline. Both people take turns leading, so you are co-authoring the story together.",
  },
  {
    question: "How do the wallet and Add Funds work?",
    answer: "Use Add Funds to put platform credits in your wallet for opening chapters with your matches. Whether you deposit funds yourself or earn them through referrals, they work as platform credits for your journey. Wallet funds cannot be withdrawn, transferred, refunded, or converted to cash. They cannot be used to purchase gifts; gift service fees are paid separately at checkout. Only deposit what you plan to use.",
  },
  {
    question: "Are payments verified through Stripe?",
    answer: "Payments are processed securely through Stripe. PayGate checks Stripe payment confirmation for wallet funding. This verifies the payment, not a member's identity or their intentions.",
  },
  {
    question: "What am I paying for as a member?",
    answer: "You only invest when you find someone you genuinely want to write a story with. Each chapter is a chosen step in pursuing that connection and getting to know each other more deeply, with both people taking turns leading. Not every story is meant to be a novel: you invest in the chapters you actually choose together, not a promise of a relationship.",
  },
  {
    question: "How does paying support PayGate and its founder?",
    answer: "PayGate makes money from chapter fees and gift service charges. Those charges are how we keep this community running. Joining and browsing remain free, while chosen paid steps give members a way to pursue a connection and help sustain the platform. It is paid software offering real value, not a promise of guaranteed romantic results.",
  },
] as const;

export function faqStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${FAQ_CANONICAL}#faq`,
    url: FAQ_CANONICAL,
    name: FAQ_TITLE,
    mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}