// ============================================================
// Admin CRM: one list of people built from rows that already
// exist (leads, accounts, subscriptions, purchases, schools,
// tutor codes) plus what admins added by hand (crm_* tables).
// Pure, so it is unit-tested in model.test.ts.
//
// De-duplication: contacts are merged by lower-cased email.
// Accounts of the same kind with the same email become one
// contact (duplicate sign-ups); a parent and a student who share
// an email stay two contacts, because they are two people. A lead
// joins the first contact with its email.
// ============================================================

import {
  PLAN_LABEL,
  activeAffiliateSponsors,
  effectivePlan,
  isGrantLive,
  isSubscriptionLive,
  type GrantInfo,
  type PlanId,
} from "@/lib/admin/plans";
import { crmToday, dayLabel, formatCents } from "./format";
import { periodsStarted, purchaseCents, subscriptionPeriodCents } from "./money";
import {
  STAGE_LABEL,
  type Contact,
  type ContactType,
  type CrmEvent,
  type CrmPayment,
  type CrmRaw,
  type CrmSubscription,
  type RawLead,
  type RawUser,
  type Stage,
} from "./types";

// ---------- keys and sources ----------

/** The CRM key for an email: trimmed and lower-cased. null when it is not an email. */
export function emailKey(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+$/.test(e) ? e : null;
}

/** Groups the lead form's `source` values: every cohort is one source, every practice test one. */
export function sourceKey(source: string): string {
  if (source.startsWith("cohort-")) return "cohort";
  if (source.startsWith("practice-test")) return "practice-test";
  return source;
}

export const SOURCE_LABEL: Readonly<Record<string, string>> = {
  cohort: "Cohort application",
  private: "Private tutoring call",
  "practice-test": "Free practice test",
  scholarship: "Scholarship enquiry",
  newsletter: "Newsletter",
  "coming-soon": "Coming-soon page",
  signup: "Signed up",
  "parent-email": "Child's sign-up form",
  waitlist: "Cohort waitlist",
  school: "School seat",
  "tutor-code": "Tutor's code",
};

export function sourceLabel(key: string): string {
  return SOURCE_LABEL[key] ?? key;
}

/** Sources that mean a conversation has started: an application or a call request. */
const TALKING_SOURCES: ReadonlySet<string> = new Set(["cohort", "private"]);

// ---------- stage ----------

const NEVER_PAID: ReadonlySet<string> = new Set(["incomplete", "incomplete_expired"]);
const LIVE_SCHOOL: ReadonlySet<string> = new Set([
  "free_year",
  "renewal_set",
  "active",
  "past_due",
]);

export interface StageInput {
  subs: CrmSubscription[];
  grants: GrantInfo[];
  now: Date;
  sponsors?: ReadonlySet<string>;
  /** In a forming or active cohort right now (cohort_members, not left). */
  inCohort?: boolean;
  /** Was in a cohort that has finished, or left one. */
  pastCohort?: boolean;
  /** Source keys (see sourceKey). */
  sources?: string[];
  /** billing_status of each school the contact belongs to. */
  schoolStatuses?: string[];
}

/**
 * The pipeline stage from local rows:
 * enrolled  a live plan (subscription, purchase, school seat, tutor code, comp), a live school,
 *           or a place in a forming or active cohort;
 * deposit   a cohort bought but not placed in a cohort yet;
 * churned   paid or took part before, nothing live now (or every school cancelled);
 * talking   applied for a cohort or asked for a private call;
 * lead      everyone else.
 */
