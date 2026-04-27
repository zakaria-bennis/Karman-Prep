# Cloudflare deployment — Karman Prep

End-to-end checklist for getting karmanprep.com live on Cloudflare
Pages with R2-backed storage. Database stays on Supabase.

> **Architecture summary:** Hosting on Cloudflare Workers (via the
> OpenNext for Cloudflare adapter — `@opennextjs/cloudflare`).
> Question images on Cloudflare R2. Database, auth, realtime,
> Stripe, email, Cal.com all unchanged. Karman Prep's domain
> (karmanprep.com) is already in your CF account from the registrar.

The code-side work is done in commit `<TBD>`. The remaining work
is account configuration in Cloudflare and updating external
service URLs once the site is live.

---

## Phase 1 — Code prep (DONE)

These changes are already in the repo:

- `@opennextjs/cloudflare` and `@aws-sdk/client-s3` added to dependencies
- `next.config.mjs` configured for the CF runtime (unoptimized images,
  remote image patterns whitelisted for R2 + supabase.co legacy)
- `wrangler.toml` created with the cron trigger (`0 6 * * *` UTC),
  R2 binding, and asset directory
- `package.json` gained `cf:build`, `cf:preview`, `cf:deploy` scripts
- `vercel.json` removed (cron moved to `wrangler.toml`)
- Stripe client + webhook handler swapped to fetch HTTP client +
  `constructEventAsync` for edge-runtime compatibility
- `src/lib/storage/r2.ts` — new R2 upload helper using S3-compatible API
- `src/lib/supabase/queries/quiz.ts` — `uploadQuestionImage` /
  `removeQuestionImage` now route through R2; legacy Supabase Storage
  paths still work for existing rows (provider auto-detected by key prefix)

---

## Phase 2 — Cloudflare account setup (you, ~20 min)

### 2a. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

`wrangler login` opens a browser tab — sign in to your CF account
and authorize the CLI. One-time setup.

### 2b. Create the R2 bucket

```bash
wrangler r2 bucket create karmanprep-question-images
wrangler r2 bucket create karmanprep-question-images-preview
```

The preview bucket is used during local dev; can be empty.

### 2c. Generate an R2 API token

This is needed because parts of the code (one-off scripts, local dev,
non-Worker contexts) talk to R2 over the S3 API instead of the binding.

In the Cloudflare dashboard:

1. **R2** → **Manage R2 API Tokens** → **Create API token**
2. Permissions: **Object Read & Write**
3. Specify bucket: `karmanprep-question-images` (and the preview one)
4. TTL: forever (or rotate periodically)
5. Save the **Access Key ID** and **Secret Access Key** somewhere safe — Cloudflare only shows them once

### 2d. (Optional) Custom public URL for R2

By default R2 buckets get a `pub-XXXXXXXX.r2.dev` domain that's
publicly accessible. Fine for now. If you want
`images.karmanprep.com` instead:

1. **R2** → bucket → **Settings** → **Public access** → **Connect Domain**
2. Enter `images.karmanprep.com`
3. CF auto-creates the DNS record (since the domain is already in CF)

### 2e. Add to `.env.local`

```bash
# Cloudflare R2 (image storage)
R2_ACCOUNT_ID=<your-cf-account-id-from-the-r2-dashboard-url>
R2_ACCESS_KEY_ID=<from-step-2c>
R2_SECRET_ACCESS_KEY=<from-step-2c>
R2_BUCKET_NAME=karmanprep-question-images
R2_PUBLIC_URL=https://pub-XXXXXXXX.r2.dev
# OR if you set up a custom domain in step 2d:
# R2_PUBLIC_URL=https://images.karmanprep.com
```

Save these — you'll paste them into the Pages dashboard in Phase 4.

---

## Phase 3 — Migrate the existing page-75 image (~5 min, runs once)

The page-75 parabola is currently in Supabase Storage. After
`.env.local` has the R2 vars set, run the migration script:

```bash
node --env-file=.env.local scripts/migrate-images-to-r2.mjs
```

(Script lives at `scripts/migrate-images-to-r2.mjs` — created in
this commit.) It fetches the image from Supabase Storage, uploads to
R2, patches the row's `image_url` to the new URL, and deletes the
Supabase copy. Idempotent — safe to re-run.

---

## Phase 4 — Deploy to Cloudflare Pages (you, ~20 min)

### 4a. First deploy via CLI

```bash
npm run cf:build      # compiles Next.js to .open-next/
npm run cf:preview    # local smoke test of the built worker
npm run cf:deploy     # uploads to CF — first deploy creates the project
```

The first `cf:deploy` will prompt you to name the project — use
`karmanprep`. CF assigns a `karmanprep.<your-account>.workers.dev`
URL immediately. Test it before pointing the real domain at it.

### 4b. Set production env vars in CF dashboard

In the CF dashboard: **Workers & Pages** → `karmanprep` → **Settings**
→ **Variables and Secrets**. Add every key from your `.env.local` as
production vars. The full list (mark each as a **Secret** unless
prefixed with `NEXT_PUBLIC_`):

