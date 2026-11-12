// ============================================================
// Admin CRM: server reads. Service role, on the server only,
// behind the admin layout and the admin action guard. Reads are
// defensive like src/lib/admin/plans.ts: a table that isn't on
// this database yet reads as empty, and the page says so.
// Never calls Stripe: money comes from local rows only.
// ============================================================

import "server-only";
import { mapGrant, mapSubscription, selectRows, type Row } from "@/lib/admin/plans";
import { buildContacts } from "./model";
import {
  STAGES,
  type Contact,
  type CrmNote,
  type CrmRaw,
  type CrmSubscription,
  type Stage,
} from "./types";

const s = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

function details(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => typeof x === "string" || typeof x === "number")
      .map(([k, x]) => [k, String(x)])
  );
}

const asStage = (v: unknown): Stage | null =>
  typeof v === "string" && (STAGES as readonly string[]).includes(v) ? (v as Stage) : null;

export interface CrmData {
  contacts: Contact[];
  /** Admins who can own a contact: id and name. */
  owners: Array<{ id: string; name: string }>;
  /** Tables this database doesn't have yet (shown as a note on the page). */
  missing: string[];
  errors: string[];
}

const USER_COLUMNS =
  "id, clerk_id, role, email, first_name, last_name, created_at, onboarding_completed_at, heard_about_karman, parent_email_collected";