export function deriveStage(input: StageInput): Stage {
  const {
    subs,
    grants,
    now,
    sponsors,
    inCohort = false,
    pastCohort = false,
    sources = [],
    schoolStatuses = [],
  } = input;
  if (schoolStatuses.some((s) => LIVE_SCHOOL.has(s))) return "enrolled";
  if (schoolStatuses.length > 0 && schoolStatuses.every((s) => s === "canceled")) {
    return "churned";
  }
  const liveSubs = subs.filter((s) => isSubscriptionLive(s, now));
  const liveGrants = grants.filter((g) => isGrantLive(g, now, sponsors));
  const isCohortBuy = (g: GrantInfo) => g.planId === "cohort" && g.source === "purchase";
  const cohortBought = liveGrants.some(isCohortBuy);
  if (liveSubs.length > 0 || liveGrants.some((g) => !isCohortBuy(g))) return "enrolled";
  if (inCohort) return "enrolled";
  if (cohortBought) return "deposit";
  const paidBefore =
    pastCohort ||
    subs.some((s) => !NEVER_PAID.has(s.status)) ||
    grants.some((g) => g.source === "purchase");
  if (paidBefore) return "churned";
  if (sources.some((s) => TALKING_SOURCES.has(s))) return "talking";
  return "lead";
}

/** How far along the pipeline: a family takes the furthest of the parent's and the children's. */
const STAGE_RANK: Readonly<Record<Stage, number>> = {
  lead: 0,
  talking: 1,
  churned: 2,
  deposit: 3,
  enrolled: 4,
};

export function furthestStage(stages: Stage[]): Stage {
  return stages.reduce<Stage>((a, b) => (STAGE_RANK[b] > STAGE_RANK[a] ? b : a), "lead");
}

// ---------- form answers ----------

const DETAIL_LABEL: Readonly<Record<string, string>> = {
  latest: "Latest score",
  target: "Target",
  startDate: "Cohort start",
  satDate: "SAT date",
  grade: "Grade",
  plan: "Plan",
  slot: "Call time",
  phone: "Phone",
};

/** The form's answers as labelled pairs. Phone only when asked for (the profile, not the timeline). */
export function formAnswers(
  details: Record<string, string>,
  withPhone = false
): Array<[string, string]> {
  return Object.entries(DETAIL_LABEL)
    .filter(([k]) => details[k] && (withPhone || k !== "phone"))
    .map(([k, label]) => [label, details[k]]);
}

// ---------- building the list ----------

export function personName(u: Pick<RawUser, "firstName" | "lastName">): string | null {
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return n || null;
}

function typeOf(
  u: RawUser,
  schoolMembers: ReadonlySet<string>,
  affiliateTutors: ReadonlySet<string>
): ContactType | null {
  if (u.role === "student") return "student";
  if (u.role === "parent") return "parent";
  if (schoolMembers.has(u.id)) return "school";
  if (u.role === "affiliate_tutor" || affiliateTutors.has(u.id)) return "tutor";
  return null;
}

const byTime = (a: string | null, b: string | null) => (a ?? "").localeCompare(b ?? "");

function blank(id: string, key: string, type: ContactType, name: string, email: string | null) {
  const c: Contact = {
    id,
    ids: [id],
    key,
    type,
    name,
    email,
    accounts: [],
    leads: [],
    sources: [],
    foundUs: null,
    plan: null,
    derivedStage: "lead",
    stage: "lead",
    stageManual: false,
    paidCents: null,
    lastActivity: null,
    tags: [],
    ownerUserId: null,
    openTasks: 0,
    overdueTasks: 0,
    events: [],
    payments: [],
    links: [],
  };
  return c;
}

function group<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const t of items) {
    const k = key(t);
    const list = m.get(k);
    if (list) list.push(t);
    else m.set(k, [t]);
  }
  return m;
}

