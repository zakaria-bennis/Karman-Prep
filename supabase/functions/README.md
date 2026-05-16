# Webhook setup for Karman scheduling

> Webhook handlers in this app run as **Next.js API routes**, not Supabase Edge Functions. This directory keeps the README in the location the original spec asked for, but the actual code lives under `src/app/api/webhooks/...`. Routes deploy with the rest of the Next app on Vercel — no separate Deno deploy step.

## Webhook routes

| Provider    | Route                            | Source path                                      | Auth                                                                                                                                         |
| ----------- | -------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Cal.com     | `/api/webhooks/cal`              | `src/app/api/webhooks/cal/route.ts`              | HMAC-SHA256 of raw body, header `X-Cal-Signature-256`. Secret in `CAL_WEBHOOK_SECRET`.                                                       |
| Zoom        | `/api/webhooks/zoom`             | `src/app/api/webhooks/zoom/route.ts`             | HMAC-SHA256 of `v0:<ts>:<body>`, header `x-zm-signature`. Secret in `ZOOM_WEBHOOK_SECRET`. Also handles `endpoint.url_validation` challenge. |
| Supabase DB | `/api/webhooks/seminar-overflow` | `src/app/api/webhooks/seminar-overflow/route.ts` | Shared secret in `Authorization: Bearer <SUPABASE_DB_WEBHOOK_SECRET>`.                                                                       |

## Cal.com webhook configuration

1. https://app.cal.com → **Settings → Developer → Webhooks → New Webhook**.
2. **Subscriber URL:** `https://<your-domain>/api/webhooks/cal`.
3. **Event triggers** (at minimum):
   - `Booking created`
   - `Booking canceled`
   - `Booking rescheduled`
   - `Meeting ended` (optional — not handled today, future-proofing)
4. **Secret:** generate a strong random string (e.g. `openssl rand -hex 32`). Paste the same value into `CAL_WEBHOOK_SECRET` in `.env.local` (and Vercel project env).
5. Save. The placeholder URL `https://example.com/api/webhooks/cal` works during development — Cal will retry on failure but won't block save.

## Zoom webhook configuration

1. https://marketplace.zoom.us → your **Server-to-Server OAuth app** → **Feature → Event Subscriptions** → **Add Event Subscription**.
2. **Event notification endpoint URL:** `https://<your-domain>/api/webhooks/zoom`.
3. **Events to subscribe to:**
   - `Meeting → Participant joined meeting`
   - `Meeting → Participant left meeting`
   - `Meeting → Meeting ended`
4. After saving, Zoom shows a **Secret Token** at the top of the panel — paste it into `ZOOM_WEBHOOK_SECRET` in `.env.local`.
5. Click **Validate** in the Zoom UI — Zoom will POST `{ event: "endpoint.url_validation", payload: { plainToken } }` to the route. Our handler responds with the HMAC-encrypted token, validation passes, subscription activates.
6. **Activate** the app from the Activation tab. Subscriptions don't fire until activation.

## Supabase Database Webhook (seminar overflow)

1. https://app.supabase.com → your project → **Database → Webhooks → Create a new webhook**.
2. **Name:** `seminar_overflow`.
3. **Table:** `cohort_members`.
4. **Events:** check **Insert**.
5. **Type:** HTTP Request.
6. **Method:** POST.
7. **URL:** `https://<your-domain>/api/webhooks/seminar-overflow`.
8. **HTTP Headers:**
   - `Authorization`: `Bearer <SUPABASE_DB_WEBHOOK_SECRET>` — same value as the env var.
   - `Content-Type`: `application/json`.
9. Save. The route checks the count of active members in the inserted-into cohort and creates a sibling cohort if it crosses 200.

## Local development

Webhooks can't reach `localhost:3000` directly. Two options:

- **Skip webhook testing on local.** Build and unit-test handler logic; verify against Vercel preview deployments where the URLs resolve.
- **Tunnel with ngrok.** Run `ngrok http 3000`, copy the `https://<id>.ngrok-free.app` URL, and use it as the Subscriber URL temporarily. Note: ngrok URL changes on each restart unless you have a paid plan.

## Environment variable cheatsheet

```
CAL_API_KEY                       Cal.com personal API key
CAL_API_URL                       https://api.cal.com/v2
CAL_WEBHOOK_SECRET                HMAC secret for /api/webhooks/cal

ZOOM_ACCOUNT_ID                   S2S OAuth Account ID
ZOOM_CLIENT_ID                    S2S OAuth Client ID
ZOOM_CLIENT_SECRET                S2S OAuth Client Secret
ZOOM_WEBHOOK_SECRET               Secret Token from Event Subscriptions

SUPABASE_DB_WEBHOOK_SECRET        Shared secret for Supabase → /api/webhooks/seminar-overflow
RESEND_API_KEY                    Resend API key (already configured)
RESEND_FROM_EMAIL                 From-address for booking emails
```
