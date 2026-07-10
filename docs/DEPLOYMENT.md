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

## 4. Migrations run automatically on every deploy

`npm run build` is `prisma generate && prisma migrate deploy && next build` —
Vercel runs this on every deploy, so any migration folder committed to
`prisma/migrations/` gets applied to whatever `DATABASE_URL` is configured
for that environment before the app builds. `migrate deploy` (unlike
`db push`) only ever applies pending migrations in order and no-ops if
everything's already applied — it's safe to run on every single deploy,
including ones with no schema changes.

This means: any future schema change just needs `npx prisma migrate dev
--name <description>` run locally against your dev DB (creates a new
migration folder + applies it locally) and the folder committed — the next
push to your production branch applies it automatically. No separate manual
step, no forgetting to run it against prod.

Seeding is still a manual, one-off step (never automatic — you don't want
fixture data or a default admin password reappearing on every deploy):

```bash
npm run db:seed   # optional — skip if you don't want fixture data in prod
```

For a real launch, don't run `db:seed` against production (it creates a
fixture catalog and a default admin password) — instead run your first real
Qikink sync (`npm run db:seed` only for categories, or trigger `/api/admin/sync-qikink`
from the admin UI once you're logged in as a real admin you created directly
in the DB).

> **Note:** if you're running these commands from an environment with
> restricted network egress (e.g. a sandboxed CI runner), make sure it can
> reach your database host directly on port 5432 — Neon (and most managed
> Postgres providers) only accept the native Postgres wire protocol, not
> plain HTTPS, so an HTTP-only proxy won't work here. Run these commands
> from your own machine or a normal CI runner instead.

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

## 8. Scheduled Qikink sync (Hobby-plan compatible)

Vercel's **Hobby plan caps cron triggers at once per day**, which is too
infrequent to keep stock/pricing fresh — so this project doesn't use Vercel
Cron at all. The sync endpoint (`/api/cron/sync-qikink`) still exists and is
still protected by `CRON_SECRET`; it's just triggered from **GitHub
Actions** instead, which schedules for free on any plan.

1. In your GitHub repo → Settings → Secrets and variables → Actions, add:
   - `SITE_URL` — e.g. `https://aneem.in`
   - `CRON_SECRET` — the same value you set in Vercel's env vars
2. That's it — `.github/workflows/qikink-sync.yml` runs hourly
   (`0 * * * *`) and can also be triggered manually from the Actions tab
   (`workflow_dispatch`).

If you'd rather not depend on GitHub Actions, any free external scheduler
works identically since the endpoint is just a plain authenticated GET —
e.g. [cron-job.org](https://cron-job.org) (no code, add a job that GETs
`https://aneem.in/api/cron/sync-qikink` with header
`Authorization: Bearer <CRON_SECRET>`).

For immediate, on-demand syncs you don't have to wait for any schedule —
use the **"Sync Now"** button in `/admin/products` or the Founder Portal's
`/founder/inventory` page.

## 9. Notifications (optional at launch)

- **Email**: create a Resend account, verify your sending domain, set
  `RESEND_API_KEY` and `EMAIL_FROM`.
- **WhatsApp**: create a Meta WhatsApp Business app, set
  `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`, and create the
  `order_confirmed`/`order_shipped`/`order_delivered` message templates
  referenced in `src/lib/notifications/whatsapp.ts`.

Both are safe to leave unset — the app logs instead of sending, so nothing
breaks while you set these up post-launch.

## 10. Founder Portal (founder.aneem.in)

The Founder Portal is a completely separate, subdomain-gated part of the
same deployment — it needs its own DNS record and its own one-time account
setup.

1. **DNS**: add another record pointing `founder.aneem.in` at Vercel —
   same process as the main domain (Vercel → Settings → Domains → add
   `founder.aneem.in`, then add the CNAME it gives you at your registrar).
   No separate Vercel project needed; one deployment serves both hosts.
