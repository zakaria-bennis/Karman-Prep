// ============================================================
// Admin CRM: the shapes shared by the pure builder (model.ts),
// the server reads (load.ts) and the pages under /admin/crm.
// ============================================================

import type { GrantInfo, PlanId, SubscriptionInfo } from "@/lib/admin/plans";

export const STAGES = ["lead", "talking", "deposit", "enrolled", "churned"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Readonly<Record<Stage, string>> = {
  lead: "Lead",
  talking: "Talking",
  deposit: "Deposit",
  enrolled: "Enrolled",
  churned: "Churned",
};

/** What each stage means, shown on the board and the contact page. */
export const STAGE_HINT: Readonly<Record<Stage, string>> = {
  lead: "We have their email. No conversation yet.",
  talking: "Applied, asked for a call, or has an account and we are in touch.",
  deposit: "Paid for the cohort, not placed in a class yet.",
  enrolled: "On a paid plan, a school seat, a tutor code or in a cohort right now.",
  churned: "Paid or took part before, nothing running now.",
};

export const CONTACT_TYPES = ["lead", "parent", "student", "school", "tutor"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const TYPE_LABEL: Readonly<Record<ContactType, string>> = {
  lead: "Lead",
  parent: "Parent",
  student: "Student",
  school: "School contact",
  tutor: "Affiliate tutor",
};

// ---------- raw rows, as load.ts reads them ----------

export interface RawUser {
  id: string;
  clerkId: string | null;
  role: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string | null;
  onboardedAt: string | null;
  heardAbout: string | null;
  parentEmail: string | null;
}

export interface RawLead {
  id: string;
  email: string;
  source: string;
  name: string | null;
  role: string | null;
  details: Record<string, string>;
  createdAt: string;
  updatedAt: string | null;
}

export interface CrmSubscription extends SubscriptionInfo {
  canceledAt: string | null;
  trialEnd: string | null;
  stripeCustomerId: string | null;
}

export interface RawRefund {
  id: string;
  userId: string | null;
  amountCents: number;
  issuedAt: string | null;
  stripeRefundId: string | null;
}

export interface RawSchool {
  id: string;
  name: string;
  billingStatus: string;
  freeUntil: string | null;
  createdAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface CrmRaw {
  users: RawUser[];
  leads: RawLead[];
  subs: CrmSubscription[];
  grants: GrantInfo[];
  refunds: RawRefund[];
  parentLinks: Array<{ parentId: string; studentId: string; createdAt: string | null }>;
  schools: RawSchool[];
  schoolMembers: Array<{
    schoolId: string;
    userId: string;
    role: string;
    createdAt: string | null;
  }>;
  affiliates: Array<{ id: string; tutorUserId: string; createdAt: string | null }>;
  redemptions: Array<{
    affiliateId: string;
    studentUserId: string;
    redeemedAt: string | null;
    removedAt: string | null;
  }>;
  waitlist: Array<{ userId: string; createdAt: string | null; fulfilledAt: string | null }>;
  cohortMembers: Array<{
    userId: string;
    joinedAt: string | null;
    leftAt: string | null;
    /** forming, active or completed. */
    cohortStatus: string | null;
  }>;
  /** School seats (school_seats): a student placed in a school's class. */
  seats: Array<{
    schoolId: string;
    studentUserId: string;
    joinedAt: string | null;
    removedAt: string | null;
  }>;
  crm: CrmStored;
}

/** What admins added by hand (the crm_* tables). */
export interface CrmStored {
  contacts: Array<{
    key: string;
    stageOverride: Stage | null;
    stageSetAt: string | null;
    ownerUserId: string | null;
  }>;
  tags: Array<{ key: string; tag: string }>;
  tasks: CrmTask[];
  /** Only the key and time for the list; bodies come in on the contact page. */
  notes: CrmNote[];
}

export interface CrmTask {
  id: string;
  key: string;
  title: string;
  dueOn: string;
  doneAt: string | null;
  createdAt: string;
}

export interface CrmNote {
  id: string;
  key: string;
  body: string | null;
  authorUserId: string | null;
  createdAt: string;
}

// ---------- the built contact ----------

export type EventKind =
  | "form"
  | "signup"
  | "onboarded"
  | "family"
  | "waitlist"
  | "cohort"
  | "subscription"
  | "purchase"
  | "refund"
  | "school"
  | "tutor-code"
  | "note"
  | "task"
  | "stage";

export interface CrmEvent {
  at: string;
  kind: EventKind;
  title: string;
  detail?: string;
}

export interface CrmPayment {
  at: string | null;
  label: string;
  status: string;
  /** Estimated from list prices; null when unknown. Refunds are exact and negative. */
  cents: number | null;
  exact: boolean;
  /** Stripe ids to look up by hand (customer, subscription, checkout session, refund). */
  refs: Array<{ label: string; value: string }>;
}

export interface CrmLink {
  label: string;
  /** Another contact in the CRM. */
  contactId?: string;
  /** An existing admin page. */
  href?: string;
}

export interface Contact {
  /** The route id: u-<users.id>, l-<marketing_leads.id> or pe-<student users.id>. */
  id: string;
  /** Every route id that resolves to this contact. */
  ids: string[];
  /** crm_* tables key: lower-cased email, or user:<users.id>. */
  key: string;
  type: ContactType;
  name: string;
  email: string | null;
  accounts: RawUser[];
  leads: RawLead[];
  /** Source keys (see sourceKey), earliest first, no repeats. */
  sources: string[];
  /** Free text from onboarding ("How did you hear about Karman?"). */
  foundUs: string | null;
  plan: PlanId | null;
  derivedStage: Stage;
  stage: Stage;
  stageManual: boolean;
  /** Estimated total paid, in cents, after exact refunds. null: nothing to estimate. */
  paidCents: number | null;
  lastActivity: string | null;
  tags: string[];
  ownerUserId: string | null;
  openTasks: number;
  overdueTasks: number;
  events: CrmEvent[];
  payments: CrmPayment[];
  links: CrmLink[];
}
