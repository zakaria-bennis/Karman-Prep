"use server";

// ============================================================
// Server action — a student uploads their official SAT score
// report for the cohort scholarship. Zod-validated; the caller
// must be the signed-in student, and the cohort must be theirs
// (checked in the service).
// ============================================================

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth/dev-auth";
import { reportFileSchema, submitClaimFieldsSchema } from "@/lib/scholarship/schemas";
import { ScholarshipError, submitClaim, type ActionResult } from "@/lib/scholarship/service";
import { StorageUnavailableError } from "@/lib/scholarship/storage";

export async function actionSubmitScholarshipClaim(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const fields = submitClaimFieldsSchema.safeParse({
    cohortId: formData.get("cohortId"),
    declaredTotalScore: formData.get("declaredTotalScore"),
    declaredTestDate: formData.get("declaredTestDate"),
  });
  if (!fields.success)
    return { ok: false, error: fields.error.issues[0]?.message ?? "Check the form." };
  const file = reportFileSchema.safeParse(formData.get("report"));
  if (!file.success) return { ok: false, error: file.error.issues[0]?.message ?? "Choose a PDF." };

  const { userId: clerkId } = await safeAuth();
  if (!clerkId) return { ok: false, error: "Sign in again to upload." };

  try {
    await submitClaim({
      clerkId,
      cohortId: fields.data.cohortId,
      declaredTotalScore: fields.data.declaredTotalScore,
      declaredTestDate: fields.data.declaredTestDate,
      fileName: file.data.name,
      bytes: new Uint8Array(await file.data.arrayBuffer()),
    });
    revalidatePath("/dashboard/student/scholarship");
    revalidatePath("/admin/scholarship");
    return { ok: true };
  } catch (err) {
    if (err instanceof ScholarshipError || err instanceof StorageUnavailableError) {
      return { ok: false, error: err.message };
    }
    console.error("[scholarship] submit failed", err);
    return { ok: false, error: "The upload didn't go through. Try again in a minute." };
  }
}
