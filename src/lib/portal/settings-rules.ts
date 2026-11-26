/*
 * Settings' rules and words that need no server: where a link into a folder goes, what a tutor code's
 * answer says, how a plan's state is said, which plans are an upgrade, and what a scholarship claim's
 * state says. Pure, so it is unit-tested and shared by the pages that redirect into Settings.
 */
import { COHORT_SCHOLARSHIP } from "@/lib/marketing/offer";
import { BILLING_TERMS, type BillingTerm } from "@/lib/integrations/stripe/prices";
import type { PlanId } from "@/lib/plans/catalog";
import type { GrantSource } from "@/lib/plans/plan-data";
import { centsToDollars } from "@/lib/scholarship/payout-split";
import type { RedeemResult } from "@/lib/tutor-affiliate/service";

// ---------------------------------------------------------------- links into Settings

/** The folders other pages link to (the keys in Settings.tsx). */
export type LinkedFolder = "people" | "plan" | "scholarship";

/** The portal's Account page with a folder open: `/join` and `/join/class` send a code, `/billing` a
 *  plan. Empty values are left out. */
export function settingsHref(
  folder: LinkedFolder,
  extra: Record<string, string | null | undefined> = {}
) {
  const q = new URLSearchParams({ page: "account", folder });
  for (const [key, value] of Object.entries(extra)) if (value) q.set(key, value);
  return `/dashboard/student?${q.toString()}`;
}

// ---------------------------------------------------------------- a tutor's code

export type RedeemAnswer = RedeemResult | { ok: false; reason: "error"; message: string };

/** What a tutor code's answer says, in the student's words. */
export function redeemMessage(result: RedeemAnswer): string {
  if (result.ok) {
    return result.status === "already_joined"
      ? `You're already in ${result.tutorName}'s group.`
      : `You're in ${result.tutorName}'s group. You have the Practice plan.`;
  }
  switch (result.reason) {
    case "invalid_code":
      return "That code doesn't work. Check it with your tutor.";
    case "tutor_inactive":
      return `${result.tutorName}'s Karman plan isn't active right now, so the code can't add students.`;
    case "full":
      return `${result.tutorName}'s group is full. Ask them about it.`;
    case "removed_by_tutor":
      return `${result.tutorName} removed you from this group. Ask them for a new code.`;
    case "linked_elsewhere":
      return `You're in ${result.currentTutorName}'s group. Switch to ${result.tutorName}'s group?`;
    case "not_student":
      return "Tutor codes are for student accounts.";
    case "no_account":
      return "Finish setting up your account first, then add the code.";
    default:
      return result.message;
  }
}

// ---------------------------------------------------------------- the plan

export interface PlanState {
  planId: PlanId;
  /** How the plan is held: a Stripe plan, a purchase, a school seat, a tutor's code, or Karman. */
  source: "subscription" | "tester" | GrantSource | null;
  /** When it stops counting (period end, expiry, the day after the SAT). */
  endsAt: string | null;
  /** The Stripe plan's state ("active", "past_due"...), for a Stripe plan. */
  status: string | null;
  /** A Stripe customer exists, so the billing portal (card, receipts, plan) can open. */
  hasBilling: boolean;
  /** A renewing plan is live, so a new plan is changed in the billing portal, never bought twice. */
  renewing: boolean;
  /** The testing switch is on (the site lock is on): any plan can be picked for free. */
  testing: boolean;
  /** On the local test copy only: the test account in use, for Settings' "Test accounts". */
  testAccount?: string | null;
  /** The seeded accounts this copy's database has, to switch between. */
  testAccounts?: { id: string; name: string }[];
}

/** "December 3, 2026", as the student's own calendar has it. */
export const longDay = (iso: string, timeZone?: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  });

/** The plan's state in a few words, or null when there is nothing to say (Free). A Stripe plan says
 *  "paid through" and not "renews": a cancellation waiting for the period's end is not stored. */
export function planStateLine(state: PlanState, timeZone?: string): string | null {
  const day = state.endsAt ? longDay(state.endsAt, timeZone) : null;
  switch (state.source) {
    case "subscription":
      if (state.status === "past_due")
        return day ? `Payment due, paid through ${day}` : "Payment due";
      return day ? `Paid through ${day}` : "Active";
    case "school":
      return day ? `From your school until ${day}` : "From your school";
    case "tutor-affiliate":
      return "From your tutor";
    case "tester":
      return "Picked with the testing switch";
    case "purchase":
    case "admin":
      return day ? `Ends ${day}` : null;
    default:
      return null;
  }
}

/** The plans Settings offers above this one: Free may take Practice or Pro, Practice may take Pro.
 *  The Cohort and Private start with a call, so they are on the pricing page, not here. */
export function upgradesFor(planId: PlanId): ("practice" | "pro")[] {
  if (planId === "free") return ["practice", "pro"];
  if (planId === "practice") return ["pro"];
  return [];
}

/** A plan picked on the pricing page and carried here (?plan=pro&term=quarter): Practice or Pro only,
 *  a term the code knows (monthly unless it says "quarter"). */
export function readChoice(
  get: (key: string) => string | null
): { planId: "practice" | "pro"; term: BillingTerm } | null {
  const plan = get("plan");
  if (plan !== "practice" && plan !== "pro") return null;
  const term = get("term");
  return {
    planId: plan,
    term:
      term && (BILLING_TERMS as readonly string[]).includes(term) ? (term as BillingTerm) : "month",
  };
}

/** Stripe Checkout for one plan and term (GET /checkout/start). */
export const checkoutHref = (planId: "practice" | "pro", term: BillingTerm) =>
  `/checkout/start?plan=${planId}&term=${term}`;

// ---------------------------------------------------------------- the cohort scholarship

export interface ScholarshipClaim {
  id: string;
  cohortId: string;
  status: "submitted" | "approved" | "rejected" | "paid";
  submittedAt: string;
  reviewReason: string | null;
  refundCents: number | null;
  bonusCents: number | null;
}

/** Where a claim stands, as a title and a line. */
export function claimLine(
  claim: ScholarshipClaim,
  cohortName: string,
  timeZone?: string
): { title: string; body: string } {
  switch (claim.status) {
    case "submitted":
      return {
        title: "We have your score report",
        body: `Uploaded ${longDay(claim.submittedAt, timeZone)} for ${cohortName}. We check every report by hand and email you when it's decided.`,
      };
    case "approved":
      return {
        title: "You won the scholarship",
        body: `Congratulations. Your refund and the bank transfer for the bonus go out within ${COHORT_SCHOLARSHIP.payWithinDays} days.`,
      };
    case "rejected":
      return {
        title: "We couldn't accept this report",
        body: claim.reviewReason ?? "Upload your official College Board score report again.",
      };
    case "paid":
      return {
        title: "Your scholarship is paid",
        body: `${centsToDollars(claim.refundCents ?? 0)} refunded to your original payment method${
          claim.bonusCents
            ? ` and a ${centsToDollars(claim.bonusCents)} merit bonus sent by bank transfer`
            : ""
        }.`,
      };
  }
}
