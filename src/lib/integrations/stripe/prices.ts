// ============================================================
// Stripe prices for the plan ladder (founder, 2026-11-08).
//
// Amounts come from src/lib/marketing/offer.ts, so a price change
// there is the only edit needed. Checkout finds each price by its
// lookup key when a family clicks, so there are no price ids in env.
// The prices themselves are created (test mode) by
// `node scripts/stripe/setup-test-products.mjs`, which reads this table.
// Free and School are never sold through Checkout.
// ============================================================

import {
  MARCH_PROGRAM,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  TUTOR_AFFILIATE_PLAN,
  formatPrice,
} from "@/lib/marketing/offer";
import {
  ONE_TIME_PLAN_IDS,
  SUBSCRIPTION_PLAN_IDS,
  type SubscriptionPlanId,
} from "@/lib/plans/catalog";

/** Plans sold through Stripe Checkout: the renewing ones (`mode: "subscription"`)
 *  and the one-payment ones (`mode: "payment"`). */
export const CHECKOUT_PLAN_IDS = [...SUBSCRIPTION_PLAN_IDS, ...ONE_TIME_PLAN_IDS] as const;
export type CheckoutPlanId = (typeof CHECKOUT_PLAN_IDS)[number];

/** Plans that offer a choice between paying monthly and every 3 months. */
export const TERM_PLAN_IDS = ["practice", "pro"] as const satisfies readonly SubscriptionPlanId[];

/** "month" bills every month, "quarter" bills every 3 months. */
export const BILLING_TERMS = ["month", "quarter"] as const;
export type BillingTerm = (typeof BILLING_TERMS)[number];

export interface StripePriceSpec {
  lookupKey: string;
  planId: CheckoutPlanId;
  /** The billing term, "once" for a one-time payment, or the cohort instalment plan's parts. */
  term: BillingTerm | "once" | "deposit" | "installment";
  /** The Stripe product name (one product per plan). */
  productName: string;
  /** Whole US dollars. */
  amount: number;
  /** Months between payments (1 or 3), or null for a one-time payment. */
  intervalMonths: 1 | 3 | null;
}

function privatePackage(id: "private-10" | "private-20") {
  const pkg = PRIVATE_PACKAGES.find((p) => p.id === id);
  if (!pkg) throw new Error(`offer.ts has no private package ${id}`);
  return pkg;
}

export const STRIPE_PRICES: readonly StripePriceSpec[] = [
  {
    lookupKey: "practice_monthly",
    planId: "practice",
    term: "month",
    productName: PRACTICE_PLAN.name,
    amount: PRACTICE_PLAN.monthly,
    intervalMonths: 1,
  },
  {
    lookupKey: "practice_3_months",
    planId: "practice",
    term: "quarter",
    productName: PRACTICE_PLAN.name,
    amount: PRACTICE_PLAN.threeMonths,
    intervalMonths: 3,
  },
  {
    lookupKey: "pro_monthly",
    planId: "pro",
    term: "month",
    productName: PRO_PLAN.name,
    amount: PRO_PLAN.monthly,
    intervalMonths: 1,
  },
  {
    lookupKey: "pro_3_months",
    planId: "pro",
    term: "quarter",
    productName: PRO_PLAN.name,
    amount: PRO_PLAN.threeMonths,
    intervalMonths: 3,
  },
  {
    lookupKey: "cohort",
    planId: "cohort",
    term: "once",
    productName: MARCH_PROGRAM.planName,
    amount: MARCH_PROGRAM.price,
    intervalMonths: null,
  },
  {
    lookupKey: "private_10",
    planId: "private-10",
    term: "once",
    productName: privatePackage("private-10").name,
    amount: privatePackage("private-10").price,
    intervalMonths: null,
  },
  {
    lookupKey: "private_20",
    planId: "private-20",
    term: "once",
    productName: privatePackage("private-20").name,
    amount: privatePackage("private-20").price,
    intervalMonths: null,
  },
  {
    lookupKey: "tutor_affiliate_monthly",
    planId: "tutor-affiliate",
    term: "month",
    productName: TUTOR_AFFILIATE_PLAN.name,
    amount: TUTOR_AFFILIATE_PLAN.monthly,
    intervalMonths: 1,
  },
  // The cohort's instalment plan: the deposit, then three monthly payments
  // (see cohort-installments.ts). Listed after "cohort" so findStripePrice
  // still returns the $995 price for the cohort.
  {
    lookupKey: "cohort_deposit",
    planId: "cohort",
    term: "deposit",
    productName: MARCH_PROGRAM.planName,
    amount: MARCH_PROGRAM.depositAmount,
    intervalMonths: null,
  },
  {
    lookupKey: "cohort_installment",
    planId: "cohort",
    term: "installment",
    productName: MARCH_PROGRAM.planName,
    amount: MARCH_PROGRAM.installments.amount,
    intervalMonths: 1,
  },
];

/** The instalment plan's two prices, by lookup key. */
export function cohortInstallmentSpecs(): {
  deposit: StripePriceSpec;
  installment: StripePriceSpec;
} {
  const deposit = STRIPE_PRICES.find((p) => p.lookupKey === "cohort_deposit");
  const installment = STRIPE_PRICES.find((p) => p.lookupKey === "cohort_installment");
  if (!deposit || !installment) throw new Error("The cohort instalment prices are missing");
  return { deposit, installment };
}

export function isSubscriptionPlan(planId: string): planId is SubscriptionPlanId {
  return (SUBSCRIPTION_PLAN_IDS as readonly string[]).includes(planId);
}

export function hasTermChoice(planId: string): boolean {
  return (TERM_PLAN_IDS as readonly string[]).includes(planId);
}

/**
 * The price a plan is sold at. Practice and Pro need a term; every other
 * plan has a single price and ignores it. Returns null for a plan and
 * term that are not sold.
 */
export function findStripePrice(planId: string, term?: BillingTerm | null): StripePriceSpec | null {
  if (hasTermChoice(planId)) {
    if (!term) return null;
    return STRIPE_PRICES.find((p) => p.planId === planId && p.term === term) ?? null;
  }
  return STRIPE_PRICES.find((p) => p.planId === planId) ?? null;
}

/** "$39 a month", "$89 every 3 months", "$995". */
export function priceLabel(spec: Pick<StripePriceSpec, "amount" | "intervalMonths">): string {
  const price = formatPrice(spec.amount);
  if (spec.intervalMonths === 1) return `${price} a month`;
  if (spec.intervalMonths) return `${price} every ${spec.intervalMonths} months`;
  return price;
}

/** What a renewing price is worth per month, for MRR. Zero for one-time prices. */
export function monthlyValue(spec: Pick<StripePriceSpec, "amount" | "intervalMonths">): number {
  return spec.intervalMonths ? spec.amount / spec.intervalMonths : 0;
}
