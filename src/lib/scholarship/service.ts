// ============================================================
// Scholarship flows (server only): submit, check, review, pay.
// Server actions validate input and check the caller, then call
// these. Each flow writes an audit event.
// ============================================================

import { COHORT_SCHOLARSHIP } from "@/lib/marketing/offer";
import { stripe } from "@/lib/integrations/stripe/client";
import { CHECK_VERSION, runScoreReportCheck } from "./pdf-check";
import { looksLikePdf, readPdfFacts } from "./pdf-read";
import { APPROVE_BLOCK_MESSAGES, canApprove } from "./ranking";
import { PayoutBlockedError, runScholarshipRefund, type RefundProgress } from "./payout";
import { getPrivateFileStore, scholarshipReportKey, type PrivateFileStore } from "./storage";
import {
  addEvent,
  cohortClaims,
  cohortWindow,
  getClaim,
  getClaimFor,
  getCohort,
  getStudentCohorts,
  getUserByClerkId,
  getUserById,
  hashUsedByOtherStudent,
  toRankInput,
  updateClaim,
  upsertClaim,
} from "./queries";
import type { ClaimRow } from "./schemas";

export class ScholarshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScholarshipError";
  }
}

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Run the automatic check and return the columns to store. */
async function checkColumns(
  bytes: Uint8Array,
  claim: {
    userId: string;
    cohortId: string;
    sha256: string;
    declaredTotal: number | null;
    declaredDate: string | null;
  }
): Promise<Record<string, unknown>> {
  const [student, cohort, facts, duplicate] = await Promise.all([
    getUserById(claim.userId),
    getCohort(claim.cohortId),
    readPdfFacts(bytes),
    hashUsedByOtherStudent(claim.sha256, claim.userId),
  ]);
  const window = cohort ? cohortWindow(cohort) : { start: null, end: null };
  const result = runScoreReportCheck(facts, {
    firstName: student?.firstName ?? null,
    lastName: student?.lastName ?? null,
    declaredTotalScore: claim.declaredTotal,
    declaredTestDate: claim.declaredDate,
    cohortStart: window.start,
    cohortEnd: window.end,
    satWithinDays: COHORT_SCHOLARSHIP.satWithinDays,
    duplicateOfOtherStudent: duplicate,
    now: new Date(),
  });
  const x = result.extracted;
  return {
    extracted_name: x.name?.slice(0, 200) ?? null,
    extracted_test_date: x.testDate,
    extracted_total_score: x.total,
    extracted_rw_score: x.rw,
    extracted_math_score: x.math,
    check_verdict: result.verdict,
    check_reasons: result.reasons,
    check_metadata: result.metadata,
    check_version: CHECK_VERSION,
    checked_at: new Date().toISOString(),
  };
}

export interface SubmitInput {
  clerkId: string;
  cohortId: string;
  declaredTotalScore: number;
  declaredTestDate: string;
  fileName: string;
  bytes: Uint8Array;
}

export async function submitClaim(input: SubmitInput, store?: PrivateFileStore): Promise<ClaimRow> {
  const student = await getUserByClerkId(input.clerkId);
  if (!student) throw new ScholarshipError("We couldn't find your Karman account.");
  if (student.role !== "student") throw new ScholarshipError("Only students can apply.");
  const cohorts = await getStudentCohorts(student.id);
  if (!cohorts.some((c) => c.id === input.cohortId)) {
    throw new ScholarshipError("You can only apply for a cohort you joined.");
  }
  if (!looksLikePdf(input.bytes)) {
    throw new ScholarshipError(
      "That file isn't a PDF. Download the PDF from your College Board account."
    );
  }

  const existing = await getClaimFor(input.cohortId, student.id);
  if (existing && (existing.status === "approved" || existing.status === "paid")) {
    throw new ScholarshipError(
      "Your scholarship was already approved. There's nothing more to upload."
    );
  }

  const files = store ?? getPrivateFileStore();
  const claimId = existing?.id ?? crypto.randomUUID();
  const sha256 = await sha256Hex(input.bytes);
  const key = scholarshipReportKey(claimId, sha256);
  await files.put(key, input.bytes, "application/pdf");

  const checked = await checkColumns(input.bytes, {
    userId: student.id,
    cohortId: input.cohortId,
    sha256,
    declaredTotal: input.declaredTotalScore,
    declaredDate: input.declaredTestDate,
  });

  const row = await upsertClaim({
    id: claimId,
    cohort_id: input.cohortId,
    user_id: student.id,
    status: "submitted",
    report_storage_driver: files.driver,
    report_storage_key: key,
    report_file_name:
      input.fileName.replace(/[^\w.\- ]+/g, "_").slice(0, 200) || "score-report.pdf",
    report_size_bytes: input.bytes.length,
    report_sha256: sha256,
    submitted_at: new Date().toISOString(),
    declared_total_score: input.declaredTotalScore,
    declared_test_date: input.declaredTestDate,
    reviewed_by: null,
    reviewed_at: null,
    review_reason: null,
    ...checked,
  });

  if (existing && existing.report_storage_key !== key) {
    await files.delete(existing.report_storage_key).catch(() => {});
  }
  await addEvent(row.id, existing ? "resubmitted" : "submitted", student.id, {
    file: row.report_file_name,
    size: row.report_size_bytes,
  });
  await addEvent(row.id, "checked", null, { verdict: row.check_verdict, version: CHECK_VERSION });
  return row;
}

