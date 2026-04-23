# Strata — SAT Tutoring Platform

A full-stack subscription-based SAT tutoring platform built with Next.js 15, Supabase, Clerk, Stripe, and Tailwind CSS.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Auth | Clerk (student / tutor / parent roles) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Payments | Stripe (Checkout + Webhooks + Customer Portal) |
| Email | Resend (transactional + audience) |
| Styling | Tailwind CSS v3 |
| Monitoring | Sentry |
| Deployment | Vercel |

---

## Project Structure

```
strata/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Landing page
│   │   ├── layout.tsx                   # Root layout (Clerk provider)
│   │   ├── onboarding/                  # Role selection after sign-up
│   │   ├── auth/sign-in|sign-up/        # Clerk auth pages
│   │   ├── billing/                     # Subscription management
│   │   ├── dashboard/student/           # Student dashboard
│   │   ├── diagnostic/                  # 20-question adaptive diagnostic
│   │   └── api/
│   │       ├── stripe/checkout          # Create checkout session
│   │       ├── stripe/webhook           # Handle Stripe events
│   │       ├── stripe/portal            # Customer portal
│   │       ├── email/subscribe          # Email capture
│   │       ├── auth/sync-user           # Clerk → Supabase sync
│   │       └── diagnostic/submit        # Save diagnostic results
│   ├── components/
│   │   ├── landing/                     # All landing page sections
│   │   ├── dashboard/                   # Dashboard UI components
│   │   └── diagnostic/                  # Diagnostic UI components
│   ├── lib/
│   │   ├── supabase/client.ts           # Browser Supabase client
│   │   ├── supabase/server.ts           # Server/admin Supabase client
│   │   ├── stripe/client.ts             # Stripe helpers
│   │   ├── resend/emails.ts             # Email sending functions
│   │   └── utils.ts                     # Shared utilities
│   └── types/index.ts                   # All TypeScript types
├── supabase/
│   └── schema.sql                       # Full DB schema + RLS + seed data
└── .env.local                           # Environment variables template
```

---

## Setup Instructions

### 1. Prerequisites

- Node.js v18+
- A Supabase project
- A Clerk application
- A Stripe account
- A Resend account

### 2. Install Dependencies

```bash
cd strata
npm install
```

### 3. Environment Variables

Fill in `.env.local` with your API keys:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_GROUP_MONTHLY=price_...
STRIPE_PRICE_ELITE_MONTHLY=price_...
STRIPE_PRICE_PRIVATE=price_...
STRIPE_PRICE_ANNUAL=price_...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set Up Supabase

1. Go to your Supabase project → **SQL Editor**
2. Paste and run `supabase/schema.sql`
3. This creates all tables, enables RLS, and seeds 15 core concepts

### 5. Configure Clerk

1. Create a Clerk application at dashboard.clerk.com
2. Set allowed redirect URLs:
   - Sign-in URL: `/auth/sign-in`
   - Sign-up URL: `/auth/sign-up`
   - After sign-up: `/onboarding`
   - After sign-in: `/dashboard/student`

### 6. Set Up Stripe

1. Create products + prices in Stripe dashboard:
   - **Group**: $40/month recurring (price ID → `STRIPE_PRICE_GROUP_MONTHLY`)
   - **Elite**: $800/month recurring (price ID → `STRIPE_PRICE_ELITE_MONTHLY`)
   - **Private**: $135/session (price ID → `STRIPE_PRICE_PRIVATE`)
   - **Annual**: $384/year recurring (price ID → `STRIPE_PRICE_ANNUAL`)
2. Add webhook endpoint → `/api/stripe/webhook`
   - Events: `customer.subscription.created`, `updated`, `deleted`, `trial_will_end`
3. Copy webhook secret → `STRIPE_WEBHOOK_SECRET`

**Local testing:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 7. Run Dev Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 8. Deploy to Vercel

```bash
vercel deploy
```

Add all env vars in the Vercel dashboard. Set `NEXT_PUBLIC_APP_URL` to your production domain.

---

## Subscription Tiers

| Tier | Price | Description |
|---|---|---|
| Group | $40/month | Live group sessions + full curriculum |
| Small Group | $60/session | Small group tutoring |
| Private | $135/session | 1-on-1 tutoring |
| Elite | $800/month | Unlimited private sessions + dedicated tutor |
| Annual | $384/year | Group plan + 2 coaching sessions (save 20%) |

All monthly plans include a **7-day free trial** (card required, auto-charges day 8).

---

## Score Guarantee

Students who complete their personalized learning path for 8 weeks without a 150+ point improvement receive a full refund.

---

## Database Tables

| Table | Purpose |
|---|---|
| `users` | Clerk user sync + roles |
| `subscriptions` | Stripe subscription state |
| `concepts` | SAT curriculum nodes |
| `progress` | Per-student concept status |
| `diagnostic_results` | Assessment scores + domain breakdown |
| `questions` | Practice + diagnostic questions |

RLS ensures students can only see their own data. Admin API routes use the service role key.

---

## Domain Color System

| Domain | Color |
|---|---|
| Algebra | Blue `#3B82F6` |
| Advanced Math | Purple `#A855F7` |
| Geometry | Teal `#14B8A6` |
| Data Analysis | Amber `#F59E0B` |
| Reading & Writing | Coral `#FB7185` |

---

## License

MIT
