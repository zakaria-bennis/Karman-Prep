// ============================================================
// Stripe utilities — server-side only
// ============================================================

import Stripe from "stripe";
import { type CohortPayment } from "./cohort-installments";
import {
  cohortInstallmentSpecs,
  findStripePrice,
  priceLabel,
  type StripePriceSpec,
} from "./prices";

/**
 * Card plus Stripe Link on every checkout. Founder, 2026-11-12: push Link, because a returning
 * Link customer has everything saved and finishes in a tap. Checkout puts the Link button above
 * the card form on its own; listing "link" next to "card" is what Stripe's docs require when
 * payment_method_types is given. Link must also be on in the Dashboard's payment method settings.
 */
export const CARD_METHODS = ["card", "link"] as const;

/**
 * One-payment checkouts (Cohort, Private 10, Private 20) name no payment methods: Stripe offers
 * whichever ones are switched on in the Dashboard's payment method settings and fit the payment
 * (card, Link, wallets, and pay-later ways such as Klarna and Afterpay). Naming one that the
 * account cannot use makes Stripe refuse the whole checkout, and on 2026-11-14 Affirm was
 * "Ineligible" on the live account. Subscriptions and the deposit keep CARD_METHODS.
 */

/** Server-side Stripe client. Never import in browser code.
 *
 *  Configured with the fetch-based HTTP client so it works in both
 *  Node (local dev) and Cloudflare Workers (prod via OpenNext). The
 *  default uses Node's http module which breaks on the edge runtime
 *  — fetch is portable everywhere. Webhook signature verification
 *  must use stripe.webhooks.constructEventAsync (Web Crypto under
 *  the hood) — see /api/stripe/webhook/route.ts. */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
  httpClient: Stripe.createFetchHttpClient(),
});

/**
 * The active Stripe price for a plan, found by its lookup key. Throws when
 * the price is missing (the setup script has not run against this Stripe
 * account) or when its amount or interval differs from offer.ts, so a
 * family is never charged a price the site does not show.
 */
export function getCheckoutPrice(spec: StripePriceSpec): Promise<Stripe.Price> {
  // Speed (2026-11-23): one Stripe round trip saved per checkout. A checked price is kept for a
  // few minutes in this server instance; a failed lookup is not kept.
  const key = `${spec.lookupKey}|${spec.amount}|${spec.intervalMonths}`;
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.at < PRICE_CACHE_MS) return hit.price;
  const price = fetchCheckoutPrice(spec);
  priceCache.set(key, { at: Date.now(), price });
  price.catch(() => priceCache.delete(key));
  return price;
}

const PRICE_CACHE_MS = 5 * 60_000;
const priceCache = new Map<string, { at: number; price: Promise<Stripe.Price> }>();

async function fetchCheckoutPrice(spec: StripePriceSpec): Promise<Stripe.Price> {
  const { data } = await stripe.prices.list({
    lookup_keys: [spec.lookupKey],
    active: true,
    limit: 1,
  });
  const price = data[0];
  if (!price) {
    throw new Error(
      `No active Stripe price has lookup key ${spec.lookupKey}. Run scripts/stripe/setup-test-products.mjs.`
    );
  }
  const months = price.recurring ? price.recurring.interval_count : null;
  const sameInterval =
    spec.intervalMonths === null
      ? price.type === "one_time"
      : price.recurring?.interval === "month" && months === spec.intervalMonths;
  if (price.unit_amount !== spec.amount * 100 || price.currency !== "usd" || !sameInterval) {
    throw new Error(
      `Stripe price ${price.id} (${spec.lookupKey}) does not match offer.ts (${priceLabel(spec)}). Run scripts/stripe/setup-test-products.mjs.`
    );
  }
  return price;
}

/**
 * Creates a Stripe Checkout Session for one plan. Renewing plans use
 * `mode: "subscription"`, one-payment plans `mode: "payment"`. The same
 * metadata goes on the session and on the subscription or payment, so
 * the webhook can tell who bought what.
 */
