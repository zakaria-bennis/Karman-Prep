// ============================================================
// Admin plan data: each user's plan (subscriptions + plan
// grants), affiliate tutors and school seats. Reads use the
// service role, on the server only. Reads are defensive: the
// pricing update (plan_id, billing_term, plan_grants) may not
// be on this database yet. Pure helpers are tested in
// plans.test.ts. Generosity order mirrors src/lib/plans/ in the
// pricing update.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

export const PLAN_IDS = [
  "free",
  "practice",
  "pro",
  "cohort",
  "private-10",
  "private-20",
  "school",
  "tutor-affiliate",
] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_LABEL: Readonly<Record<PlanId, string>> = {
  free: "Free",
  practice: "Practice",
  pro: "Pro",
  cohort: "Cohort",
  "private-10": "Private 10",
  "private-20": "Private 20",
  school: "School",
  "tutor-affiliate": "Tutor affiliate",
};

/** Most generous first. */
const GENEROSITY: readonly PlanId[] = [
  "tutor-affiliate",
  "private-20",
  "private-10",
  "cohort",
  "pro",
  "practice",
  "school",
  "free",
];

/** Old subscription tiers, mapped the way the pricing migration maps them. */
const LEGACY_TIER: Readonly<Record<string, PlanId>> = {
  group: "practice",
  small_group: "practice",
  private: "pro",
  elite: "pro",
};

export const PLAN_FILTERS = [
  "all",
  "free",
  "practice",
  "pro",
  "cohort",
  "private",
  "school",
  "tutor-affiliate",
] as const;
export type PlanFilter = (typeof PLAN_FILTERS)[number];

export const GRANT_SOURCES = ["purchase", "school", "tutor-affiliate", "admin"] as const;
export type GrantSource = (typeof GRANT_SOURCES)[number];
export type PlanSource = "subscription" | GrantSource | "none";

export const COMPS_MISSING_MESSAGE =
  "Comps start working once the pricing update is merged: the plan_grants table isn't on this database yet.";

export type Row = Record<string, unknown>;

