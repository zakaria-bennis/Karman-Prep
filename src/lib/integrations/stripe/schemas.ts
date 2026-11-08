// ============================================================
// Zod schemas for Stripe boundaries.
//
//   · Webhook BODY → not validated here. Signature verification
//     plus the SDK's typed Event union already do that job.
//
//   · Webhook METADATA → validated. Stripe types metadata as
//     `Record<string, string>`, so a typo'd plan id or an object
//     created outside our Checkout flow (no metadata at all) would
//     otherwise flow into `subscriptions` or `plan_grants`.
//
//   · Checkout REQUEST body → validated before any Stripe call.
// ============================================================

import { z } from "zod";
import { ONE_TIME_PLAN_IDS, SUBSCRIPTION_PLAN_IDS } from "@/lib/plans/catalog";
import { BILLING_TERMS, CHECKOUT_PLAN_IDS, hasTermChoice } from "./prices";

export const checkoutPlanIdSchema = z.enum(CHECKOUT_PLAN_IDS);
export const billingTermSchema = z.enum(BILLING_TERMS);

/** Metadata Checkout puts on a Subscription (`subscription_data.metadata`).
 *  `userId` is the Clerk user id. Missing on subscriptions made outside
 *  our flow, so callers use `safeParse` and skip those. */
export const subscriptionMetadataSchema = z.object({
  userId: z.string().min(1, "userId required"),
  planId: z.enum(SUBSCRIPTION_PLAN_IDS),
  term: billingTermSchema,
});

/** Metadata Checkout puts on a one-payment session (cohort, private-10, private-20). */
export const purchaseMetadataSchema = z.object({
  userId: z.string().min(1, "userId required"),
  planId: z.enum(ONE_TIME_PLAN_IDS),
});

/** Metadata on Stripe Charge objects. Only `userId` is read (in `charge.refunded`). */
export const chargeMetadataSchema = z.object({
  userId: z.string().min(1, "userId required"),
});

/** Body for POST /api/stripe/checkout. Practice and Pro need a term; every
 *  other plan has one price and ignores it. A Cohort seat may name its cohort. */
export const createCheckoutBodySchema = z
  .object({
    plan: checkoutPlanIdSchema,
    term: billingTermSchema.optional(),
    /** Cohort only: the cohort the seat is for. Ignored for other plans. */
    cohortId: z.uuid().optional(),
  })
  .refine((body) => !hasTermChoice(body.plan) || body.term !== undefined, {
    message: "term is required for practice and pro",
    path: ["term"],
  });

export type CreateCheckoutBody = z.infer<typeof createCheckoutBodySchema>;
