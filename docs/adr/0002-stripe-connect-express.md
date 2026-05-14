# 0002 — Stripe Connect Express (not Standard) for tutor accounts

- **Status**: Accepted
- **Date**: 2026-05-11
- **Deciders**: @zakaria-bennis

## Context

When tutors get paid by KarmanPrep, money flows: student's card → KarmanPrep's Stripe balance → tutor's bank or debit card. That third hop requires the tutor to have a Stripe-managed account that the platform can transfer to. Stripe Connect offers three account types:

- **Standard** — full Stripe account owned by the tutor; they sign up for Stripe directly
- **Express** — Stripe-hosted onboarding + dashboard, but the platform owns the relationship
- **Custom** — platform handles every aspect of onboarding, KYC, tax forms

Tutors are independent contractors, not full-time staff. Most won't have or want a Stripe account. We need:

1. Quick onboarding (a tutor signs up at karmanprep.com → adds a bank account → starts getting paid, all in <10 min)
2. Stripe handles compliance: KYC, 1099s at year-end, sanctions screening
3. Self-serve payout buttons for the tutor (not admin-mediated payouts)

## Decision

Use **Express** Connect accounts for all tutors. Stripe owns the onboarding flow at `connect.stripe.com/setup/...`, and tutors land back at `/tutor/settings/payment` when done. Onboarding requested capabilities: `transfers` (required) and `card_payments` (needed for instant payout eligibility checks).

## Alternatives considered

- **Standard** — tutors would need to create their own Stripe accounts directly. Rejected: too much friction for a first-time tutor; many won't complete it
- **Custom** — KarmanPrep collects SSN, bank routing, etc. directly. Rejected: massive compliance lift (KYC, AML, sanctions screening, 1099 generation) we'd have to build/buy
- **No Connect — manual ACH/Zelle from admin** (the original v1 plan) — rejected after the founder's directive that tutors should self-serve payouts. Manual processing doesn't scale past ~5 tutors

## Consequences

- ✅ Tutor onboarding: ~5 minutes, all on Stripe-hosted UI; we never touch SSN or bank routing numbers
- ✅ Stripe handles 1099-NEC generation at year-end (no manual tax form work)
- ✅ Self-serve payouts via the platform: Instant (debit card, 2.5% fee, ~30 sec) + ACH (bank, free, 2-3 business days)
- ⚠️ Connect Express has API limits: we cannot programmatically add bank accounts or debit cards — the tutor must do it via the Express Dashboard. (Hit during testing — see [`src/lib/integrations/stripe/connect.ts`](../../src/lib/integrations/stripe/connect.ts))
- ⚠️ `account_update` Account Links don't work for Express accounts that haven't completed full verification — we use `createLoginLink()` to send the tutor to their Express Dashboard instead
- 🔄 Future revisit: if we expand internationally, Stripe Connect Standard becomes more attractive because Express is US-only as of this writing
