# PayGate Dating

## Overview
PayGate Dating is a premium online dating platform designed for serious relationship seekers aged 25-45 in urban areas. It employs a unique 5-gate progression system where users pay incremental fees at each interaction stage, alternating between initiator and recipient. This financial investment model aims to filter out low-effort interactions, fostering more meaningful connections. The platform generates revenue through premium subscriptions, gate transaction fees, and affiliate integrations for anonymous gift sending.

## User Preferences
Preferred communication style: Simple, everyday language.
Reminder preference: Always remind user to publish after making changes.

## System Architecture

### Core Design Principles
- **5-Gate Progression**: A core mechanism guiding user interaction and monetization.
- **Financial Investment Model**: Users pay at interaction stages to ensure commitment.
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
- **Gate Progression**: Matches track states via a `gate_stage` enum.
- **Gift Purchasing System**: Users can purchase items from wishlists; platform charges a 10% fee and earns affiliate commissions. Gifts can unlock gates based on value.
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
  - **Referral Tiers**: 3 referrals = 1 week Premium, 10 referrals = 1 month Premium, 5 this month = Lifetime
  - **Free Trial**: 7 days (14 days during Cuffing Season Sept-Nov)
  - **First Match Free**: Gate 1 free on first match
  - **Profile Completion Bonus**: 100% profile = 1 week Premium
  - **Weekend Boost**: 2x visibility on weekends for Premium users
  - **Seasonal Offers**: Valentine's Day 50% off, Cuffing Season extended trial
  - **Couples Discount**: Both partners upgrade = 20% off

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.

### Authentication
- **Replit Auth**: OIDC-based authentication.

### Payment Processing
- **Stripe**: For wallet funding, subscriptions, and gift purchases. Includes automatic webhook management via `stripe-replit-sync`.
- **Stripe Crypto Payments**: Native support for stablecoins (USDC/USDT) and optional Crypto.com partnership for BTC/ETH.

### Email Service
- **Resend**: For sending various transactional emails (welcome, new match, gate unlocked, gift received, etc.).

### AI Services
- **Replit AI Integrations (OpenAI gpt-4o-mini)**: Used for the AI Onboarding Assistant and ID Verification (OpenAI Vision).

### Mapping
- **Leaflet with OpenStreetMap**: For the Nearby Map feature.

### E-commerce Affiliates
- **Amazon, Viator, Klook, Net-a-Porter**: Integrated for anonymous gift purchasing with affiliate link auto-tagging.
- **Travelpayouts**: Affiliate network for Viator/Klook.