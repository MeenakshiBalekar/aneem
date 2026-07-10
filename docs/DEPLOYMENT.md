# Deployment Guide (Vercel + Postgres)

## 1. Provision Postgres

Pick one (all work unchanged — only `DATABASE_URL` differs):

- **Neon** (recommended — generous free tier, branching for staging)
- **Supabase**
- **Vercel Postgres**
- **Railway**

Copy the connection string. It should look like:
`postgresql://user:password@host:5432/dbname?sslmode=require`

## 2. Create the Vercel project

```bash
npm i -g vercel
vercel link
```

Or connect the GitHub repo directly from the Vercel dashboard.

## 3. Environment variables

In Vercel Project Settings → Environment Variables, add everything from
`.env.example`. Minimum to launch in COD-only mode with mock Qikink data:

```
DATABASE_URL=...
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
QIKINK_USE_MOCK=true
```

Add Razorpay and Qikink credentials when ready (see below) — no code changes,
just flip `QIKINK_USE_MOCK=false` and add the Qikink/Razorpay keys.

## 4. Run migrations + seed against production DB

From your local machine (or a one-off Vercel deploy hook), pointed at the
production `DATABASE_URL`:

```bash
npx prisma migrate deploy   # first time: npx prisma migrate dev --name init, then commit the migration
npm run db:seed             # optional — skip if you don't want fixture data in prod
```

For a real launch, don't run `db:seed` against production (it creates a
fixture catalog and a default admin password) — instead run your first real
Qikink sync (`npm run db:seed` only for categories, or trigger `/api/admin/sync-qikink`
from the admin UI once you're logged in as a real admin you created directly
in the DB).

## 5. Deploy

```bash
vercel --prod
```

## 6. Configure Qikink

1. In your Qikink dashboard, generate API credentials (Client ID/Secret).
2. Set `QIKINK_CLIENT_ID`, `QIKINK_CLIENT_SECRET`, `QIKINK_API_BASE_URL`
   (production API base, not sandbox), `QIKINK_USE_MOCK=false`.
3. Set `QIKINK_WEBHOOK_SECRET` to a random string, configure the same value
   in Qikink's webhook settings.
4. Point Qikink's webhook URL at `https://yourdomain.com/api/webhooks/qikink`.
5. Trigger a first sync from `/admin` → "Sync Now", or wait for the hourly
   cron (`vercel.json`).

## 7. Configure Razorpay

1. Get live API keys from the Razorpay dashboard.
2. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
3. In Razorpay → Webhooks, add `https://yourdomain.com/api/webhooks/razorpay`,
   subscribe to `payment.captured` and `payment.failed`, and set the webhook
   secret as `RAZORPAY_WEBHOOK_SECRET`.

## 8. Cron jobs

`vercel.json` already defines an hourly Qikink sync. Vercel automatically
authenticates cron requests with `Authorization: Bearer $CRON_SECRET` when
`CRON_SECRET` is set as an environment variable — no extra config needed.

## 9. Notifications (optional at launch)

- **Email**: create a Resend account, verify your sending domain, set
  `RESEND_API_KEY` and `EMAIL_FROM`.
- **WhatsApp**: create a Meta WhatsApp Business app, set
  `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`, and create the
  `order_confirmed`/`order_shipped`/`order_delivered` message templates
  referenced in `src/lib/notifications/whatsapp.ts`.

Both are safe to leave unset — the app logs instead of sending, so nothing
breaks while you set these up post-launch.

## Post-deploy checklist

- [ ] Place a real test order (COD) end-to-end
- [ ] Confirm the order appears in `/admin`
- [ ] Confirm it appears in your Qikink dashboard (once `QIKINK_USE_MOCK=false`)
- [ ] Send a test Razorpay payment in test mode before flipping to live keys
- [ ] Verify `/sitemap.xml` and `/robots.txt` resolve
- [ ] Run Lighthouse against the deployed URL