export interface AdminUserRow {
  id: string;
  clerkId: string | null;
  role: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface SubscriptionInfo {
  id: string;
  userId: string;
  stripeSubscriptionId: string | null;
  planId: PlanId | null;
  rawPlan: string | null;
  fromLegacyTier: boolean;
  hasPlanColumn: boolean;
  billingTerm: string | null;
  status: string;
  currentPeriodEnd: string | null;
  createdAt: string | null;
}

export interface GrantInfo {
  id: string;
  userId: string;
  planId: PlanId | null;
  source: string;
  sourceRef: string | null;
  sponsorUserId: string | null;
  startsAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface EffectivePlan {
  planId: PlanId;
  source: PlanSource;
  subscription: SubscriptionInfo | null;
  grant: GrantInfo | null;
}

// ---------- pure helpers ----------

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

export function toPlanId(value: unknown): PlanId | null {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value)
    ? (value as PlanId)
    : null;
}

/** Reads a subscriptions row from before or after the pricing migration. */
export function mapSubscription(row: Row): SubscriptionInfo {
  const direct = toPlanId(row.plan_id);
  const tier = str(row.tier);
  const legacy =
    !direct && tier && Object.prototype.hasOwnProperty.call(LEGACY_TIER, tier)
      ? LEGACY_TIER[tier]
      : null;
  return {
    id: String(row.id),
    userId: str(row.user_id) ?? "",
    stripeSubscriptionId: str(row.stripe_subscription_id),
    planId: direct ?? legacy,
    rawPlan: str(row.plan_id) ?? tier,
    fromLegacyTier: !direct && legacy !== null,
    hasPlanColumn: "plan_id" in row,
    billingTerm: str(row.billing_term),
    status: str(row.status) ?? "unknown",
    currentPeriodEnd: str(row.current_period_end),
    createdAt: str(row.created_at),
  };
}

export function mapGrant(row: Row): GrantInfo {
  return {
    id: String(row.id),
    userId: str(row.user_id) ?? "",
    planId: toPlanId(row.plan_id),
    source: str(row.source) ?? "admin",
    sourceRef: str(row.source_ref),
    sponsorUserId: str(row.sponsor_user_id),
    startsAt: str(row.starts_at) ?? str(row.created_at) ?? new Date(0).toISOString(),
    expiresAt: str(row.expires_at),
    revokedAt: str(row.revoked_at),
  };
}

export function mapUser(row: Row): AdminUserRow {
  return {
    id: String(row.id),
    clerkId: str(row.clerk_id),
    role: str(row.role) ?? "student",
    email: str(row.email),
    firstName: str(row.first_name),
    lastName: str(row.last_name),
  };
}

/** Active and trialing count; past_due counts until current_period_end. */
export function isSubscriptionLive(
  sub: Pick<SubscriptionInfo, "status" | "currentPeriodEnd">,
  now: Date
): boolean {
  if (sub.status === "active" || sub.status === "trialing") return true;
  return (
    sub.status === "past_due" &&
    sub.currentPeriodEnd !== null &&
    Date.parse(sub.currentPeriodEnd) > now.getTime()
  );
}

/** Started, not expired, not revoked. A tutor-affiliate grant also needs a live sponsor. */
export function isGrantLive(
  grant: GrantInfo,
  now: Date,
  activeSponsors: ReadonlySet<string> = new Set()
): boolean {
  const t = now.getTime();
  if (grant.revokedAt !== null || Date.parse(grant.startsAt) > t) return false;
  if (grant.expiresAt !== null && Date.parse(grant.expiresAt) <= t) return false;
  if (grant.source === "tutor-affiliate") {
    return grant.sponsorUserId !== null && activeSponsors.has(grant.sponsorUserId);
  }
  return true;
}

/** Clerk ids of tutors whose tutor-affiliate subscription is live. */
export function activeAffiliateSponsors(subs: SubscriptionInfo[], now: Date): Set<string> {
  return new Set(
    subs
      .filter((s) => s.planId === "tutor-affiliate" && isSubscriptionLive(s, now))
      .map((s) => s.userId)
  );
}

const SOURCE_ORDER: readonly PlanSource[] = [
  "subscription",
  "admin",
  "purchase",
  "school",
  "tutor-affiliate",
  "none",
];

function toSource(source: string): PlanSource {
  return (GRANT_SOURCES as readonly string[]).includes(source) ? (source as GrantSource) : "admin";
}

/** The most generous of a user's live subscriptions and live grants. Free when none. */
export function effectivePlan(
  subs: SubscriptionInfo[],
  grants: GrantInfo[],
  now: Date,
  activeSponsors?: ReadonlySet<string>
): EffectivePlan {
  const options: EffectivePlan[] = [];
  for (const s of subs) {
    if (s.planId && isSubscriptionLive(s, now)) {
      options.push({ planId: s.planId, source: "subscription", subscription: s, grant: null });
    }
  }
  for (const g of grants) {
    if (g.planId && isGrantLive(g, now, activeSponsors)) {
      options.push({ planId: g.planId, source: toSource(g.source), subscription: null, grant: g });
    }
  }
  options.sort(
    (a, b) =>
      GENEROSITY.indexOf(a.planId) - GENEROSITY.indexOf(b.planId) ||
      SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source)
  );
  return options[0] ?? { planId: "free", source: "none", subscription: null, grant: null };
}

/** Which filter tab a user falls under. School seats and tutor codes get their own tab. */
export function planFilterOf(plan: EffectivePlan): Exclude<PlanFilter, "all"> {
  if (plan.source === "school") return "school";
  if (plan.source === "tutor-affiliate") return "tutor-affiliate";
  if (plan.planId === "private-10" || plan.planId === "private-20") return "private";
  return plan.planId;
}

/** The subscription to show for a user: a live one first, else the newest. */
export function pickSubscription(subs: SubscriptionInfo[], now: Date): SubscriptionInfo | null {
  const sorted = [...subs].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return sorted.find((s) => isSubscriptionLive(s, now)) ?? sorted[0] ?? null;
}

export function isMissingTable(error: { code?: string | null } | null | undefined): boolean {
  return !!error && (error.code === "PGRST205" || error.code === "42P01");
}

export function matchesQuery(q: string, fields: Array<string | null | undefined>): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => !!f && f.toLowerCase().includes(needle));
}