async function readReport(claim: ClaimRow): Promise<Uint8Array> {
  const bytes = await getPrivateFileStore(claim.report_storage_driver).get(
    claim.report_storage_key
  );
  if (!bytes) throw new ScholarshipError("The uploaded file is missing from storage.");
  return bytes;
}

export async function getReportBytes(
  claimId: string
): Promise<{ bytes: Uint8Array; name: string } | null> {
  const claim = await getClaim(claimId);
  if (!claim) return null;
  const bytes = await getPrivateFileStore(claim.report_storage_driver).get(
    claim.report_storage_key
  );
  return bytes ? { bytes, name: claim.report_file_name } : null;
}

export async function rerunCheck(claimId: string, adminUserId: string): Promise<ClaimRow> {
  const claim = await getClaim(claimId);
  if (!claim) throw new ScholarshipError("This claim no longer exists.");
  const checked = await checkColumns(await readReport(claim), {
    userId: claim.user_id,
    cohortId: claim.cohort_id,
    sha256: claim.report_sha256,
    declaredTotal: claim.declared_total_score,
    declaredDate: claim.declared_test_date,
  });
  const row = await updateClaim(claimId, checked);
  if (!row) throw new ScholarshipError("This claim no longer exists.");
  await addEvent(claimId, "checked", adminUserId, { verdict: row.check_verdict, rerun: true });
  return row;
}

export async function approveClaim(
  claimId: string,
  adminUserId: string,
  note: string
): Promise<ClaimRow> {
  const claim = await getClaim(claimId);
  if (!claim) throw new ScholarshipError("This claim no longer exists.");
  if (claim.check_verdict !== "pass" && note.trim().length < 3) {
    throw new ScholarshipError("The automatic check didn't pass. Write what you checked by hand.");
  }
  const check = canApprove(
    claimId,
    (await cohortClaims(claim.cohort_id)).map(toRankInput),
    COHORT_SCHOLARSHIP.amount * 100
  );
  if (!check.ok) throw new ScholarshipError(APPROVE_BLOCK_MESSAGES[check.reason]);
  const row = await updateClaim(
    claimId,
    {
      status: "approved",
      award_cents: check.shareCents,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      review_reason: note.trim() || null,
    },
    { status: ["submitted"] }
  ).catch((err: Error) => {
    if (/scholarship_award_cap/.test(err.message)) {
      throw new ScholarshipError(APPROVE_BLOCK_MESSAGES.uneven_split);
    }
    throw err;
  });
  if (!row) throw new ScholarshipError("Someone else changed this claim. Reload and try again.");
  await addEvent(claimId, "approved", adminUserId, {
    note: note.trim() || null,
    share_cents: check.shareCents,
    tied_with: check.tiedWith,
  });
  return row;
}

export async function rejectClaim(
  claimId: string,
  adminUserId: string,
  reason: string
): Promise<ClaimRow> {
  const row = await updateClaim(
    claimId,
    {
      status: "rejected",
      award_cents: null,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      review_reason: reason,
    },
    { status: ["submitted", "approved"], payoutStatus: ["none"] }
  );
  if (!row) throw new ScholarshipError("Only a claim that hasn't been paid can be rejected.");
  await addEvent(claimId, "rejected", adminUserId, { reason });
  return row;
}

export async function reopenClaim(claimId: string, adminUserId: string): Promise<ClaimRow> {
  const row = await updateClaim(
    claimId,
    {
      status: "submitted",
      award_cents: null,
      reviewed_by: null,
      reviewed_at: null,
      review_reason: null,
    },
    { status: ["approved", "rejected"], payoutStatus: ["none"] }
  );
  if (!row) throw new ScholarshipError("Only an unpaid decision can be undone.");
  await addEvent(claimId, "reopened", adminUserId);
  return row;
}

