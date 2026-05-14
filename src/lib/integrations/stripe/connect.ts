// ============================================================
// Stripe Connect helpers — Express accounts for tutors.
//
// Lives behind the platform's STRIPE_SECRET_KEY (already wired
// up for student subscriptions). Every Connect call is also
// authorized by that same key — connected accounts inherit
// permission via the Account header (Stripe-Account: acct_xxx).
//
// Functions here are deliberately small, single-purpose, and
// throw on Stripe errors so the calling server action can
// surface a clear message to the tutor.
// ============================================================

import Stripe from "stripe";

let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (_stripe) return _stripe;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY missing");
  // CF Workers needs the fetch-based HTTP client; the default Node
  // https client retries+fails on Workers ("connection to Stripe…").
  _stripe = new Stripe(apiKey, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}

// ──────────────────────────────────────────────────────────
// Account creation + onboarding
// ──────────────────────────────────────────────────────────

export interface CreateExpressAccountInput {
  email: string;
  /** First + last name from users table — used to prefill onboarding. */
  firstName: string | null;
  lastName: string | null;
}

/** Create a brand-new Express Connect account for a tutor.
 *  Capabilities requested:
 *   - transfers   → required to receive money from the platform
 *   - card_payments → not strictly needed (tutor isn't accepting
 *     cards), but Stripe sometimes requires it for instant payouts
 *   - instant_payouts → so the tutor can use the Instant button */
export async function createExpressAccount(input: CreateExpressAccountInput): Promise<string> {
  const acct = await stripe().accounts.create({
    type: "express",
    country: "US",
    email: input.email,
    capabilities: {
      transfers:        { requested: true },
      card_payments:    { requested: true },
    },
    business_type: "individual",
    individual: {
      email: input.email,
      ...(input.firstName ? { first_name: input.firstName } : {}),
      ...(input.lastName  ? { last_name:  input.lastName  } : {}),
    },
    settings: {
      payouts: {
        // Manual schedule — we control when payouts fire (vs Stripe
        // auto-paying out daily). This lets the tutor click a button
        // at the exact moment they want to be paid.
        schedule: { interval: "manual" },
      },
    },
    metadata: {
      platform: "karmanprep",
      role: "tutor",
    },
  });
  return acct.id;
}

/** Generate a one-time onboarding link the tutor visits to
 *  finish KYC + add a bank account. Stripe-hosted, looks
 *  branded. Links expire after a few minutes. */
export async function createOnboardingLink(
  connectedAccountId: string,
  baseUrl: string
): Promise<string> {
  const link = await stripe().accountLinks.create({
    account: connectedAccountId,
    refresh_url: `${baseUrl}/tutor/settings/payment?refresh=1`,
    return_url:  `${baseUrl}/tutor/settings/payment?onboarded=1`,
    type: "account_onboarding",
  });
  return link.url;
}

/** Generate a link for the tutor to update their bank/debit card
 *  AFTER initial onboarding. Same URL, different `type`. */
export async function createUpdateLink(
  connectedAccountId: string,
  baseUrl: string
): Promise<string> {
  const link = await stripe().accountLinks.create({
    account: connectedAccountId,
    refresh_url: `${baseUrl}/tutor/settings/payment?refresh=1`,
    return_url:  `${baseUrl}/tutor/settings/payment?updated=1`,
    type: "account_update",
  });
  return link.url;
}

export interface AccountStatus {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements_currently_due: string[];
  requirements_eventually_due: string[];
  /** True iff Stripe says we can transfer money to this account
   *  AND it can pay out. Tutor sees "ready to receive payouts". */
  ready: boolean;
  /** True iff the account has the instant_payouts capability
   *  active — required for the "Get paid instantly" button. */
  instant_payouts_active: boolean;
}

/** Fetch live status of a Connect account from Stripe.
 *
 *  Instant eligibility comes from `available_payout_methods` on
 *  any of the connected account's external_accounts (bank or card).
 *  In test mode, Stripe's test bank is auto-flagged as
 *  ["standard", "instant"]. In production, only US debit cards
 *  carry "instant" — bank accounts default to "standard" only. */
export async function fetchAccountStatus(connectedAccountId: string): Promise<AccountStatus> {
  const [acct, externals] = await Promise.all([
    stripe().accounts.retrieve(connectedAccountId),
    stripe().accounts.listExternalAccounts(connectedAccountId, { limit: 20 }),
  ]);
  const requirements = acct.requirements;
  type ExtMethods = { available_payout_methods?: string[] };
  const instantEligible = (externals.data ?? []).some((e) =>
    ((e as ExtMethods).available_payout_methods ?? []).includes("instant")
  );
  return {
    id: acct.id,
    charges_enabled: acct.charges_enabled === true,
    payouts_enabled: acct.payouts_enabled === true,
    details_submitted: acct.details_submitted === true,
    requirements_currently_due: (requirements?.currently_due ?? []) as string[],
    requirements_eventually_due: (requirements?.eventually_due ?? []) as string[],
    ready: acct.charges_enabled === true && acct.payouts_enabled === true,
    instant_payouts_active: instantEligible,
  };
}

// ──────────────────────────────────────────────────────────
// Money movement
// ──────────────────────────────────────────────────────────

export interface TransferInput {
  /** Total in dollars before any fees. */
  amount: number;
  connectedAccountId: string;
  /** Description shown in Stripe dashboard. */
  description: string;
  metadata?: Record<string, string>;
}

/** Transfer from platform balance → connected account.
 *  Step 1 of any payout. The money sits in the connected
 *  account's Stripe balance; a separate payout call moves
 *  it to their bank/card. */
export async function transferToConnectedAccount(input: TransferInput): Promise<string> {
  const tr = await stripe().transfers.create({
    amount: Math.round(input.amount * 100),
    currency: "usd",
    destination: input.connectedAccountId,
    description: input.description,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
  return tr.id;
}

export interface PayoutInput {
  /** Net dollars (post-fee) being paid out. */
  amount: number;
  connectedAccountId: string;
  /** "instant" → debit-card payout (~30s, +1% Stripe fee paid by destination)
   *  "standard" → ACH (next business day, free) */
  method: "instant" | "standard";
  description: string;
  metadata?: Record<string, string>;
}

/** Step 2 of a payout. Moves the connected account's Stripe
 *  balance to their bank or debit card. Run with the connected
 *  account in the `Stripe-Account` header. */
export async function createPayoutFromConnectedAccount(input: PayoutInput): Promise<string> {
  const po = await stripe().payouts.create(
    {
      amount: Math.round(input.amount * 100),
      currency: "usd",
      method: input.method,
      description: input.description,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
    { stripeAccount: input.connectedAccountId }
  );
  return po.id;
}

// ──────────────────────────────────────────────────────────
// Login link — for the tutor to view their Express dashboard
// (transactions, tax forms, etc.)
// ──────────────────────────────────────────────────────────
export async function createLoginLink(connectedAccountId: string): Promise<string> {
  const link = await stripe().accounts.createLoginLink(connectedAccountId);
  return link.url;
}