/** Merges accounts, leads and parent emails into contacts (no stages, money or events yet). */
export function mergeContacts(raw: CrmRaw): Contact[] {
  const schoolMembers = new Set(raw.schoolMembers.map((m) => m.userId));
  const affiliateTutors = new Set(raw.affiliates.map((a) => a.tutorUserId));
  const byKey = new Map<string, Contact>();
  const out: Contact[] = [];
  const add = (c: Contact) => {
    byKey.set(c.key, c);
    out.push(c);
  };

  for (const u of [...raw.users].sort((a, b) => byTime(a.createdAt, b.createdAt))) {
    const type = typeOf(u, schoolMembers, affiliateTutors);
    if (!type) continue;
    const ek = emailKey(u.email);
    const same = ek ? byKey.get(ek) : undefined;
    if (same && same.type === type) {
      same.accounts.push(u);
      same.ids.push(`u-${u.id}`);
      continue;
    }
    const key = ek && !same ? ek : `user:${u.id}`;
    const c = blank(`u-${u.id}`, key, type, personName(u) ?? u.email ?? "No name", ek);
    c.accounts.push(u);
    add(c);
  }

  const leadsByEmail = group(
    raw.leads.filter((l) => emailKey(l.email)),
    (l) => emailKey(l.email) as string
  );
  for (const [ek, leads] of leadsByEmail) {
    leads.sort((a, b) => byTime(a.createdAt, b.createdAt));
    let c = byKey.get(ek);
    if (!c) {
      const named = leads.find((l) => l.name);
      c = blank(`l-${leads[0].id}`, ek, "lead", named?.name ?? ek, ek);
      c.ids = [];
      add(c);
    }
    c.leads.push(...leads);
    c.ids.push(...leads.map((l) => `l-${l.id}`));
  }

  for (const kid of raw.users) {
    if (kid.role !== "student") continue;
    const ek = emailKey(kid.parentEmail);
    if (!ek || ek === emailKey(kid.email)) continue;
    const kidContact = out.find((c) => c.accounts.some((a) => a.id === kid.id));
    let parent = byKey.get(ek);
    if (!parent) {
      parent = blank(`pe-${kid.id}`, ek, "parent", `Parent of ${kid.firstName ?? "a student"}`, ek);
      parent.ids = [];
      add(parent);
    }
    parent.ids.push(`pe-${kid.id}`);
    if (!parent.sources.includes("parent-email") && parent.accounts.length === 0) {
      parent.sources.push("parent-email");
    }
    if (kidContact && kidContact !== parent) {
      parent.links.push({
        label: `Parent email given by ${kidContact.name}`,
        contactId: kidContact.id,
      });
      kidContact.links.push({ label: `Parent email: ${parent.name}`, contactId: parent.id });
    }
  }
  return out;
}

const TERM: Readonly<Record<string, string>> = { month: "monthly", quarter: "every 3 months" };
const planName = (p: PlanId | null) => (p ? PLAN_LABEL[p] : "Unknown plan");

