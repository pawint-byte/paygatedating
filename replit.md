# PayGate Dating

## Overview
PayGate Dating is a free-to-join online dating platform designed for serious relationship seekers aged 25-45 in urban areas. It employs a unique 5-chapter progression system ("Your Story, Five Chapters") where users co-author a connection story together, paying incremental fees at each chapter stage, alternating who leads. This pay-as-you-go model (no subscriptions) filters out low-effort interactions, fostering more meaningful connections. The platform generates revenue through chapter fees, gift service fees, and affiliate commissions.

## User Preferences
Preferred communication style: Simple, everyday language.
Reminder preference: Always remind user to publish after making changes.

## System Architecture

### Core Design Principles
- **5-Chapter Progression ("Your Story, Five Chapters")**: User-facing messaging uses "chapters" metaphor (The Spark, The Curiosity, Getting Real, Face to Face, Beyond the Screen). Internal schema/API still uses `gate1`-`gate5` enum values for backward compatibility.
- **Co-Authored Journey Model**: Both people actively "put in work" at each chapter, creating anticipation and a sense of progress. Framed as writing a love story together, not paying for access.
- **Shared Schema**: TypeScript types and Zod schemas are shared between client and server for consistency.
- **Storage Abstraction**: Database operations are abstracted via an `IStorage` interface.

### Frontend
- **Framework**: React with TypeScript, bundled by Vite.
- **UI/UX**: shadcn/ui component library built on Radix UI, styled with Tailwind CSS and custom design tokens. Uses Inter and Crimson Pro fonts for a premium aesthetic.
- **State Management**: TanStack React Query for server state, React hooks for local state.
- **Routing**: Wouter for client-side routing.
- **Seasonal Theming**: Dynamic landing page content and components change based on seasonal configurations.

### Backend
- **Runtime**: Node.js with Express.
- **API Design**: RESTful JSON API.
- **Authentication**: Replit OpenID Connect (OIDC) via Passport.js, with sessions stored in PostgreSQL.
- **Security**: `isAuthenticated` middleware for protected routes.
- **Admin Dashboard**: Secure administrative access for managing feedback, protected by `isAdmin` middleware.

### Data Management
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM with Zod schema validation (drizzle-zod).
- **Key Entities**: Users, sessions, profiles, wallets, transactions, matches, messages.

