# PayGate Dating

## Overview

PayGate Dating is a premium online dating platform that uses a 5-gate progression system to create meaningful connections. Users pay incremental fees ($5-$20) at each interaction stage, alternating between initiator and recipient. This financial investment model filters out low-effort interactions and spam, targeting serious relationship seekers aged 25-45 in urban areas.

The platform generates revenue through premium subscriptions ($9.99/month or $99/year), gate transaction fees (10-20% cut), and affiliate integrations for anonymous gift sending.

## User Preferences

Preferred communication style: Simple, everyday language.
Reminder preference: Always remind user to publish after making changes.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled via Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, with local state via React hooks
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens (CSS variables for theming)
- **Design System**: Premium dating aesthetic using Inter (primary) and Crimson Pro (serif accents) fonts

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Design**: RESTful JSON API with `/api` prefix
- **Authentication**: Replit OpenID Connect (OIDC) integration with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation (drizzle-zod)
- **Schema Location**: `shared/schema.ts` for shared types between client and server
- **Key Tables**: users, sessions, profiles, wallets, transactions, matches, messages

### Authentication Flow
- Replit Auth via OIDC handles user identity
- Sessions stored in PostgreSQL `sessions` table
- User records synced to `users` table on login
- Protected routes use `isAuthenticated` middleware

### Key Design Patterns
- **Shared Schema**: TypeScript types and Zod schemas shared between client/server via `@shared/*` path alias
- **Storage Abstraction**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Query Invalidation**: React Query cache invalidation after mutations for real-time UI updates
- **Gate Progression**: Match states tracked via `gate_stage` enum (gate1 through completed)
- **Gift Purchase Flow**: Users can purchase gifts from match wishlists via Stripe checkout, platform takes 10% service fee, then redirects to affiliate link for product purchase

### Gift Purchasing System
- **Wishlist Items**: Users add items from Amazon/Etsy only (validated on frontend + backend)
- **Affiliate Integration**: URLs auto-tagged with affiliate codes (AMAZON_ASSOCIATE_TAG, AWIN_PUBLISHER_ID)
- **Revenue Capture**: 10% platform fee charged via Stripe + affiliate commissions on product purchases
- **Gate Unlocking**: Gifts unlock gates based on value ($25=1, $50=2, $100=3 gates)
- **Reservation System**: Items reserved during checkout, released on cancel or 14-day timeout

### AI Onboarding Assistant
- **Floating Chatbot**: Accessible from all authenticated pages via floating button (bottom-right)
- **Profile Context Awareness**: AI knows user's profile completeness, wallet balance, match count
- **Guidance Topics**: Profile setup tips, gate system explanation, bio writing help, wishlist suggestions
- **Profile Completeness Checker**: Tracks completion score (0-100%) with specific suggestions
- **Quick Questions**: Pre-built questions for common topics (bio tips, gate system, first message advice)
- **Streaming Responses**: Real-time SSE streaming for natural conversation flow
- **Tech Stack**: Uses Replit AI Integrations (OpenAI gpt-4o-mini) - no API key required

### ID Verification System
- **Purpose**: Prevents catfishing by comparing selfie to profile photos using AI vision
- **AI Comparison**: OpenAI Vision (gpt-4o-mini) analyzes facial features with confidence scoring (high/medium/low)
- **Verification Limits**: Max 5 attempts, 5MB image size limit (JPEG/PNG/GIF/WebP)
- **Error Handling**: Parse failures and API errors revert status from "pending" to "none" to prevent stuck states
- **Attempt Counting**: Only increments after completed verification attempts (success/reject/parse failure), not on transient errors
- **Verified Badge**: Displayed on profile cards and sidebar for verified users
- **UI**: Camera capture and file upload options on dedicated verification page

### Nearby Map Feature (Walkbye-style)
- **Purpose**: Discover singles in your area in real-time, showing general location for privacy
- **Tech Stack**: Leaflet with OpenStreetMap (free, no API key), react-leaflet v4.2.1 for React 18 compatibility
- **Go Live Toggle**: Users can broadcast their location to appear on map (auto-updates every 30 seconds)
- **Privacy**: Location fuzzing rounds coordinates to ~500m radius (neighborhood level, not exact pins)
- **Profile Popups**: Show profile photo, name, age, social links, and "Express Interest" CTA
- **Route**: /nearby in sidebar with Radio icon
- **Schema Fields**: isLive, latitude, longitude, locationUpdatedAt on profiles table

### Social Media Profile Linking
- **Purpose**: Additional verification and discovery through linked social accounts
- **Platforms**: Instagram, TikTok, Twitter (X), Snapchat
- **Storage**: socialLinks JSONB field on profiles table
- **Display**: Icons with links on profile cards and in Nearby map popups
- **Validation**: Optional fields in profile setup form