export function personName(u: Pick<AdminUserRow, "firstName" | "lastName" | "email">): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.email || "No name";
}

export type SchoolStatus = "pilot" | "due" | "lapsed";

/** The first year is free; renewal is one year after the pilot starts. */
export function schoolRenewal(
  pilotStart: string,
  now: Date
): { renewsAt: string; status: SchoolStatus; daysLeft: number } {
  const renews = new Date(pilotStart);
  renews.setUTCFullYear(renews.getUTCFullYear() + 1);
  const daysLeft = Math.ceil((renews.getTime() - now.getTime()) / 86_400_000);
  const status: SchoolStatus = daysLeft <= 0 ? "lapsed" : daysLeft <= 30 ? "due" : "pilot";
  return { renewsAt: renews.toISOString(), status, daysLeft };
}

export interface SchoolSummary {
  ref: string;
  studentIds: string[];
  pilotStart: string;
  renewsAt: string;
  status: SchoolStatus;
  daysLeft: number;
}

/** School seats grouped by school (source_ref). Students count unrevoked seats. */
export function groupSchools(grants: GrantInfo[], now: Date): SchoolSummary[] {
  const bySchool = new Map<string, GrantInfo[]>();
  for (const g of grants) {
    if (g.source !== "school") continue;
    const ref = g.sourceRef ?? "School with no id";
    bySchool.set(ref, [...(bySchool.get(ref) ?? []), g]);
  }
  const out: SchoolSummary[] = [];
  for (const [ref, rows] of bySchool) {
    let pilotStart: string | null = null;
    for (const g of rows) {
      if (pilotStart === null || Date.parse(g.startsAt) < Date.parse(pilotStart)) {
        pilotStart = g.startsAt;
      }
    }
    if (pilotStart === null) continue;
    const studentIds = [...new Set(rows.filter((g) => g.revokedAt === null).map((g) => g.userId))];
    out.push({ ref, studentIds, pilotStart, ...schoolRenewal(pilotStart, now) });
  }
  return out.sort((a, b) => a.renewsAt.localeCompare(b.renewsAt));
}

export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

// ---------- server reads ----------

/** Untyped service-role client: plan_grants and the affiliate tables aren't in the generated types. */
export function adminDb(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

export interface Rows {
  rows: Row[];
  missing: boolean;
  error: string | null;
}

/** select from one table, optionally `column in values`. Never throws. */
export async function selectRows(
  table: string,
  columns = "*",
  filter?: { column: string; values: string[] }
): Promise<Rows> {
  if (filter && filter.values.length === 0) return { rows: [], missing: false, error: null };
  try {
    let query = adminDb().from(table).select(columns).limit(5000);
    if (filter) query = query.in(filter.column, filter.values);
    const { data, error } = await query;
    if (error) return { rows: [], missing: isMissingTable(error), error: error.message };
    return { rows: (data ?? []) as unknown as Row[], missing: false, error: null };
  } catch (err) {
    return { rows: [], missing: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const USER_COLUMNS = "id, clerk_id, role, email, first_name, last_name";

export async function loadUsers(filter?: {
  column: "role" | "id" | "clerk_id";
  values: string[];
}): Promise<{ rows: AdminUserRow[]; error: string | null }> {
  const res = await selectRows("users", USER_COLUMNS, filter);
  return { rows: res.rows.map(mapUser), error: res.error };
}

export async function loadSubscriptions(
  clerkIds?: string[]
): Promise<{ rows: SubscriptionInfo[]; error: string | null }> {
  const res = await selectRows(
    "subscriptions",
    "*",
    clerkIds ? { column: "user_id", values: clerkIds } : undefined
  );
  return { rows: res.rows.map(mapSubscription), error: res.error };
}

/** available is false when plan_grants isn't on this database (or can't be read). */
export async function loadGrants(): Promise<{
  available: boolean;
  rows: GrantInfo[];
  error: string | null;
}> {
  const res = await selectRows("plan_grants");
  if (res.missing) return { available: false, rows: [], error: null };
  if (res.error) return { available: false, rows: [], error: res.error };
  return { available: true, rows: res.rows.map(mapGrant), error: null };
}
