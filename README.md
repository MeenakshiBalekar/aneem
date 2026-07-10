# Aneem — Premium Oversized Streetwear Platform

A production-ready, Shopify-equivalent ecommerce platform for **Aneem**, built to run with minimal manual effort: products, variants, sizes, pricing, and inventory sync automatically from **Qikink**; payments run through **Razorpay** (UPI/cards/netbanking/wallets/COD); orders push to Qikink for fulfillment automatically; customers get WhatsApp + email updates automatically.

## Stack

- **Next.js 14** (App Router, Server Components, Route Handlers)
- **TypeScript**, **Tailwind CSS**
- **PostgreSQL** via **Prisma ORM**
- **NextAuth** (credentials auth, JWT sessions)
- **Zustand** (cart state) + **TanStack Query**
- **Qikink** (catalog/inventory/fulfillment system of record)
- **Razorpay** (payments)

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL at minimum
npx prisma db push           # create schema in your Postgres DB
npm run db:seed              # load Qikink fixture catalog, bundles, discounts, admin user
npm run dev
```

Visit `http://localhost:3000`. Admin dashboard: `http://localhost:3000/admin`
(seeded login: `admin@aneem.in` / `Admin@12345` — **change this immediately** if you deploy the seed to anything real).

Without real Qikink/Razorpay credentials, the app still runs completely end-to-end:
Qikink calls are served from `src/lib/qikink/mock-data.ts` fixtures, and checkout
falls back to Cash on Delivery when Razorpay isn't configured. Drop in real API
keys later via environment variables — no code changes required.

### Founder Portal

