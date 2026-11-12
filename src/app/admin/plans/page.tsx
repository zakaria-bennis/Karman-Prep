// ============================================================
// /admin/plans — every student and parent with their plan.
// The plan is the most generous of a live subscription and live
// plan grants (comps, purchases, school seats, tutor codes).
// Filter by plan, search by name or email, and manage a user in
// the row's disclosure.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  WbMix,
  WbPage,
  WbPill,
  WbSearch,
  WbStats,
  WbTable,
  WbTabs,
  WbToolbar,
  formatDate,
  type Tone,
} from "@/components/admin/workbench";
import {
  COMPS_MISSING_MESSAGE,
  PLAN_FILTERS,
  PLAN_LABEL,
  activeAffiliateSponsors,
  effectivePlan,
  groupBy,
  isGrantLive,
  loadGrants,
  loadSubscriptions,
  loadUsers,
  matchesQuery,
  personName,
  pickSubscription,
  planFilterOf,
  type AdminUserRow,
  type EffectivePlan,
  type GrantInfo,
  type PlanFilter,
  type PlanSource,
  type SubscriptionInfo,
} from "@/lib/admin/plans";
import { isStripeTestKey } from "@/lib/scholarship/payout";
import PlanRowActions, { type RowGrant } from "./PlanRowActions";

export const metadata: Metadata = { title: "Plans and subscriptions" };
export const dynamic = "force-dynamic";

const PATH = "/admin/plans";

const FILTER_LABEL: Record<PlanFilter, string> = {
  all: "All",
  free: "Free",
  practice: "Practice",
  pro: "Pro",
  cohort: "Cohort",
  private: "Private",
  school: "School",
  "tutor-affiliate": "Tutor affiliate",
};

const SOURCE_LABEL: Record<PlanSource, string> = {
  subscription: "Subscription",
  admin: "Comp",
  purchase: "One-time purchase",
  school: "School seat",
  "tutor-affiliate": "Tutor code",
  none: "No paid plan",
};

const STATUS_TONE: Record<string, Tone> = {
  active: "ok",
  trialing: "info",
  past_due: "warn",
  unpaid: "fail",
  incomplete: "warn",
  canceled: "neutral",
};

const TERM_LABEL: Record<string, string> = { month: "monthly", quarter: "every 3 months" };

