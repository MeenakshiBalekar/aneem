# Qikink Integration

Qikink is the **system of record** for the catalog. Aneem never accepts
manual product uploads — every product, variant, size, price, and stock
level originates in Qikink and flows into Postgres via the code below.

## Data flow

```
Qikink API  ──(full sync, hourly cron + on-demand admin button)──▶  Postgres
Qikink webhook ──(product/inventory/fulfillment events, real-time)──▶ Postgres
Aneem checkout ──(order push on payment confirmation)──▶ Qikink API
```

## Files

| File | Responsibility |
|---|---|
| `src/lib/qikink/types.ts` | TypeScript shapes mirroring Qikink's API contracts |
| `src/lib/qikink/client.ts` | Auth + typed HTTP client; serves mock fixtures when `QIKINK_USE_MOCK` |
| `src/lib/qikink/mock-data.ts` | Fixture catalog covering every product category |
| `src/lib/qikink/sync.ts` | Upserts Qikink data into Prisma; webhook signature verification |
| `src/lib/qikink/orders.ts` | Pushes a confirmed Aneem order to Qikink for fulfillment |
| `src/app/api/cron/sync-qikink/route.ts` | Scheduled full catalog sync (Vercel Cron) |
| `src/app/api/admin/sync-qikink/route.ts` | Admin-triggered "Sync Now" |
| `src/app/api/webhooks/qikink/route.ts` | Real-time product/inventory/fulfillment events |

## What syncs automatically

- **Products**: created/updated by `upsertProductFromQikink`, keyed on
  `qikinkProductId`. A product's category is auto-created if Qikink returns
  a category name we haven't seen (`ensureCategory`).
- **Variants (size/color)**: keyed on `qikinkVariantId`, 1:1 with a Qikink SKU.
- **Pricing**: `basePrice`/`compareAtPrice` at the product level, `price`/
  `compareAtPrice` per variant.
- **Stock/availability**: `ProductVariant.stock` and `isOutOfStock`; a
  product is marked `isActive: false` automatically when total stock is 0.
- **Images**: replaced on every sync from Qikink's `images[]`, primary image
  sorted first.
- **Fulfillment/tracking**: `order.fulfillment_updated` webhook events update
  `Order.status`, `trackingNumber`, `trackingUrl`, `courierName`, and trigger
  WhatsApp/email notifications (`src/lib/orders/order-events.ts`).

## Enabling live Qikink

1. Set `QIKINK_CLIENT_ID` / `QIKINK_CLIENT_SECRET` from your Qikink dashboard.
2. Set `QIKINK_USE_MOCK=false`.
3. Set `QIKINK_API_BASE_URL` to Qikink's production API base (sandbox by default).
4. Set `QIKINK_WEBHOOK_SECRET` and configure the same value + webhook URL
   (`/api/webhooks/qikink`) in Qikink's dashboard.

No other code changes are needed — `qikinkClient` transparently switches
from fixtures to live HTTP calls based on these env vars.

## Adapting to Qikink's actual field names

The shapes in `types.ts` are written to match Qikink's documented API
surface as closely as possible, but Qikink's exact JSON field names should
be confirmed against your account's API docs before going live. If a field
name differs, the only files that need updating are `types.ts` (the shape)
and the corresponding mapper in `sync.ts`/`orders.ts` — the rest of the
app consumes our own normalized Prisma models and is unaffected.