/** Reads everything the CRM needs and builds the contacts. `withNotes` loads note bodies too. */
export async function loadCrm(
  opts: { now?: Date; withNoteBodies?: boolean } = {}
): Promise<CrmData> {
  const now = opts.now ?? new Date();
  const [
    users,
    leads,
    subs,
    grants,
    refunds,
    links,
    schools,
    members,
    affiliates,
    redemptions,
    waitlist,
    cohort,
    cohortRows,
    seats,
    crmContacts,
    crmTags,
    crmTasks,
    crmNotes,
  ] = await Promise.all([
    selectRows("users", USER_COLUMNS),
    selectRows("marketing_leads", "id, email, source, name, role, details, created_at, updated_at"),
    selectRows("subscriptions"),
    selectRows("plan_grants"),
    selectRows("refunds", "id, user_id, amount_cents, issued_at, stripe_refund_id"),
    selectRows("parent_student_links"),
    selectRows(
      "schools",
      "id, name, billing_status, free_until, created_at, stripe_customer_id, stripe_subscription_id"
    ),
    selectRows("school_members"),
    selectRows("tutor_affiliates", "id, tutor_user_id, created_at"),
    selectRows(
      "tutor_affiliate_redemptions",
      "affiliate_id, student_user_id, redeemed_at, removed_at"
    ),
    selectRows("cohort_waitlist", "user_id, created_at, fulfilled_at"),
    selectRows("cohort_members", "user_id, cohort_id, joined_at, left_at"),
    selectRows("cohorts", "id, status"),
    selectRows("school_seats", "school_id, student_user_id, joined_at, removed_at"),
    selectRows("crm_contacts"),
    selectRows("crm_tags"),
    selectRows("crm_tasks"),
    selectRows(
      "crm_notes",
      opts.withNoteBodies
        ? "id, contact_key, body, author_user_id, created_at"
        : "id, contact_key, created_at"
    ),
  ]);
  const named = {
    users,
    marketing_leads: leads,
    subscriptions: subs,
    plan_grants: grants,
    refunds,
    parent_student_links: links,
    schools,
    school_members: members,
    tutor_affiliates: affiliates,
    tutor_affiliate_redemptions: redemptions,
    cohort_waitlist: waitlist,
    cohort_members: cohort,
    cohorts: cohortRows,
    school_seats: seats,
    crm_contacts: crmContacts,
    crm_tags: crmTags,
    crm_tasks: crmTasks,
    crm_notes: crmNotes,
  };
  const missing = Object.entries(named)
    .filter(([, r]) => r.missing)
    .map(([t]) => t);
  const errors = Object.entries(named)
    .filter(([, r]) => r.error && !r.missing)
    .map(([t, r]) => `${t}: ${r.error}`);

  const cohortStatus = new Map(cohortRows.rows.map((r) => [String(r.id), String(r.status)]));
  const raw: CrmRaw = {
    users: users.rows.map((r) => ({
      id: String(r.id),
      clerkId: s(r.clerk_id),
      role: s(r.role) ?? "student",
      email: s(r.email),
      firstName: s(r.first_name),
      lastName: s(r.last_name),
      createdAt: s(r.created_at),
      onboardedAt: s(r.onboarding_completed_at),
      heardAbout: s(r.heard_about_karman),
      parentEmail: s(r.parent_email_collected),
    })),
    leads: leads.rows.map((r) => ({
      id: String(r.id),
      email: String(r.email ?? ""),
      source: String(r.source ?? ""),
      name: s(r.name),
      role: s(r.role),
      details: details(r.details),
      createdAt: s(r.created_at) ?? now.toISOString(),
      updatedAt: s(r.updated_at),
    })),
    subs: subs.rows.map(
      (r: Row): CrmSubscription => ({
        ...mapSubscription(r),
        canceledAt: s(r.canceled_at),
        trialEnd: s(r.trial_end),
        stripeCustomerId: s(r.stripe_customer_id),
      })
    ),
    grants: grants.rows.map(mapGrant),
    refunds: refunds.rows.map((r) => ({
      id: String(r.id),
      userId: s(r.user_id),
      amountCents: Number(r.amount_cents ?? 0),
      issuedAt: s(r.issued_at),
      stripeRefundId: s(r.stripe_refund_id),
    })),
    parentLinks: links.rows.map((r) => ({
      parentId: String(r.parent_user_id),
      studentId: String(r.student_user_id),
      createdAt: s(r.created_at),
    })),
    schools: schools.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name ?? "School"),
      billingStatus: String(r.billing_status ?? "free_year"),
      freeUntil: s(r.free_until),
      createdAt: s(r.created_at),
      stripeCustomerId: s(r.stripe_customer_id),
      stripeSubscriptionId: s(r.stripe_subscription_id),
    })),
    schoolMembers: members.rows.map((r) => ({
      schoolId: String(r.school_id),
      userId: String(r.user_id),
      role: String(r.role ?? "teacher"),
      createdAt: s(r.created_at),
    })),
    affiliates: affiliates.rows.map((r) => ({
      id: String(r.id),
      tutorUserId: String(r.tutor_user_id),
      createdAt: s(r.created_at),
    })),
    redemptions: redemptions.rows.map((r) => ({
      affiliateId: String(r.affiliate_id),
      studentUserId: String(r.student_user_id),
      redeemedAt: s(r.redeemed_at),
      removedAt: s(r.removed_at),
    })),
    waitlist: waitlist.rows.map((r) => ({
      userId: String(r.user_id),
      createdAt: s(r.created_at),
      fulfilledAt: s(r.fulfilled_at),
    })),
    cohortMembers: cohort.rows.map((r) => ({
      userId: String(r.user_id),
      cohortStatus: cohortStatus.get(String(r.cohort_id)) ?? null,
      joinedAt: s(r.joined_at),
      leftAt: s(r.left_at),
    })),
    seats: seats.rows.map((r) => ({
      schoolId: String(r.school_id),
      studentUserId: String(r.student_user_id),
      joinedAt: s(r.joined_at),
      removedAt: s(r.removed_at),
    })),
    crm: {
      contacts: crmContacts.rows.map((r) => ({
        key: String(r.contact_key),
        stageOverride: asStage(r.stage_override),
        stageSetAt: s(r.stage_set_at),
        ownerUserId: s(r.owner_user_id),
      })),
      tags: crmTags.rows.map((r) => ({ key: String(r.contact_key), tag: String(r.tag) })),
      tasks: crmTasks.rows.map((r) => ({
        id: String(r.id),
        key: String(r.contact_key),
        title: String(r.title ?? ""),
        dueOn: String(r.due_on ?? "").slice(0, 10),
        doneAt: s(r.done_at),
        createdAt: s(r.created_at) ?? now.toISOString(),
      })),
      notes: crmNotes.rows.map(
        (r): CrmNote => ({
          id: String(r.id),
          key: String(r.contact_key),
          body: s(r.body),
          authorUserId: s(r.author_user_id),
          createdAt: s(r.created_at) ?? now.toISOString(),
        })
      ),
    },
  };

  const owners = raw.users
    .filter((u) => u.role === "admin")
    .map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Admin",
    }));
  return { contacts: buildContacts(raw, now), owners, missing, errors };
}

/** One contact's notes and tasks, newest first, for the contact page. */
export async function loadContactExtras(key: string) {
  const [notes, tasks] = await Promise.all([
    selectRows("crm_notes", "id, contact_key, body, author_user_id, created_at", {
      column: "contact_key",
      values: [key],
    }),
    selectRows("crm_tasks", "*", { column: "contact_key", values: [key] }),
  ]);
  return {
    notes: notes.rows
      .map((r) => ({
        id: String(r.id),
        body: String(r.body ?? ""),
        authorUserId: s(r.author_user_id),
        createdAt: String(r.created_at),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    tasks: tasks.rows
      .map((r) => ({
        id: String(r.id),
        title: String(r.title ?? ""),
        dueOn: String(r.due_on ?? "").slice(0, 10),
        doneAt: s(r.done_at),
      }))
      .sort((a, b) => Number(!!a.doneAt) - Number(!!b.doneAt) || a.dueOn.localeCompare(b.dueOn)),
  };
}
