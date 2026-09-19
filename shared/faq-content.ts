// Curated from the existing landing FAQ/pricing and the wallet payment-confirmation
// route. Shared by server HTML, client navigation, and FAQPage structured data.
import { SKIP_FAQ } from "./skip-copy";
export const FAQ_TITLE = "FAQ | PayGate Dating";
export const FAQ_H1 = "PayGate Dating FAQ";
export const FAQ_CANONICAL = "https://paygatedating.com/faq";
export const FAQ_DESCRIPTION =
      "Answers about joining PayGate Dating for free, five pay-as-you-go chapters, connection intent, profile visibility, wallet funds, Stripe payments, gift shipping privacy, and retailer fulfillment.";

export const FAQ_ITEMS = [
      SKIP_FAQ,
      {
            question: "When does messaging unlock, and do I pay per message?",
            answer: "Messaging unlocks for both people when your match reaches Chapter 3 (Getting Real), also called Gate 3, and stays available in later chapters and at Connected. Messaging is not pay-per-message and does not require a subscription. Chapter fees apply to progressing your match, not to each message. If you are still in Chapter 1 or 2, visit My Matches to continue your chapter journey together, then return to Messages to chat.",
      },
      {
            question: "What intents can I state when I knock?",
            answer: "PayGate currently supports four per-connection intents: Serious Romance, Casual Dating, Activity Partner, and Just Chatting. The person reaching out chooses one when they knock, and it is shown on that connection so both people can set expectations. Only open the door when the stated intent is welcome.",
      },
      {
            question: "Can I be on the site and stay invisible?",
            answer: "You can stay off discovery. In Settings under Visibility, turn off Show My Profile to stay off browse and search results; this does not erase existing connections. The current visibility control also makes your public profile link unavailable, so PayGate does not yet offer a link-only hidden mode. Turn visibility back on before sharing your profile link or QR.",
      },
      {
            question: "What happens if I stop mid-story?",
            answer: "Your chapter progress stays where it is unless either person later chooses to continue. Wallet credits you have not spent stay in your wallet and remain non-withdrawable. Completed chapter fees are not refunded.",
      },
      {
            question: "What is Boost Your Visibility?",
            answer: "Boost Your Visibility is share-based: members who share their profile receive 3x more interest from quality suitors, and your QR code lets people see your wishlist before they sign up. It is not a separate paid Boost purchase. Separately, a Weekend Boost reward can give 2x visibility on weekends when that reward is active.",
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
            question: "Can the person buying my gift see my street address?",
            answer: "PayGate does not send your stored delivery address to the gift buyer in gift API responses, gift history, or chat. Ships to recipient via retailer — address stays private. Enter shipping details directly with the retailer using a supported private gift-delivery option; do not paste your street address into PayGate messages. Existing address records remain available only to you and authorized support where applicable.",
      },
      {
            question: "How do Amazon gifts ship without sharing my address?",
            answer: "Use an Amazon wishlist or a retailer-supported gift-delivery link that lets the recipient manage shipping directly with Amazon. Review Amazon's current privacy settings and delivery disclosures before purchasing. Selecting 'This is a gift' on an ordinary product page does not by itself provide private delivery. If Amazon asks the buyer for the recipient's street address, stop and use a supported private wishlist or gift-delivery option instead; never exchange the address in PayGate chat. Amazon, not PayGate, handles the order and fulfillment.",
      },
      {
            question: "Can other approved retailers deliver gifts privately?",
            answer: "For non-Amazon partners on PayGate's supported-retailer list, the retailer must offer gift shipping where the recipient enters or manages delivery details directly. Availability depends on the retailer and item. If the retailer requires the buyer to obtain the recipient's street address, do not proceed with that gift; choose a supported privacy-preserving option instead. PayGate does not collect an address for the buyer or arrange shipping.",
      },
      {
            question: "Does the PayGate gift service fee pay for the product or shipping?",
            answer: "No. Stripe checkout on PayGate pays only the gift service fee. The buyer pays the retailer separately for the product and any shipping. Paying the service fee does not mean the product has been bought or shipped. PayGate is not the product-funds custodian or shipper. Existing call/video confirmation, recipient ID verification before fee checkout, delivery confirmation, and ghost-report protections still apply.",
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