/** The whole CRM list: merged contacts with stages, money, events, links and the admins' additions. */
export function buildContacts(raw: CrmRaw, now: Date): Contact[] {
  const contacts = mergeContacts(raw);
  const sponsors = activeAffiliateSponsors(raw.subs, now);
  const subsBy = group(raw.subs, (s) => s.userId);
  const grantsBy = group(raw.grants, (g) => g.userId);
  const refundsBy = group(
    raw.refunds.filter((r) => r.userId),
    (r) => r.userId as string
  );
  const cohortBy = group(raw.cohortMembers, (m) => m.userId);
  const seatsBy = group(raw.seats, (x) => x.studentUserId);
  const waitBy = group(raw.waitlist, (w) => w.userId);
  const membersBy = group(raw.schoolMembers, (m) => m.userId);
  const schools = new Map(raw.schools.map((s) => [s.id, s]));
  const affiliateOf = new Map(raw.affiliates.map((a) => [a.tutorUserId, a]));
  const redeemBy = group(raw.redemptions, (r) => r.affiliateId);
  const contactOfUser = new Map<string, Contact>();
  for (const c of contacts) for (const a of c.accounts) contactOfUser.set(a.id, c);
  const stored = new Map(raw.crm.contacts.map((s) => [s.key, s]));
  const tagsBy = group(raw.crm.tags, (t) => t.key);
  const tasksBy = group(raw.crm.tasks, (t) => t.key);
  const notesBy = group(raw.crm.notes, (n) => n.key);
  const today = crmToday(now);

  for (const c of contacts) {
    const ev: CrmEvent[] = c.events;
    const pay: CrmPayment[] = c.payments;
    const subs = c.accounts.flatMap((a) => (a.clerkId && subsBy.get(a.clerkId)) || []);
    const grants = c.accounts.flatMap((a) => (a.clerkId && grantsBy.get(a.clerkId)) || []);
    const sources: string[] = [];

    for (const l of c.leads) addLead(l, sources, ev);
    for (const s of c.sources) sources.push(s);

    let inCohort = false;
    let pastCohort = false;
    const schoolStatuses: string[] = [];
    for (const a of c.accounts) {
      const role = a.role === "affiliate_tutor" ? "affiliate tutor" : a.role;
      if (a.createdAt)
        ev.push({ at: a.createdAt, kind: "signup", title: `Made a ${role} account` });
      if (a.onboardedAt)
        ev.push({ at: a.onboardedAt, kind: "onboarded", title: "Finished onboarding" });
      c.foundUs ??= a.heardAbout?.trim() || null;
      const seats = seatsBy.get(a.id) ?? [];
      const viaSchool =
        seats.length > 0 ||
        ((a.clerkId && grantsBy.get(a.clerkId)) || []).some((g) => g.source === "school");
      const viaCode = raw.redemptions.some((r) => r.studentUserId === a.id);
      sources.push(viaSchool ? "school" : viaCode ? "tutor-code" : "signup");
      for (const w of waitBy.get(a.id) ?? []) {
        sources.push("waitlist");
        if (w.createdAt)
          ev.push({ at: w.createdAt, kind: "waitlist", title: "Joined the cohort waitlist" });
      }
      for (const m of cohortBy.get(a.id) ?? []) {
        if (!m.leftAt && m.cohortStatus !== "completed") inCohort = true;
        else pastCohort = true;
        if (m.joinedAt) ev.push({ at: m.joinedAt, kind: "cohort", title: "Placed in a cohort" });
        if (m.leftAt) ev.push({ at: m.leftAt, kind: "cohort", title: "Left a cohort" });
      }
      for (const seat of seats) {
        const school = schools.get(seat.schoolId);
        if (!school) continue;
        if (!seat.removedAt) schoolStatuses.push(school.billingStatus);
        if (seat.joinedAt) {
          ev.push({ at: seat.joinedAt, kind: "school", title: `Got a seat at ${school.name}` });
        }
        if (seat.removedAt) {
          ev.push({ at: seat.removedAt, kind: "school", title: `Seat at ${school.name} removed` });
        }
        c.links.push({ label: `${school.name} (school)`, href: "/admin/schools" });
      }
      for (const m of membersBy.get(a.id) ?? []) {
        const school = schools.get(m.schoolId);
        if (!school) continue;
        schoolStatuses.push(school.billingStatus);
        if (m.createdAt) {
          ev.push({ at: m.createdAt, kind: "school", title: `Joined ${school.name} as ${m.role}` });
        }
        c.links.push({ label: `${school.name} (school)`, href: "/admin/schools" });
        pay.push({
          at: school.createdAt,
          label: `${school.name} licence`,
          status: school.billingStatus.replace("_", " "),
          cents: null,
          exact: false,
          refs: [
            ...(school.stripeCustomerId
              ? [{ label: "Customer", value: school.stripeCustomerId }]
              : []),
            ...(school.stripeSubscriptionId
              ? [{ label: "Subscription", value: school.stripeSubscriptionId }]
              : []),
          ],
        });
      }
      const aff = affiliateOf.get(a.id);
      if (aff) {
        const seats = (redeemBy.get(aff.id) ?? []).filter((r) => !r.removedAt).length;
        c.links.push({ label: `Affiliate code: ${seats} students now`, href: "/admin/affiliates" });
      }
      for (const r of raw.redemptions.filter((x) => x.studentUserId === a.id)) {
        if (r.redeemedAt)
          ev.push({ at: r.redeemedAt, kind: "tutor-code", title: "Joined through a tutor's code" });
        const tutorId = raw.affiliates.find((x) => x.id === r.affiliateId)?.tutorUserId;
        const tutor = tutorId ? contactOfUser.get(tutorId) : undefined;
        if (tutor) c.links.push({ label: `Tutor: ${tutor.name}`, contactId: tutor.id });
      }
      for (const r of refundsBy.get(a.id) ?? []) {
        if (r.issuedAt)
          ev.push({
            at: r.issuedAt,
            kind: "refund",
            title: `Refund of ${formatCents(r.amountCents)}`,
          });
        pay.push({
          at: r.issuedAt,
          label: "Refund",
          status: "refunded",
          cents: -r.amountCents,
          exact: true,
          refs: r.stripeRefundId ? [{ label: "Refund", value: r.stripeRefundId }] : [],
        });
      }
      if (a.role === "student" && a.clerkId) {
        c.links.push({
          label: "Student page",
          href: `/admin/students/${encodeURIComponent(a.clerkId)}`,
        });
      }
      if (a.email) {
        c.links.push({
          label: "Plan and subscription",
          href: `/admin/plans?q=${encodeURIComponent(a.email)}`,
        });
      }
    }

    for (const s of subs) addSubscription(s, now, ev, pay);
    for (const g of grants) addGrant(g, ev, pay);

    c.sources = [...new Set(sources)];
    const plan = effectivePlan(subs, grants, now, sponsors);
    c.plan =
      plan.planId !== "free"
        ? plan.planId
        : schoolStatuses.some((s) => LIVE_SCHOOL.has(s))
          ? "school"
          : null;
    c.derivedStage = deriveStage({
      subs,
      grants,
      now,
      sponsors,
      inCohort,
      pastCohort,
      sources: c.sources,
      schoolStatuses,
    });
    const priced = pay.filter((p) => p.cents !== null);
    c.paidCents = priced.length ? priced.reduce((sum, p) => sum + (p.cents ?? 0), 0) : null;

    // what admins added by hand
    const s = stored.get(c.key);
    c.ownerUserId = s?.ownerUserId ?? null;
    c.tags = (tagsBy.get(c.key) ?? []).map((t) => t.tag).sort();
    const tasks = tasksBy.get(c.key) ?? [];
    c.openTasks = tasks.filter((t) => !t.doneAt).length;
    c.overdueTasks = tasks.filter((t) => !t.doneAt && t.dueOn < today).length;
    for (const t of tasks) {
      ev.push({
        at: t.createdAt,
        kind: "task",
        title: `Follow-up added: ${t.title}`,
        detail: `Due ${dayLabel(t.dueOn)}`,
      });
      if (t.doneAt) ev.push({ at: t.doneAt, kind: "task", title: `Follow-up done: ${t.title}` });
    }
    for (const n of notesBy.get(c.key) ?? []) {
      ev.push({ at: n.createdAt, kind: "note", title: "Note", detail: n.body ?? undefined });
    }
    if (s?.stageOverride && s.stageSetAt) {
      ev.push({
        at: s.stageSetAt,
        kind: "stage",
        title: `Moved to ${STAGE_LABEL[s.stageOverride]} by hand`,
      });
    }
  }

  // A parent's pipeline stage follows the family: the furthest of theirs and their children's.
  for (const link of raw.parentLinks) {
    const parent = contactOfUser.get(link.parentId);
    const kid = contactOfUser.get(link.studentId);
    if (!parent || !kid || parent === kid) continue;
    parent.links.push({ label: `Parent of ${kid.name}`, contactId: kid.id });
    kid.links.push({ label: `Parent: ${parent.name}`, contactId: parent.id });
    if (link.createdAt) {
      parent.events.push({ at: link.createdAt, kind: "family", title: `Linked to ${kid.name}` });
      kid.events.push({ at: link.createdAt, kind: "family", title: `Linked to ${parent.name}` });
    }
  }
  const kidStages = new Map<Contact, Stage[]>();
  for (const link of raw.parentLinks) {
    const parent = contactOfUser.get(link.parentId);
    const kid = contactOfUser.get(link.studentId);
    if (parent && kid && parent !== kid) {
      kidStages.set(parent, [...(kidStages.get(parent) ?? []), kid.derivedStage]);
    }
  }
  for (const [parent, stages] of kidStages) {
    parent.derivedStage = furthestStage([parent.derivedStage, ...stages]);
  }

  for (const c of contacts) {
    const s = stored.get(c.key);
    c.stageManual = !!s?.stageOverride && s.stageOverride !== c.derivedStage;
    c.stage = s?.stageOverride ?? c.derivedStage;
    c.events.sort((a, b) => b.at.localeCompare(a.at));
    c.payments.sort((a, b) => byTime(b.at, a.at));
    c.lastActivity = c.events[0]?.at ?? null;
    const seen = new Set<string>();
    c.links = c.links.filter((l) => {
      const k = `${l.label}|${l.href ?? ""}|${l.contactId ?? ""}`;
      return seen.has(k) ? false : (seen.add(k), true);
    });
  }
  return contacts.sort((a, b) => byTime(b.lastActivity, a.lastActivity));
}