2. **Env vars** — set on the **Production** environment in Vercel Project
   Settings → Environment Variables (and Preview too, if you test there):
   ```
   FOUNDER_PORTAL_HOST=founder.aneem.in
   FOUNDER_NEXTAUTH_SECRET=$(openssl rand -base64 32)   # different value from NEXTAUTH_SECRET
   ```
   `FOUNDER_PORTAL_HOST` is what `src/middleware.ts` compares the incoming
   request's hostname against to decide whether to serve `src/app/founder`.
   **It must be the bare hostname only — `founder.aneem.in`, not
   `https://founder.aneem.in`.** The middleware normalizes away an
   accidental scheme/trailing-slash defensively, but there's no reason to
   rely on that. If it's missing (or was pointed at the wrong value before
   that normalization existed) in an environment, that environment's
   requests to `founder.aneem.in` silently fall through to the ordinary
   storefront routing instead of the portal — there's no error, it just
   serves the wrong app. After setting/changing it, redeploy (env var
   changes don't apply to an already-built deployment).
3. **Create your founder account** (no public registration route exists by
   design). From your local machine, pointed at the production
   `DATABASE_URL`:
   ```bash
   FOUNDER_NAME="Your Name" FOUNDER_EMAIL="you@aneem.in" FOUNDER_PASSWORD="a-strong-password-12+chars" \
     npm run db:seed-founder
   ```
   This is a one-time script — rerun it any time to reset the password (it
   upserts by email).
4. **Log in** at `https://founder.aneem.in/founder/login`, then immediately
   go to Security → Enable 2FA.
5. **Verify isolation**: `https://aneem.in/founder/login` and
   `https://founder.aneem.in/` (storefront paths) should both return a
   plain 404 — that's `src/middleware.ts` enforcing the host boundary. If
   either resolves instead of 404ing, double-check `FOUNDER_PORTAL_HOST`
   matches the DNS record exactly (including no trailing slash).
6. **Cost data**: profit figures read from Cost Settings
   (`/founder/profit/cost-settings`) — nothing there is guessed, so set
   your real product/printing/shipping/packaging costs and GST rate before
   trusting the Profit dashboard's numbers.
7. **AI features** (Copilot chat, Daily CEO Report, marketing content
   generator): set `ANTHROPIC_API_KEY`. Without it, these fall back to
   deterministic templates built from the same live data — still useful,
   just not AI-generated.
8. **AI Marketing Studio** (`/founder/marketing-studio`) — the product
   content/creative engine (captions, hashtags, carousels, stories,
   descriptions, ad/WhatsApp/email copy, reel briefs, offers, bundle
   creative, thumbnails, image enhancement):
   - `ANTHROPIC_API_KEY` (same key as above) drives every text and vision
     generator. Unset it and the Studio still fully works, just with
     realistic mock output instead of real AI copy.
   - `BLOB_READ_WRITE_TOKEN` (Vercel → Storage → create a Blob store →
     copy the token) is required for the product photo uploader — there's
     no mock fallback for file storage itself.
   - `VIDEO_RENDER_API_KEY` / `VIDEO_RENDER_API_BASE_URL` are optional —
     point them at a hosted video-assembly API (Creatomate, Shotstack,
     JSON2Video). Without them, the Reel Generator still produces a full
     real shot-by-shot creative brief via Claude; it just won't render an
     actual MP4 (Vercel serverless can't run FFmpeg or hold render state).
   - `IMAGE_API_KEY` / `IMAGE_API_BASE_URL` are optional — point them at a
     hosted image generation/enhancement API. Without them, enhancement
     operations are recorded but return the original source image
     (`isMock: true`) instead of a new render.

## Post-deploy checklist

- [ ] Place a real test order (COD) end-to-end
- [ ] Confirm the order appears in `/admin` and in the Founder Portal dashboard
- [ ] Confirm it appears in your Qikink dashboard (once `QIKINK_USE_MOCK=false`)
- [ ] Send a test Razorpay payment in test mode before flipping to live keys
- [ ] Verify `/sitemap.xml` and `/robots.txt` resolve
- [ ] Run Lighthouse against the deployed URL
- [ ] Log into `founder.aneem.in`, enable 2FA, verify host isolation (step 5 above)
- [ ] Set real Cost Settings so the Profit dashboard isn't showing placeholder numbers
