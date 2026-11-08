"use server";

// ============================================================
// Server actions — scholarship review queue (admin only).
// Each action: Zod-validates its input, checks the admin role on
// the server, then calls the scholarship service.
// ============================================================

import { revalidatePath } from "next/cache";
import { AdminRequiredError, requireAdmin } from "@/lib/auth/admin-guard";
import {
  approveClaimSchema,
  claimIdSchema,
  markBonusPaidSchema,
  payClaimSchema,
  rejectClaimSchema,
} from "@/lib/scholarship/schemas";
import {
  ScholarshipError,
  approveClaim,
  markBonusPaid,
  payClaim,
  rejectClaim,
  reopenClaim,
  rerunCheck,
  type ActionResult,
} from "@/lib/scholarship/service";

async function run(
  claimId: string | undefined,
  fn: (adminUserId: string) => Promise<unknown>
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await fn(admin.userId);
    revalidatePath("/admin/scholarship");
    if (claimId) revalidatePath(`/admin/scholarship/${claimId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof ScholarshipError || err instanceof AdminRequiredError) {
      return { ok: false, error: err.message };
    }
    console.error("[admin/scholarship]", err);
    return { ok: false, error: "Something went wrong. Nothing was changed." };
  }
}

function invalid(error: { issues: { message: string }[] }): ActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Check the form and try again." };
}

export async function actionRerunScholarshipCheck(input: unknown): Promise<ActionResult> {
  const v = claimIdSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  return run(v.data.claimId, (admin) => rerunCheck(v.data.claimId, admin));
}

export async function actionApproveScholarship(input: unknown): Promise<ActionResult> {
  const v = approveClaimSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  return run(v.data.claimId, (admin) => approveClaim(v.data.claimId, admin, v.data.note));
}

export async function actionRejectScholarship(input: unknown): Promise<ActionResult> {
  const v = rejectClaimSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  return run(v.data.claimId, (admin) => rejectClaim(v.data.claimId, admin, v.data.reason));
}

export async function actionReopenScholarship(input: unknown): Promise<ActionResult> {
  const v = claimIdSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  return run(v.data.claimId, (admin) => reopenClaim(v.data.claimId, admin));
}

export async function actionPayScholarship(input: unknown): Promise<ActionResult> {
  const v = payClaimSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  return run(v.data.claimId, (admin) => payClaim(v.data.claimId, admin, v.data.paymentIntentId));
}

export async function actionMarkScholarshipBonusPaid(input: unknown): Promise<ActionResult> {
  const v = markBonusPaidSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  return run(v.data.claimId, (admin) =>
    markBonusPaid(v.data.claimId, admin, { paidOn: v.data.paidOn, reference: v.data.reference })
  );
}