export async function createCheckoutSession({
  customerId,
  spec,
  userId,
  cohortId,
  payment,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  spec: StripePriceSpec;
  userId: string;
  /** The cohort a Cohort seat is for, when the family picked one. */
  cohortId?: string;
  /** Cohort only: "installments" for the $95 deposit and three monthly payments. */
  payment?: CohortPayment;
  successUrl: string;
  cancelUrl: string;
}) {
  const cohort: Record<string, string> =
    spec.planId === "cohort" && cohortId ? { cohort_id: cohortId } : {};

  // The cohort's instalment plan: the $95 deposit now, with the card saved for the three
  // monthly $300 payments that the webhook schedules from the cohort's start.
  if (spec.planId === "cohort" && payment === "installments") {
    const deposit = await getCheckoutPrice(cohortInstallmentSpecs().deposit);
    const metadata = { userId, planId: spec.planId, term: "installments", ...cohort };
    return stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: [...CARD_METHODS],
      line_items: [{ price: deposit.id, quantity: 1 }],
      payment_intent_data: { setup_future_usage: "off_session", metadata },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });
  }

  const price = await getCheckoutPrice(spec);
  const metadata = { userId, planId: spec.planId, term: spec.term, ...cohort };
  const shared: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: [...CARD_METHODS],
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    allow_promotion_codes: true,
  };

  if (spec.intervalMonths) {
    return stripe.checkout.sessions.create({
      ...shared,
      mode: "subscription",
      subscription_data: { metadata: { userId, planId: spec.planId, term: spec.term } },
    });
  }
  return stripe.checkout.sessions.create({
    ...shared,
    payment_method_types: undefined,
    mode: "payment",
    // A card used here is kept on file (founder, 2026-11-17: a Private family adding hours later
    // should be charged in one press). Asked of cards only, so the pay-later ways stay offered.
    payment_method_options: { card: { setup_future_usage: "on_session" } },
    // The admin scholarship payout refunds the cohort price by cohort_id.
    payment_intent_data: { metadata: { userId, planId: spec.planId, ...cohort } },
  });
}

/**
 * Checkout for a cohort seat reserved from the marketing site, before the student has an account
 * (src/lib/reserve). The same prices and payment methods as a signed-in cohort checkout; the metadata
 * carries the reservation instead of a user, and the webhook settles it by that id.
 * The payment is taken on our own page (/reserve/pay): the session is made for Stripe's fields to be
 * placed inside it (ui_mode "elements"), and its client secret is what that page opens them with.
 */
export async function createReservationCheckoutSession({
  customerId,
  reservationId,
  programId,
  payment,
  returnUrl,
  way,
}: {
  customerId: string;
  reservationId: string;
  programId: string;
  payment: CohortPayment;
  /** Where Stripe sends the family once the payment is made. */
  returnUrl: string;
  /** One way to pay alone: a checkout that offers only that way, for its own group on the payment
   *  page ("card": the typed card, with none of Link's extra tabs; or a pay-later plan, the bank, a
   *  wallet, opened when the family picks it). Left out: the one-tap ways (Link, Apple Pay, Google Pay). */
  way?: PayWay | "card";
}) {
  const metadata = {
    reservationId,
    planId: "cohort",
    term: payment,
    programId,
    ...(way ? { way } : {}),
  };
  const shared = {
    customer: customerId,
    ui_mode: "elements" as const,
    return_url: returnUrl,
    metadata,
    // the typed card's own checkout shows card fields only: Link stays with the one-tap buttons
    ...(way === "card" ? { wallet_options: { link: { display: "never" as const } } } : {}),
  };
  if (payment === "installments") {
    const deposit = await getCheckoutPrice(cohortInstallmentSpecs().deposit);
    return stripe.checkout.sessions.create({
      ...shared,
      mode: "payment",
      payment_method_types: way === "card" ? ["card"] : [...CARD_METHODS],
      line_items: [{ price: deposit.id, quantity: 1 }],
      payment_intent_data: { setup_future_usage: "off_session", metadata },
    });
  }
  const spec = findStripePrice("cohort");
  if (!spec) throw new Error("The cohort has no Stripe price in prices.ts");
  const price = await getCheckoutPrice(spec);
  // The payment page draws each group of ways itself (one tap, card, pay later, bank, more), so each
  // checkout names what it offers: Link with the card behind it (which brings Apple Pay and Google Pay)
  // for the one-tap buttons, or one way alone. Link is kept out of the typed card's checkout because
  // it adds tabs of its own there (a bank and a pay-later plan run by Link).
  return stripe.checkout.sessions.create({
    ...shared,
    mode: "payment",
    payment_method_types: way ? [way] : [...CARD_METHODS],
    line_items: [{ price: price.id, quantity: 1 }],
    payment_intent_data: { metadata },
  });
}