A second, completely separate application lives alongside the storefront —
see [Founder Portal](#founder-portal-1) below. To try it locally:

```bash
FOUNDER_EMAIL="you@aneem.in" FOUNDER_PASSWORD="a-strong-password-12+chars" npm run db:seed-founder
```

Then visit `http://founder.localhost:3000/founder/login` (modern browsers
resolve `*.localhost` to `127.0.0.1` automatically — no `/etc/hosts` edit
needed). `http://localhost:3000/founder/login` (the storefront host) will
correctly 404 — that's the host-isolation working as intended.

## Why It's Architected This Way

**Qikink is the system of record for the catalog.** Products are never
hand-entered in Aneem. `src/lib/qikink/sync.ts` upserts Qikink's product/variant/
stock data into our own Postgres tables so storefront reads stay fast (no
per-request API calls to Qikink), while `src/app/api/webhooks/qikink/route.ts`
and the hourly cron (`src/app/api/cron/sync-qikink/route.ts`) keep it fresh.
New Qikink categories get auto-created (`ensureCategory` in `sync.ts`), so a
brand-new product type shows up without a code change.

**Money is always re-derived server-side.** The cart lives client-side
(Zustand + localStorage) for instant guest browsing, but `POST
/api/checkout/create-order` re-prices every line from the database and
re-runs the discount engine — a manipulated client cart payload cannot change
what gets charged.

**Bundles are just automatic discounts, not a separate purchase path.**
`evaluateDiscounts()` in `src/lib/discounts/engine.ts` detects when a cart
already contains everything a `Bundle` requires and applies its discount —
so "buy the 3 items separately" and "click Add Bundle to Bag" both end up
priced identically and correctly, with a single source of truth.

**Order status transitions drive automation.** Razorpay webhook → order
marked `PAID` → pushed to Qikink → Qikink fulfillment webhook → tracking
synced → WhatsApp/email sent → marked `DELIVERED`. See
`src/lib/orders/order-events.ts` and `src/app/api/webhooks/*`.

## Project Structure

```
prisma/
  schema.prisma          # full domain model (see below)
  seed.ts                 # fixture catalog, bundles, discounts, admin user
src/
  app/
    (storefront)/         # header/footer/cart-drawer layout group
      page.tsx             # homepage
      collections/[slug]/  # category + "all" listing
      products/[slug]/     # PDP
      bundles/, bundles/[slug]/
      cart/, checkout/, checkout/success/
      account/             # dashboard, orders, wishlist, addresses
      style-assistant/     # AI Style Assistant
      login/, register/
    admin/                 # role-gated admin dashboard
    api/
      checkout/            # create-order, verify (Razorpay)
      webhooks/             # qikink, razorpay (signature-verified)
      cron/sync-qikink/     # scheduled full catalog sync
      admin/sync-qikink/    # admin "Sync Now" button
      auth/, cart/, wishlist/, reviews/, discounts/, ai/
    sitemap.ts, robots.ts
  components/               # ui/, layout/, home/, product/, cart/, checkout/, account/, admin/
  lib/
    qikink/                 # client.ts, sync.ts, orders.ts, mock-data.ts, types.ts
    razorpay/                # client.ts (order create, signature verify)
    discounts/engine.ts       # configurable discount + bundle-detection engine
    bundles/engine.ts
    notifications/            # whatsapp.ts, email.ts (no-op until keys set)
    ai/style-assistant.ts
    orders/order-events.ts    # WhatsApp/email dispatch on status change
    data/                     # server-only Prisma query modules
  store/cart-store.ts        # Zustand cart (localStorage-persisted)
  middleware.ts               # per-IP rate limiting on auth/checkout/reviews
```

## Database Schema (high level)

- **Catalog**: `Category` (self-referential tree), `Product`, `ProductImage`,
  `ProductVariant` (size × color, 1:1 with Qikink SKU), `ProductRelation`
  (cross-sell/upsell/FBT/complete-the-outfit)
- **Bundles**: `Bundle`, `BundleItem`
- **Discounts**: `DiscountRule` (quantity breaks, coupons, free-shipping
  threshold, limited-time — all admin-configurable, no deploy needed)
- **Customers**: `User`, `Account`/`Session`/`VerificationToken` (NextAuth),
  `Address`, `WishlistItem`, `Review`
- **Cart/Orders**: `Cart`, `CartItem`, `Order`, `OrderItem`
- **Observability**: `SyncLog` (every Qikink sync attempt, success/fail counts)

Run `npx prisma studio` to browse the schema visually once seeded.

## Integrations

### Qikink

See `docs/QIKINK_INTEGRATION.md`. Summary: set `QIKINK_CLIENT_ID`,
`QIKINK_CLIENT_SECRET`, `QIKINK_WEBHOOK_SECRET`, and `QIKINK_USE_MOCK=false`
in production. Point Qikink's webhook settings at
`https://yourdomain.com/api/webhooks/qikink`.

### Razorpay

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`,
and `RAZORPAY_WEBHOOK_SECRET`. Point Razorpay's webhook settings at
`https://yourdomain.com/api/webhooks/razorpay` (subscribe to
`payment.captured` and `payment.failed`).

### WhatsApp / Email

`src/lib/notifications/whatsapp.ts` (Meta WhatsApp Cloud API) and
`src/lib/notifications/email.ts` (Resend) both log to the console instead of
sending when credentials are unset — safe to leave blank until you're ready.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` / `npm start` | Production build/serve |
| `npm run lint` | ESLint |
| `npm run db:push` | Push Prisma schema to DB (no migration history — good for dev) |
| `npm run db:migrate` | Create a tracked migration (use for production) |
| `npm run db:seed` | Load fixture catalog/bundles/discounts/admin user |
| `npm run db:seed-founder` | Create/reset the Founder Portal login (`FOUNDER_EMAIL`/`FOUNDER_PASSWORD` env vars) |
| `npm run db:studio` | Prisma Studio (visual DB browser) |

## Deployment

See `docs/DEPLOYMENT.md` for the full Vercel + Postgres walkthrough,
including cron setup (`vercel.json`) and webhook configuration.

## Security

- All mutating API routes validate input with Zod.
- Qikink and Razorpay webhooks verify HMAC signatures before processing.
- Checkout/auth/review routes are rate-limited per IP (`src/middleware.ts`).
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) set in `next.config.mjs`.
- Passwords hashed with bcrypt; sessions are JWT-based via NextAuth.
- `/admin` is gated by `session.user.role === "ADMIN"` at the layout level.

## Founder Portal

