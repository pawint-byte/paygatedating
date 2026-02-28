# PayGate Dating - Design Guidelines

## Design Approach: Premium Dating Hybrid
**Reference Inspiration:** Hinge's relationship-focused UI + Stripe's payment clarity + Match.com's mature aesthetic + LinkedIn's professional polish

**Core Philosophy:** Premium, trustworthy, and romantic without frivolity. Every element reinforces the value proposition: serious connections worth investing in.

---

## Typography System

**Primary Font:** Inter (Google Fonts) - clean, modern, professional
**Secondary Font:** Crimson Pro (Google Fonts) - elegant serif for romantic touches

**Hierarchy:**
- Hero Headlines: 3xl-5xl, font-bold, tracking-tight
- Section Headers: 2xl-3xl, font-semibold
- Gate Stage Titles: xl, font-medium with Crimson Pro
- Body Text: base-lg, font-normal, leading-relaxed
- UI Labels: sm-base, font-medium
- Pricing/Costs: xl-2xl, font-bold (always prominent)

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 4, 6, 8, 12, 16, 20
- Component padding: p-6 to p-8
- Section spacing: py-16 to py-24
- Card gaps: gap-6 to gap-8
- Form fields: space-y-4

**Grid Systems:**
- Landing features: 3-column on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Gate progression: Single-column flow with timeline
- Gift catalog: 4-column masonry (grid-cols-2 lg:grid-cols-4)

---

## Component Library

### Landing Page (6-8 sections)

**Hero Section (80vh):**
- Split layout: Left = Headline + value prop + "Start Free Profile" CTA, Right = Hero image showing couple connecting
- Subtext highlighting: "Zero spam. Real investment. Meaningful matches."
- Trust indicators below CTA: "10K+ Premium Members" with small user avatars

**How It Works - Gate Progression (Full section):**
- Interactive 5-step horizontal timeline with gate icons
- Each gate shows: Icon, stage name, cost, what unlocks
- Visual flow with connecting lines/arrows between stages
- Example: "Gate 1: Initial Reach-Out → $5 → Send personalized message"

**Value Proposition Grid (3-column):**
- "Quality Over Quantity" / "Mutual Investment" / "Safe & Secure"
- Each with icon, headline, 2-3 sentence description

**Pricing Comparison (2-column):**
- Free tier vs Premium subscription side-by-side cards
- Highlight Premium benefits: Priority visibility, wallet funding, unlimited gates
- "$9.99/month or $99/year" prominent

**Social Proof:**
- 3-column testimonial cards with user photos (anonymous avatars)
- Success metrics: "87% report meaningful connections" in stat callouts

**How Gifting Works:**
- 2-column split: Left = explanation text, Right = sample gift catalog preview
- Show Amazon/supported retailer integration visually

**Security & Trust:**
- Icons grid: "Stripe Secure Payments" / "Anonymous Shipping" / "Escrow Protected"

**Footer:**
- Newsletter signup, social links, legal pages, contact

### Dashboard Interface

**Wallet Component (Always visible):**
- Top bar showing current balance with "Add Funds" button
- Recent transactions dropdown

**Match Queue:**
- Card-based layout showing potential matches
- Each card: Profile photo, name, age, 2-line bio preview
- "Send Interest ($5)" button prominent on each card

**Active Gates Progress:**
- For each ongoing match, show progress tracker:
  - Visual timeline of 5 gates with current position highlighted
  - Next action required with cost displayed
  - Quick-skip option: "Pay $XX to unlock all gates"

**Chat Interface:**
- Gate-locked overlay when user hasn't paid for next stage
- Clear messaging: "Pay $10 to unlock multimedia chat" with button
- After unlocking: Standard messaging UI with file upload, emoji

### Profile Pages

**Header Section:**
- Large profile photo gallery (carousel, 4-6 images)
- Basic info sidebar: Name, age, location, tagline
- "Send Interest" or current gate action button

**About Section:**
- Multi-paragraph bio with rich formatting
- Interest tags/badges
- Looking for indicators

**Investment Signal:**
- Subtle indicator showing "Premium Member since [date]"
- Trust badge if user has completed matches

### Gift Browsing Modal

**Layout:**
- Search bar at top
- 4-column product grid from Amazon/supported retailers
- Each product card: Image, title, price, "Send Gift ($X)" button
- Filter sidebar: Category, price range

---

## Animations

**Minimal, purposeful only:**
- Gate unlock: Subtle check animation when payment processes
- Wallet balance: Number count-up when funds added
- Match notification: Gentle slide-in from top
- NO scroll animations, NO parallax, NO excessive transitions

---

## Images

**Hero Image:** Sophisticated couple having coffee/conversation in modern setting, warm natural lighting, professional photography quality - placed right side of hero split layout

**How It Works Icons:** Use Heroicons for gate stages (paper-airplane, chat-bubble, camera, video-camera, phone)

**Profile Photos:** High-quality portrait photography style, well-lit, authentic (not stock feeling)

**Gift Catalog:** Actual product images from Amazon and supported retailers

**Trust Badges:** Stripe logo, security shield icons, payment method logos in footer

---

## Critical UX Principles

1. **Cost Transparency:** Every gate action shows exact cost before interaction
2. **Progress Visibility:** Users always see where they are in the 5-gate journey
3. **Trust Building:** Payment security messaging throughout, especially near wallet/transaction UI
4. **Premium Feel:** Generous whitespace, high-quality imagery, refined typography
5. **No Dark Patterns:** Clear refund policies, no hidden fees, straightforward pricing
6. **Mobile-First:** All payment flows optimized for mobile completion

---

## Accessibility

- Maintain WCAG AA contrast standards across all text
- All interactive elements have clear focus states
- Gate progression navigable via keyboard
- Screen reader labels for all payment actions