/**
 * Checkout for a renewing plan (Practice, Pro), paid on our own page (/checkout/pay) the way a cohort
 * seat is (founder, 2026-11-26): Stripe's fields inside our page, so the session is made in ui_mode
 * "elements". The page opens two: this one for the one-tap buttons (Link, Apple Pay, Google Pay), and
 * one with `way: "card"` for the typed card alone, with none of Link's extras. Whichever is paid starts
 * the subscription; the same metadata goes on it, so the webhook knows whose it is.
 */
export async function createPlanPaySession({
  customerId,
  spec,
  userId,
  returnUrl,
  way,
}: {
  customerId: string;
  spec: StripePriceSpec;
  userId: string;
  /** Where Stripe sends the buyer back to after a step that left the site (a bank's own check). */
  returnUrl: string;
  way?: "card";
}) {
  const price = await getCheckoutPrice(spec);
  const metadata = { userId, planId: spec.planId, term: spec.term };
  return stripe.checkout.sessions.create({
    customer: customerId,
    ui_mode: "elements",
    return_url: returnUrl,
    mode: "subscription",
    payment_method_types: way === "card" ? ["card"] : [...CARD_METHODS],
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { ...metadata, ...(way ? { way } : {}) },
    subscription_data: { metadata },
    ...(way === "card" ? { wallet_options: { link: { display: "never" as const } } } : {}),
  });
}

/** The other ways to pay for a cohort seat in full, in the order the payment page groups them. */
export const PAY_WAYS = ["klarna", "affirm", "us_bank_account", "cashapp", "amazon_pay"] as const;
export type PayWay = (typeof PAY_WAYS)[number];

let waysKept: { at: number; ways: PayWay[] } | null = null;
/**
 * Which of the other ways this Stripe account can take right now. A way counts when it is switched on
 * in the Dashboard's payment method settings, or when the account is approved for it (the bank is
 * approved but not switched on there). Naming a way the account cannot use makes Stripe refuse the
 * checkout (Affirm was "Ineligible" on the live account on 2026-11-14), so the page only shows these.
 * Kept for ten minutes. If Stripe cannot be asked, none is offered and the card still works.
 */
export async function payWays(): Promise<PayWay[]> {
  if (waysKept && Date.now() - waysKept.at < 600_000) return waysKept.ways;
  try {
    const [configs, account] = await Promise.all([
      stripe.paymentMethodConfigurations.list({ limit: 20 }),
      stripe.accounts.retrieveCurrent(),
    ]);
    const on = configs.data.find((c) => c.is_default && c.active) ?? configs.data[0];
    const approved = account.capabilities ?? {};
    const capability: Record<PayWay, keyof typeof approved> = {
      klarna: "klarna_payments",
      affirm: "affirm_payments",
      us_bank_account: "us_bank_account_ach_payments",
      cashapp: "cashapp_payments",
      amazon_pay: "amazon_pay_payments",
    };
    const ways = PAY_WAYS.filter(
      (w) => on?.[w]?.available === true || approved[capability[w]] === "active"
    );
    waysKept = { at: Date.now(), ways };
    return ways;
  } catch (e) {
    console.error("[stripe] could not read the ways to pay", e);
    return [];
  }
}

/** The Stripe customer already made for this Clerk user, found by its metadata. */
export async function findCustomer(userId: string): Promise<Stripe.Customer | null> {
  const existing = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });
  return existing.data[0] ?? null;
}

/**
 * Creates or retrieves a Stripe customer for the given Clerk user.
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  found: Promise<Stripe.Customer | null> = findCustomer(userId)
) {
  const existing = await found;
  if (existing) return existing;

  return stripe.customers.create({
    email,
    metadata: { userId },
  });
}
