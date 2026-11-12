// The shapes the plan rules read and write, and the data source they go through.
// Kept apart from resolve.ts so the Supabase adapter can share them without a cycle.

import type { PlanId } from "@/lib/marketing/offer";
import type { PlanAccess } from "./access";
import type { GrantPlanId, PlanEntitlements } from "./catalog";

export const GRANT_SOURCES = ["purchase", "school", "tutor-affiliate", "admin"] as const;
export type GrantSource = (typeof GRANT_SOURCES)[number];

/** A `public.subscriptions` row, as the rules need it. */
export interface SubscriptionRecord {
  userId: string;
  /** Raw `plan_id`; anything outside SUBSCRIPTION_PLAN_IDS is ignored. */
  planId: string | null;
  status: string;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string;
}

/** A `public.plan_grants` row. */
export interface PlanGrant {
  id: string;
  userId: string;
  planId: GrantPlanId;
  source: GrantSource;
  sourceRef: string | null;
  sponsorUserId: string | null;
  startsAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export type GrantTerms = Pick<PlanGrant, "planId" | "sponsorUserId" | "startsAt" | "expiresAt">;
export type NewPlanGrant = GrantTerms & { userId: string; source: GrantSource; sourceRef: string };
export type GrantMatch =
  | { grantId: string }
  | { source: GrantSource; sourceRef: string; userId: string };

/** Everything the rules read or write. `supabasePlanDataSource()` is the real one. */
export interface PlanDataSource {
  /** Every subscription row, any status, for these users. */
  subscriptions(userIds: readonly string[]): Promise<SubscriptionRecord[]>;
  /** The user's unrevoked grants. */
  grants(userId: string): Promise<PlanGrant[]>;
  /** Unrevoked tutor-affiliate grants this tutor pays for. */
  sponsoredGrants(sponsorUserId: string): Promise<PlanGrant[]>;
  /** Insert unless (source, sourceRef, userId) exists; returns the stored row either way. */
  insertGrant(grant: NewPlanGrant): Promise<{ grant: PlanGrant; created: boolean }>;
  /** Clear revoked_at on a grant and give it new terms. */
  restoreGrant(id: string, terms: GrantTerms): Promise<PlanGrant>;
  /** Set revoked_at on the matching unrevoked grants; returns how many. */
  revokeGrants(match: GrantMatch, revokedAt: string): Promise<number>;
  /** Distinct questions the user has answered. */
  answeredQuestionCount(userId: string): Promise<number>;
  /** Full-length tests the user has completed. */
  completedFullLengthTests(userId: string): Promise<number>;
  /** The user's `users.sat_test_date` (YYYY-MM-DD), or null when none is set. */
  satTestDate(userId: string): Promise<string | null>;
}

/** One active source of access. */
export interface PlanSource {
  /** "subscription" for a Stripe plan, otherwise the grant's source. */
  kind: "subscription" | GrantSource;
  planId: PlanId;
  /** `stripe_subscription_id`, or `plan_grants.id`. */
  id: string;
  /** When it stops counting: period end, expiry, or a purchase's SAT day end. Null = open-ended. */
  endsAt: string | null;
  /** The tutor paying for a tutor-affiliate grant. */
  sponsorUserId?: string;
}

export interface ResolvedPlan extends PlanAccess {
  userId: string;
  /** The most generous active plan: the one to call "your plan". */
  planId: PlanId;
  /** Every active plan, most generous first; ["free"] when there is nothing else. */
  planIds: PlanId[];
  /** The union of every active source's access. */
  entitlements: PlanEntitlements;
  /** The active sources, most generous first. */
  sources: PlanSource[];
}

export interface GrantResult {
  grant: PlanGrant;
  /** `existing`: the same grant was already there (a retry). `restored`: it had been revoked. */
  status: "created" | "existing" | "restored";
}

/** A grant the rules refuse: the tutor's subscription is not active, or the roster is full. */
export class PlanGrantError extends Error {}