function addLead(l: RawLead, sources: string[], ev: CrmEvent[]) {
  const key = sourceKey(l.source);
  sources.push(key);
  const detail = formAnswers(l.details)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  ev.push({
    at: l.createdAt,
    kind: "form",
    title: `Sent the form: ${sourceLabel(key)}`,
    detail: detail || undefined,
  });
  if (l.updatedAt && Date.parse(l.updatedAt) - Date.parse(l.createdAt) > 60_000) {
    ev.push({ at: l.updatedAt, kind: "form", title: `Sent the form again: ${sourceLabel(key)}` });
  }
}

function addSubscription(s: CrmSubscription, now: Date, ev: CrmEvent[], pay: CrmPayment[]) {
  const name = `${planName(s.planId)}${s.billingTerm ? `, ${TERM[s.billingTerm] ?? s.billingTerm}` : ""}`;
  if (s.createdAt) ev.push({ at: s.createdAt, kind: "subscription", title: `Started ${name}` });
  if (s.canceledAt) ev.push({ at: s.canceledAt, kind: "subscription", title: `Cancelled ${name}` });
  const per = subscriptionPeriodCents(s.planId, s.billingTerm);
  const periods = periodsStarted(s, now);
  pay.push({
    at: s.createdAt,
    label: `${name} (${periods} ${periods === 1 ? "payment" : "payments"})`,
    status: s.status.replace("_", " "),
    cents: per === null ? null : per * periods,
    exact: false,
    refs: [
      ...(s.stripeCustomerId ? [{ label: "Customer", value: s.stripeCustomerId }] : []),
      ...(s.stripeSubscriptionId ? [{ label: "Subscription", value: s.stripeSubscriptionId }] : []),
    ],
  });
}

const GRANT_TITLE: Readonly<Record<string, (plan: string) => string>> = {
  purchase: (p) => `Bought ${p}`,
  school: () => "Got a school seat",
  "tutor-affiliate": () => "Got a plan through a tutor's code",
  admin: (p) => `Given ${p} free by an admin`,
};

function addGrant(g: GrantInfo, ev: CrmEvent[], pay: CrmPayment[]) {
  const plan = planName(g.planId);
  ev.push({
    at: g.startsAt,
    kind: g.source === "purchase" ? "purchase" : "school",
    title: (GRANT_TITLE[g.source] ?? GRANT_TITLE.admin)(plan),
  });
  if (g.revokedAt) ev.push({ at: g.revokedAt, kind: "purchase", title: `${plan} withdrawn` });
  if (g.source !== "purchase") return;
  pay.push({
    at: g.startsAt,
    label: `${plan}, one payment`,
    status: g.revokedAt ? "withdrawn" : "paid",
    cents: purchaseCents(g.planId),
    exact: false,
    refs: g.sourceRef ? [{ label: "Checkout session", value: g.sourceRef }] : [],
  });
}