interface Person {
  user: AdminUserRow;
  plan: EffectivePlan;
  filter: Exclude<PlanFilter, "all">;
  sub: SubscriptionInfo | null;
  liveGrants: GrantInfo[];
}

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function grantLabel(g: GrantInfo): string {
  const plan = g.planId ? PLAN_LABEL[g.planId] : "Unknown plan";
  const source = SOURCE_LABEL[g.source as PlanSource] ?? g.source;
  return `${plan} · ${source} · ${g.expiresAt ? `ends ${formatDate(g.expiresAt)}` : "no end date"}`;
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawPlan = one(sp.plan);
  const plan: PlanFilter = (PLAN_FILTERS as readonly string[]).includes(rawPlan)
    ? (rawPlan as PlanFilter)
    : "all";
  const q = one(sp.q).trim().slice(0, 100);

  const [users, subs, grants] = await Promise.all([
    loadUsers({ column: "role", values: ["student", "parent"] }),
    loadSubscriptions(),
    loadGrants(),
  ]);
  const now = new Date();
  const sponsors = activeAffiliateSponsors(subs.rows, now);
  const subsByUser = groupBy(subs.rows, (s) => s.userId);
  const grantsByUser = groupBy(grants.rows, (g) => g.userId);
  const stripeTestMode = isStripeTestKey(process.env.STRIPE_SECRET_KEY);

  const people: Person[] = users.rows.map((user) => {
    const mySubs = (user.clerkId && subsByUser.get(user.clerkId)) || [];
    const myGrants = (user.clerkId && grantsByUser.get(user.clerkId)) || [];
    const effective = effectivePlan(mySubs, myGrants, now, sponsors);
    return {
      user,
      plan: effective,
      filter: planFilterOf(effective),
      sub: pickSubscription(mySubs, now),
      liveGrants: myGrants.filter((g) => isGrantLive(g, now, sponsors)),
    };
  });

  const searched = people
    .filter((p) => matchesQuery(q, [personName(p.user), p.user.email]))
    .sort((a, b) => personName(a.user).localeCompare(personName(b.user)));
  const shown = plan === "all" ? searched : searched.filter((p) => p.filter === plan);
  const countOf = (f: PlanFilter) =>
    f === "all" ? searched.length : searched.filter((p) => p.filter === f).length;

  const compsNote = grants.available
    ? null
    : grants.error
      ? `Comps are off: plan_grants couldn't be read (${grants.error}).`
      : COMPS_MISSING_MESSAGE;
  const loadError = users.error ?? subs.error;

  return (
    <WbPage
      title="Plans and subscriptions"
      summary="Each student and parent with the plan they can use today."
      actions={
        <>
          <Link href="/admin/affiliates">Affiliate tutors</Link>
          <Link href="/admin/schools">Schools</Link>
        </>
      }
    >
      {loadError && (
        <p role="alert" className="wb-alert">
          Some plan data couldn&apos;t be read: {loadError}
        </p>
      )}
      {compsNote && <p className="wb-note">{compsNote}</p>}

      <WbStats
        items={[
          { label: "Students and parents", value: people.length },
          { label: "On a paid plan", value: people.filter((p) => p.plan.planId !== "free").length },
          { label: "Comped", value: people.filter((p) => p.plan.source === "admin").length },
          { label: "On Free", value: people.filter((p) => p.plan.planId === "free").length },
        ]}
      />

      <WbMix
        title="Plan mix"
        note={
          q
            ? "People matching the search, by the plan they can use today"
            : "By the plan each person can use today"
        }
        parts={PLAN_FILTERS.filter((f) => f !== "all").map((f) => ({
          label: FILTER_LABEL[f],
          value: countOf(f),
          tone: f === "free" ? ("none" as const) : undefined,
        }))}
      />
      <WbToolbar>
        <WbTabs
          label="Filter by plan"
          param="plan"
          value={plan}
          basePath={PATH}
          params={{ q: q || undefined }}
          options={PLAN_FILTERS.map((f) => ({
            value: f,
            label: FILTER_LABEL[f],
            count: countOf(f),
          }))}
        />
        <WbSearch
          label="Search by name or email"
          placeholder="Name or email"
          value={q}
          action={PATH}
          keep={{ plan: plan === "all" ? undefined : plan }}
        />
      </WbToolbar>

      <WbTable<Person>
        caption="Students and parents with their plans"
        rows={shown}
        rowKey={(p) => p.user.id}
        empty={
          q || plan !== "all" ? (
            <>
              <b>No one matches.</b>
              <Link href={PATH}>Clear the filters</Link>
            </>
          ) : (
            <b>No students or parents yet.</b>
          )
        }
        columns={[
          {
            key: "person",
            label: "Person",
            cell: (p) => (
              <>
                {personName(p.user)}
                <small>
                  {p.user.email ?? "No email"} · {p.user.role}
                </small>
              </>
            ),
          },
          {
            key: "plan",
            label: "Plan",
            cell: (p) => (
              <>
                <WbPill
                  tone={
                    p.plan.planId === "free" ? "neutral" : p.plan.source === "admin" ? "info" : "ok"
                  }
                >
                  {PLAN_LABEL[p.plan.planId]}
                </WbPill>
                <small>{SOURCE_LABEL[p.plan.source]}</small>
              </>
            ),
          },
          {
            key: "billing",
            label: "Subscription",
            cell: (p) =>
              p.sub ? (
                <>
                  <WbPill tone={STATUS_TONE[p.sub.status] ?? "neutral"}>
                    {p.sub.status.replace("_", " ")}
                  </WbPill>
                  <small>
                    {p.sub.planId ? PLAN_LABEL[p.sub.planId] : (p.sub.rawPlan ?? "Unknown plan")}
                    {p.sub.billingTerm
                      ? `, ${TERM_LABEL[p.sub.billingTerm] ?? p.sub.billingTerm}`
                      : ""}
                    {p.sub.fromLegacyTier ? ` (old tier: ${p.sub.rawPlan})` : ""}
                  </small>
                </>
              ) : (
                "No subscription"
              ),
          },
          {
            key: "ends",
            label: "Ends",
            cell: (p) =>
              p.plan.grant
                ? p.plan.grant.expiresAt
                  ? formatDate(p.plan.grant.expiresAt)
                  : "No end date"
                : p.plan.subscription?.currentPeriodEnd
                  ? `Renews ${formatDate(p.plan.subscription.currentPeriodEnd)}`
                  : "—",
          },
          {
            key: "actions",
            label: "Actions",
            cell: (p) => {
              const s = p.sub;
              const changeable =
                !!s &&
                (s.stripeSubscriptionId ?? "").startsWith("sub_") &&
                (s.planId === "practice" || s.planId === "pro") &&
                s.status !== "canceled";
              const rowGrants: RowGrant[] = p.liveGrants.map((g) => ({
                id: g.id,
                label: grantLabel(g),
                canEnd: g.source === "admin",
              }));
              return (
                <PlanRowActions
                  userId={p.user.id}
                  name={personName(p.user)}
                  grants={rowGrants}
                  compsAvailable={grants.available && !!p.user.clerkId}
                  compsNote={
                    compsNote ?? (p.user.clerkId ? null : "This user has no sign-in id yet.")
                  }
                  change={changeable && s ? { subscriptionId: s.id } : null}
                  stripeTestMode={stripeTestMode}
                />
              );
            },
          },
        ]}
      />
    </WbPage>
  );
}
