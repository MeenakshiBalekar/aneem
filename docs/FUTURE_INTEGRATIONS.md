# Future Integrations

The architecture keeps third-party integrations isolated under `src/lib/`
and `src/app/api/webhooks/`, so none of these require touching storefront,
cart, or checkout code.

## Analytics & Ads

- **Google Analytics 4**: add `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (already in
  `.env.example`), load `gtag.js` in `src/app/layout.tsx` behind a
  client component, fire `purchase`/`add_to_cart` events from
  `src/store/cart-store.ts` actions and `checkout/success/page.tsx`.
- **Meta Pixel + Conversions API**: `NEXT_PUBLIC_META_PIXEL_ID` (client
  pixel) + `META_CONVERSIONS_API_TOKEN` (server-side, dedupe via `event_id`).
  Send server-side events from the same order-status transition points
  `order-events.ts` already hooks into.

## Marketplaces

- **Google Merchant Center**: generate a product feed from
  `src/lib/data/catalog.ts` queries (XML/RSS or Content API), scheduled
  alongside the Qikink sync cron.
- **Facebook/Instagram Shop**: same feed can power the Meta Commerce Catalog.

## Fulfillment alternative

- **Shiprocket**: if you outgrow Qikink's built-in fulfillment or want a
  secondary courier, add `src/lib/shiprocket/` mirroring the Qikink client
  pattern (`client.ts`, `types.ts`), and branch the push logic in
  `src/lib/qikink/orders.ts` → a new `src/lib/fulfillment/router.ts`.

## Marketing automation

- **Email marketing** (Klaviyo/Resend broadcasts): the `NewsletterForm`
  component already collects emails — wire its `onSubmit` in
  `src/components/home/newsletter.tsx` to your ESP's API instead of the
  stubbed `setTimeout`.
- **WhatsApp automation** beyond order updates (abandoned cart, back-in-stock):
  extend `src/lib/notifications/whatsapp.ts` with new template senders,
  trigger from a cron job querying `Cart`/`CartItem` for stale carts.

## Support

- **AI customer support / chatbot**: `src/lib/ai/style-assistant.ts` already
  shows the pattern for an optional Claude-backed feature with a
  deterministic fallback — a support chatbot would follow the same shape,
  likely as a new `src/app/api/ai/support-chat/route.ts`.
- **CRM**: sync `User`/`Order` on webhook or cron to your CRM's API; the
  `SyncLog` model can be reused to track these jobs too.
