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

## Future Integrations

See `docs/FUTURE_INTEGRATIONS.md` — GA4, Meta Pixel/CAPI, Google Merchant
Center, Facebook/Instagram Shop, Shiprocket, chatbot/AI support, CRM. The
architecture (typed integration clients under `src/lib/`, webhook routes
under `src/app/api/webhooks/`) is designed so each of these slots in without
touching the storefront or checkout code.