A private, subdomain-gated operations console — separate from both the
storefront and the `/admin` catalog admin. Built for one person to run the
whole business from: confirming COD orders by phone, seeing real profit
(not just revenue), and getting AI-assisted daily priorities.

**Isolation model** (`src/middleware.ts`): the portal is served only on
`FOUNDER_PORTAL_HOST` (default `founder.localhost:3000` in dev,
`founder.aneem.in` in prod). Any request to a `/founder*` or
`/api/founder*` path on a different host gets a plain 404 — not a login
redirect, nothing that confirms the route exists. Conversely, the founder
host serves *only* founder routes; a request for `/` or `/checkout` on
`founder.aneem.in` also 404s.

**Auth** (`src/lib/founder/auth.ts`): a second, fully independent NextAuth
instance — its own `FounderUser` table (not `User`), its own JWT secret
(`FOUNDER_NEXTAUTH_SECRET`), its own session cookie name. A breach of
customer accounts has zero bearing on founder access, and vice versa.
Passwords are bcrypt-hashed; optional TOTP 2FA (`otplib`) can be enabled
from Security settings; every login attempt (success or failure) is logged
to `FounderLoginAttempt`, and every meaningful mutation is logged to
`FounderAuditLog` (`src/lib/founder/audit.ts`). Mutating API routes are
protected by a double-submit-cookie CSRF check (`src/lib/founder/csrf.ts`)
and per-IP rate limiting (login capped tighter than anything else in the app).

**Pages** (`src/app/founder/(portal)/`):
- **Dashboard** — revenue/orders/profit across every period the brief asked
  for, ecommerce KPIs (AOV, ROAS, CAC, LTV, repeat %, cart abandonment,
  checkout completion), clickable order-health tiles.
- **Calling Queue** — today's orders with full contact info, an editable
  contact-status dropdown and notes field that autosave on every change
  (`src/components/founder/calling-queue-card.tsx`), one-click call/email/
  WhatsApp/copy actions, and an automatic Follow-up Queue for anyone marked
  No Response or Requested Callback.
- **Orders** — filterable/searchable order management with CSV, Excel
  (`xlsx`), and print-to-PDF export.
- **Profit** — the Monthly Profit Statement (revenue minus product/printing/
  shipping/packaging/gateway/advertising/refunds/returns/misc, matching the
  exact structure requested), product/bundle/customer profit breakdowns.
  All cost inputs are editable at `/founder/profit/cost-settings` — nothing
  is a guess.
- **Marketing** — GA4/Meta/Search Console/Clarity-shaped traffic dashboard.
  Runs on clearly-labeled deterministic mock data until real API
  credentials are set (`src/lib/integrations/marketing.ts`), same
  mock-then-real pattern as Qikink. "Most Engaged Products" is real data
  (order + wishlist activity), not mocked.
- **Inventory** — stock levels, sync health, fulfillment-status breakdown.
- **AI Copilot** — a chat that answers questions using a live snapshot of
  your own business data (`src/lib/founder/ai-context.ts` +
  `src/lib/founder/copilot.ts`), a Daily CEO Report, rule-based Product
  Health Scores (every input to the score is shown, not a black box), and
  an AI marketing-content generator (captions/ad copy/email/WhatsApp).
  All AI features need `ANTHROPIC_API_KEY`; without it they fall back to
  deterministic, data-backed summaries rather than failing.
- **Daily Action Center** (`src/lib/founder/action-center.ts`) — a
  rule-based (not AI) priority banner shown on every founder page: pending
  callbacks, unconfirmed COD orders, Qikink sync health, out-of-stock
  alerts. Deliberately deterministic — "what needs my attention" should
  never be a hallucination risk.

**Setup**: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#10-founder-portal-founderaneemin)
for the full DNS + env var walkthrough.

## Future Integrations

See `docs/FUTURE_INTEGRATIONS.md` — GA4, Meta Pixel/CAPI, Google Merchant
Center, Facebook/Instagram Shop, Shiprocket, chatbot/AI support, CRM. The
architecture (typed integration clients under `src/lib/`, webhook routes
under `src/app/api/webhooks/`) is designed so each of these slots in without
touching the storefront or checkout code.