function progressColumns(p: RefundProgress): Record<string, unknown> {
  const map: Record<keyof RefundProgress, string> = {
    stripePaymentIntentId: "stripe_payment_intent_id",
    stripeLivemode: "stripe_livemode",
    stripeRefundId: "stripe_refund_id",
    refundAmountCents: "refund_amount_cents",
    refundedAt: "refunded_at",
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined) out[map[k as keyof RefundProgress]] = v;
  }
  return out;
}

/**
 * The Stripe step: refund the cohort payment (test mode only). What is left of the claim's
 * share is the merit bonus, due by bank transfer. With nothing left, the claim is paid.
 */
export async function payClaim(
  claimId: string,
  adminUserId: string,
  paymentIntentOverride?: string
): Promise<ClaimRow> {
  const claim = await getClaim(claimId);
  if (!claim) throw new ScholarshipError("This claim no longer exists.");
  if (claim.status !== "approved" || !claim.award_cents) {
    throw new ScholarshipError("Approve the claim before paying it.");
  }

  const locked = await updateClaim(
    claimId,
    { payout_status: "processing", payout_error: null, payout_attempts: claim.payout_attempts + 1 },
    { status: ["approved"], payoutStatus: ["none", "failed"] }
  );
  if (!locked) throw new ScholarshipError("The refund is already done or running for this claim.");
  await addEvent(claimId, "payout_started", adminUserId, { attempt: locked.payout_attempts });

  const student = await getUserById(claim.user_id);
  try {
    const split = await runScholarshipRefund({
      stripe,
      claim: {
        id: claim.id,
        cohortId: claim.cohort_id,
        userId: claim.user_id,
        clerkId: student?.clerkId ?? "",
        stripePaymentIntentId: claim.stripe_payment_intent_id,
        stripeRefundId: claim.stripe_refund_id,
        refundAmountCents: claim.refund_amount_cents,
      },
      shareCents: claim.award_cents,
      cohortPriceCents: COHORT_SCHOLARSHIP.refund * 100,
      paymentIntentOverride: paymentIntentOverride ?? null,
      save: async (p) => {
        await updateClaim(claimId, progressColumns(p));
        if (p.stripeRefundId) {
          await addEvent(claimId, "refund_succeeded", adminUserId, {
            refund: p.stripeRefundId,
            cents: p.refundAmountCents,
          });
        }
      },
    });
    const done = split.bonusCents === 0;
    const row = await updateClaim(claimId, {
      payout_status: done ? "paid" : "refunded",
      bonus_amount_cents: split.bonusCents,
      ...(done ? { status: "paid", paid_at: new Date().toISOString() } : {}),
    });
    if (done) await addEvent(claimId, "paid", adminUserId, { refund_cents: split.refundCents });
    if (!row) throw new ScholarshipError("This claim no longer exists.");
    return row;
  } catch (err) {
    const message =
      err instanceof PayoutBlockedError || err instanceof ScholarshipError
        ? err.message
        : `Stripe said: ${err instanceof Error ? err.message : "unknown error"}`;
    await updateClaim(claimId, { payout_status: "failed", payout_error: message.slice(0, 2000) });
    await addEvent(claimId, "payout_failed", adminUserId, { error: message.slice(0, 500) });
    throw new ScholarshipError(message);
  }
}

/** The admin records the merit bonus once the bank transfer has been sent by hand. */
export async function markBonusPaid(
  claimId: string,
  adminUserId: string,
  transfer: { paidOn: string; reference: string }
): Promise<ClaimRow> {
  const now = new Date().toISOString();
  const row = await updateClaim(
    claimId,
    {
      bonus_paid_on: transfer.paidOn,
      bonus_transfer_reference: transfer.reference,
      bonus_recorded_by: adminUserId,
      bonus_recorded_at: now,
      payout_status: "paid",
      status: "paid",
      paid_at: now,
    },
    { status: ["approved"], payoutStatus: ["refunded"] }
  );
  if (!row) {
    throw new ScholarshipError("Refund the cohort payment first. Then record the bank transfer.");
  }
  await addEvent(claimId, "bonus_transfer_recorded", adminUserId, {
    paid_on: transfer.paidOn,
    reference: transfer.reference,
    cents: row.bonus_amount_cents,
  });
  await addEvent(claimId, "paid", adminUserId, {
    refund_cents: row.refund_amount_cents,
    bonus_cents: row.bonus_amount_cents,
  });
  return row;
}