```
NEXT_PUBLIC_APP_URL=https://karmanprep.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...               (secret)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...                        (secret)
STRIPE_SECRET_KEY=...                       (secret)
STRIPE_WEBHOOK_SECRET=...                   (secret)
STRIPE_PRICE_GROUP_MONTHLY=price_...
STRIPE_PRICE_SMALL_GROUP=price_...
STRIPE_PRICE_PRIVATE=price_...
STRIPE_PRICE_ELITE_MONTHLY=price_...
RESEND_API_KEY=...                          (secret)
RESEND_FROM_EMAIL=hello@karmanprep.com
CAL_API_KEY=...                             (secret)
CAL_WEBHOOK_SECRET=...                      (secret)
SLACK_BOT_TOKEN=...                         (secret)
SLACK_SIGNING_SECRET=...                    (secret)
OPENAI_API_KEY=...                          (secret)
GEMINI_API_KEY=...                          (secret)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...                        (secret)
R2_SECRET_ACCESS_KEY=...                    (secret)
R2_BUCKET_NAME=karmanprep-question-images
R2_PUBLIC_URL=https://...
```

Then redeploy: `npm run cf:deploy`

### 4c. Add the karmanprep.com domain

In the CF dashboard: **Workers & Pages** → `karmanprep` → **Settings**
→ **Domains** → **Add custom domain**. Enter `karmanprep.com` AND
`www.karmanprep.com`.

Since the domain is already in your CF account, the DNS records
auto-create. SSL issues within ~5 minutes. Test
https://karmanprep.com — should serve the live site.

### 4d. Set primary domain + redirect

In CF Pages settings, mark `karmanprep.com` as the primary. The
`www.karmanprep.com` will auto-redirect to it (or vice versa,
your call).

---

## Phase 5 — Update external services (you, ~30 min)

Each of these has a webhook URL or callback URL pointing somewhere
old. Update them now that production is live:

### Stripe

1. Stripe dashboard → **Developers** → **Webhooks** → your endpoint
2. Update URL to `https://karmanprep.com/api/stripe/webhook`
3. Click **Reveal signing secret** — copy the new value
4. Update `STRIPE_WEBHOOK_SECRET` in CF Pages env vars
5. Redeploy: `npm run cf:deploy`

### Resend (sending emails as @karmanprep.com)

1. Resend dashboard → **Domains** → **Add domain** → `karmanprep.com`
2. Resend gives you 3 DNS records (DKIM, SPF, optionally DMARC)
3. Add them to Cloudflare DNS (Cloudflare → karmanprep.com → DNS)
4. Wait for Resend to verify (usually <5 min)
5. Test: send yourself a welcome email from your local dev server

Without these DNS records, emails will land in spam.

### Clerk

1. Clerk dashboard → your app → **Domains** → add `karmanprep.com`
2. Update **Allowed origins** to include `https://karmanprep.com`
3. Production keys vs dev keys — Clerk has separate prod credentials.
   Generate them and update `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` +
   `CLERK_SECRET_KEY` in CF env vars to the production pair.

### Cal.com

If you've registered a webhook for booking events, update its URL to
`https://karmanprep.com/api/webhooks/cal`.

### Slack (chat moderation + cohort channels)

If your Slack app's OAuth redirect or event subscriptions point at a
dev URL, update them to `https://karmanprep.com/...`.

### Stripe Checkout success/cancel URLs

Already use `process.env.NEXT_PUBLIC_APP_URL` — no manual update needed.

---

## Phase 6 — Smoke test the live site (you, ~15 min)

Walk through these flows on https://karmanprep.com:

- [ ] Landing page renders, no console errors
- [ ] Sign up flow → Clerk modal opens → email verification works
- [ ] Diagnostic loads, math questions render with KaTeX, answers submit
- [ ] Stripe Checkout → use a test card `4242 4242 4242 4242` →
      webhook fires (check `subscriptions` table in Supabase)
- [ ] Welcome email arrives (check Resend logs)
- [ ] Admin: `/admin/questions/import` → upload a tiny test CSV → row
      lands in DB
- [ ] Admin: `/admin/questions/review` → page-75 parabola row shows
      its image (from R2 now)
- [ ] Admin: upload a new question image via per-node curriculum page →
      check the URL points at R2 (not supabase.co)

If any of these fail, the most common causes are:

- Missing env var in CF Pages → check **Settings** → **Variables**
- Stripe webhook signing secret wrong → re-copy from Stripe dashboard
- R2 bucket public access disabled → check **R2** → bucket → **Settings**
- Resend domain not verified → check **Resend** → **Domains**

---

## Troubleshooting

**Build fails with "Module not found: nodejs_compat":** verify
`compatibility_flags = ["nodejs_compat"]` is set in `wrangler.toml`.

**Server actions return 500:** likely a Node API used at runtime that
isn't available on the edge. Common culprits: `fs`, `crypto.createHash`
(use Web Crypto), `child_process`, `node:net`. Check CF logs in the
dashboard for the specific error.

**Stripe webhook returns 400 "invalid signature":** make sure
`STRIPE_WEBHOOK_SECRET` in CF env vars matches the secret shown
in the Stripe webhook endpoint (regenerate if unsure).

**Images don't load on the live site:** check the `image_url` value
in the database — should start with the R2 public URL. If it still
points at supabase.co, either re-run the migration script or upload
a new image to verify the R2 path.

---

## After launch — what's next

When traffic justifies it (probably 6+ months in):

- **Move database to D1?** Probably not — RLS makes Supabase worth keeping.
  See the rationale in our session notes.
- **Move auth to Clerk's enterprise tier?** Only if you exceed 10k MAU.
- **CF cache rules** — once you have traffic, add aggressive caching
  on the marketing pages (landing, FAQ, blog) via Cloudflare Page Rules.
