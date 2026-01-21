# PayGate Dating

## Overview

PayGate Dating is a premium online dating platform that uses a 5-gate progression system to create meaningful connections. Users pay incremental fees ($5-$20) at each interaction stage, alternating between initiator and recipient. This financial investment model filters out low-effort interactions and spam, targeting serious relationship seekers aged 25-45 in urban areas.

The platform generates revenue through premium subscriptions ($9.99/month or $99/year), gate transaction fees (10-20% cut), and affiliate integrations for anonymous gift sending.

## User Preferences

Preferred communication style: Simple, everyday language.

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

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable

### Authentication
- **Replit Auth**: OIDC-based authentication (requires `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`)

### Payment Processing (Planned)
- **Stripe**: Referenced in design docs for escrow payments and wallet funding

### Third-Party Integrations (Planned)
- **E-commerce Affiliates**: Etsy/Amazon for anonymous gift purchasing
- **Cash Transfers**: CashApp/Zelle integration for tips

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **wouter**: Client-side routing
- **react-hook-form + zod**: Form validation
- **lucide-react**: Icon library