### Help & Support System
- **Purpose**: Users can submit issues, complaints, feature requests, and general feedback
- **Schema**: feedback table with userId, category enum (issue/complaint/feature_request/general), subject, message, status enum (pending/reviewed/resolved/closed), timestamps
- **API Endpoints**: POST /api/feedback (create), GET /api/feedback (list user's submissions)
- **Validation**: Zod schemas with min 5 chars subject, min 20 chars message, max 200 subject (shared between client/server via insertFeedbackSchema)
- **UI**: Tabbed interface with submission form and history view, located in sidebar settings section
- **Route**: /help in sidebar with HelpCircle icon

### Admin Dashboard
- **Purpose**: Platform administrators can view and manage all user feedback submissions
- **Access Control**: isAdmin boolean field on users table, isAdmin middleware protects all admin routes
- **Admin API Endpoints**: GET /api/admin/status (check admin status), GET /api/admin/feedback (list all feedback), PATCH /api/admin/feedback/:id/status (update status)
- **Features**: Stats cards (total/pending/reviewed/resolved/issues/features), table view with all submissions, status update controls via dropdown
- **UI**: Admin-only section in sidebar (Shield icon), access denied view for non-admins
- **Route**: /admin/feedback (visible only to admins in sidebar)

### Friends-of-Friends Network (Friendster-style)
- **Purpose**: Build trust by showing degrees of separation and mutual connections
- **Connections Table**: Tracks bidirectional relationships between users with unique constraint
- **Connection Creation**: Created when matches progress past gate 1 (active status) or skip ahead
- **Mutual Connections**: Displayed as badge on profile cards in Discover view (e.g., "3 mutual connections")
- **API Endpoints**: /api/connections, /api/connections/mutual/:userId, /api/connections/mutual-counts/:userIds
- **Duplicate Prevention**: Unique constraint + createConnectionIfNotExists with PostgreSQL error handling (code 23505)

### Date Planning System
- **Purpose**: Users can propose dates with activity details, locations, and payment preferences
- **Availability**: Available for completed matches (users who have passed all gates)
- **Schema**: date_plans table with matchId, proposerId, recipientId, activity, activityType, placeName, placeAddress, proposedDate, paymentPreference (ill_pay/you_pay/split), notes, preferences, blacklist, budgetFloor, budgetCeiling, status (proposed/accepted/declined/completed/cancelled)
- **Payment Preferences**: Informational only - "I'll pay", "You pay", or "Split the bill" options help coordinate expectations
- **Security**: recipientId derived server-side from match participants, preventing unauthorized targeting
- **API Endpoints**: POST /api/matches/:matchId/date-plans (create), GET /api/matches/:matchId/date-plans (list), PATCH /api/date-plans/:id/status (update status)
- **Validation**: Zod schemas for server-side validation of date plan creation and status updates
- **UI Components**: DatePlanDialog for proposing dates, DatePlanCard for displaying/responding to proposals
- **Authorization**: Only match participants can view/create date plans; only recipients can accept/decline proposals

### Date Preferences System
- **Purpose**: Users set preferred activities and budget constraints to guide date planning
- **Profile-Level Preferences**: Stored on profiles table (datePreferences, dateBlacklist, dateBudgetFloor, dateBudgetCeiling)
- **Per-Date Overrides**: Each date proposal can override profile defaults with custom preferences/blacklist/budget
- **UI Components**: DatePreferences card in Settings for profile-level settings
- **API Endpoints**: PATCH /api/profile/date-preferences (update), GET /api/users/:userId/date-preferences (fetch)
- **Requirement**: User must complete profile setup before setting date preferences (graceful fallback UI shown otherwise)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable

### Authentication
- **Replit Auth**: OIDC-based authentication (requires `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`)

### Payment Processing
- **Stripe**: Integrated for wallet funding, subscriptions ($9.99/month or $99/year), and gift purchases
- **stripe-replit-sync**: Automatic webhook management - no manual Stripe Dashboard configuration needed
- **Webhook Endpoint**: /api/stripe/webhook (registered BEFORE express.json() for raw Buffer access)
- **Stripe Schema**: Managed automatically by stripe-replit-sync in PostgreSQL `stripe` schema
- **Custom Logic**: WebhookHandlers.ts processes wallet deposits, subscription activation/cancellation, and gift purchases with gate advancement

### Cryptocurrency Payments (via Stripe)
- **Integration**: Stripe's native crypto support (stablecoins USDC/USDT) + optional Crypto.com partnership for BTC/ETH
- **Setup**: Enable crypto payments in Stripe Dashboard → Settings → Payment methods → Crypto
- **How It Works**: Users click "Add Funds" → Stripe Checkout shows crypto option automatically if enabled
- **Crypto.com Partnership**: For Bitcoin/Ethereum support, enable Crypto.com in Stripe Dashboard (400+ cryptocurrencies)
- **No Extra API Keys**: Uses existing Stripe integration, no separate crypto service needed
- **User Flow**: Add Funds → Stripe Checkout → Select Card or Crypto → Complete payment → Wallet credited via standard Stripe webhook

### Third-Party Integrations (Planned)
- **E-commerce Affiliates**: Etsy/Amazon for anonymous gift purchasing
- **Cash Transfers**: CashApp/Zelle integration for tips

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **wouter**: Client-side routing
- **react-hook-form + zod**: Form validation
- **lucide-react**: Icon library