### Key Features
- **Gate Progression**: Matches track states via a `gate_stage` enum. Chat unlocks at Gate 3. User-facing labels use chapter names (The Spark, The Curiosity, Getting Real, Face to Face, Beyond the Screen).
- **Pay-As-You-Go Model**: No subscriptions — users only pay chapter fees when they pursue connections. Free to join, browse, and build profile.
- **Gate Pull Requests**: Users can request the other person pay their chapter (push vs pull payment). Receiver sees a full cost forecast before deciding. No limits on requests per match.
- **Match Intent**: Per-match labels (Serious Romance, Casual Dating, Activity Partner, Just Chatting) let users define what they're looking for with each specific connection.
- **Gate Pausing**: "Stay Here" feature lets users pause chapter progression without ending the match. Both parties can resume anytime.
- **Persona-Driven Landing Page**: "Your Story, Your Rules" section presents 5 dater personas (The One Who Leads, The One Who's Pursued, Equal Effort, Serious Romantic, Explorer) showing how chapters work for each dating style. Addresses real dating frustrations both genders face without taking sides.
- **"I'm At Your Gate" Profile Section**: A profile field where users describe what they bring to a relationship — plays on the PayGate name ("here's why you should let me in"). Max 500 chars, visible on public profile and match cards. Available in both Simple and Detailed profile modes.
- **"The Story So Far" Keepsake**: When a match reaches Chapter 5 (completed), users can view a beautiful journey card showing both people's names/photos, a timeline of all 5 chapters (who led each, when, how long), and total journey duration. Copyable for sharing. API: GET /api/matches/:id/story (auth-protected, participants only).
- **Gift Purchasing System (Redesigned)**: Buyer pays a service fee (10% of gift value or $5, whichever is greater) via Stripe. Recipient provides a delivery address (home, work, Amazon pickup, etc.) which is shared with the buyer. Buyer then purchases the item directly from the retailer using the platform's affiliate link (click is tracked). Buyer confirms purchase, recipient confirms delivery, and gates unlock. Platform earns the service fee + affiliate commission.
  - **Gift Flow**: fee_paid → address_provided → link_clicked → purchase_confirmed → delivered
  - **Gift API Endpoints**: POST /api/gifts/checkout, POST /api/gifts/:id/provide-address, POST /api/gifts/:id/track-affiliate-click, POST /api/gifts/:id/confirm-purchase, POST /api/gifts/:id/confirm-delivery, GET /api/gifts/:id/details
  - **Fee Formula**: `calculateGiftPlatformFee(giftValue)` = max(giftValue * 10%, $5)
- **Anti-Scam Protection**: Call verification required before gifting, ghost reporting system (3+ reports = gift suspension), ID verification for gift recipients.
- **Delivery Address**: Recipient provides address directly to platform; buyer sees it to ship the gift. Address types: home, work, pickup_location, other.
- **Gift Revocation**: Buyers can cancel gifts before delivery for Stripe refund of service fee with gate progress reversal.
- **Maintenance Mode**: Set `MAINTENANCE_MODE=true` environment variable to show a branded maintenance page during updates. API routes remain accessible.
- **3D Gift Delivery Experience**: Immersive 3D animations when receiving gifts, with tier-based visual effects (Starter/Impressive/VIP). Uses React Three Fiber with WebGL fallback for unsupported browsers. Demo available at `/gift-demo`.
- **AI Onboarding Assistant**: A floating chatbot (OpenAI gpt-4o-mini) provides personalized guidance on profile setup, gate system, and wishlist suggestions.
- **ID Verification**: AI (OpenAI Vision gpt-4o-mini) compares selfies to profile photos to prevent catfishing.
- **Nearby Map**: A Leaflet/OpenStreetMap-based feature allowing users to discover other singles nearby, with location fuzzing for privacy.
- **Social Media Linking**: Users can link Instagram, TikTok, Twitter, and Snapchat profiles.
- **Help & Support System**: Users can submit feedback and issues, with an admin interface for management.
- **Friends-of-Friends Network**: Displays mutual connections to build trust.
- **Date Planning System**: For completed matches, users can propose dates with activity details, locations, and payment preferences.
- **Date Preferences System**: Users can set general date preferences and budget constraints in their profile.
- **Profile Sharing System**: Users can share their profile via QR code, downloadable profile cards, and one-tap sharing to SMS/WhatsApp/social media. Referral links store referrer info for "Interested in Me" flow.
- **Promotional Rewards System**: Comprehensive rewards engine with:
  - **Login Streak**: 7 consecutive days = $5 credits (tracked daily)
  - **Referral Tiers**: 3 referrals = $10 credits, 10 referrals = $25 credits, 5 this month = $50 bonus
  - **First Match Free**: Gate 1 free on first match
  - **Profile Completion Bonus**: 100% profile = $10 bonus credits
  - **Weekend Boost**: 2x visibility on weekends for all members
  - **Seasonal Offers**: Seasonal promotions with bonus credits and perks

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.

### Authentication
- **Replit Auth**: OIDC-based authentication.

### Payment Processing
- **Stripe**: For wallet funding and gift purchases. Webhook configured manually in Stripe Dashboard pointing to deployed URL + `/api/stripe/webhook`. Signing secret stored as `STRIPE_WEBHOOK_SECRET`. Uses `stripe-replit-sync` for schema migrations and data backfill only.
- **Stripe Crypto Payments**: Native support for stablecoins (USDC/USDT) and optional Crypto.com partnership for BTC/ETH.

### Email Service
- **Resend**: For sending various transactional emails (welcome, new match, gate unlocked, gift received, etc.).

### AI Services
- **Replit AI Integrations (OpenAI gpt-4o-mini)**: Used for the AI Onboarding Assistant and ID Verification (OpenAI Vision).

### Mapping
- **Leaflet with OpenStreetMap**: For the Nearby Map feature.

### E-commerce Affiliates
- **Amazon, Viator, Klook, Net-a-Porter, MR PORTER**: Integrated for anonymous gift purchasing with affiliate link auto-tagging.
- **Travelpayouts**: Affiliate network for Viator/Klook.