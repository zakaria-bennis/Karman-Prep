"use server";

// Student-side actions for tutor codes: join a tutor's group, leave it,
// and dismiss the "your tutor removed you" notice. Zod-validated; the
// student is always the signed-in account, never a submitted id.

import { revalidatePath } from "next/cache";
import { affiliateDeps, requireClerkId } from "@/lib/tutor-affiliate/server";
import { dismissNoticeSchema, redeemCodeSchema } from "@/lib/tutor-affiliate/schemas";
import {
  leaveAffiliateTutor,
  redeemAffiliateCode,
  type RedeemResult,
} from "@/lib/tutor-affiliate/service";

export async function redeemCodeAction(input: {
  code: string;
  switchTutor?: boolean;
}): Promise<RedeemResult | { ok: false; reason: "error"; message: string }> {
  try {
    const parsed = redeemCodeSchema.parse(input);
    const clerkId = await requireClerkId();
    const result = await redeemAffiliateCode(affiliateDeps, {
      studentClerkId: clerkId,
      rawCode: parsed.code,
      switchTutor: parsed.switchTutor,
    });
    revalidatePath("/join");
    return result;
  } catch (error) {
    console.error("[join] redeem failed:", error);
    return {
      ok: false,
      reason: "error",
      message: "We couldn't add the code just now. Please try again.",
    };
  }
}

export async function leaveTutorAction(): Promise<{ ok: boolean }> {
  try {
    const clerkId = await requireClerkId();
    const result = await leaveAffiliateTutor(affiliateDeps, { studentClerkId: clerkId });
    revalidatePath("/join");
    return { ok: result.ok };
  } catch (error) {
    console.error("[join] leave failed:", error);
    return { ok: false };
  }
}

export async function dismissNoticeAction(input: { linkId: string }): Promise<{ ok: boolean }> {
  try {
    const parsed = dismissNoticeSchema.parse(input);
    const clerkId = await requireClerkId();
    const student = await affiliateDeps.store.userByClerkId(clerkId);
    const latest = student ? await affiliateDeps.store.latestLinkForStudent(student.id) : null;
    if (!latest || latest.id !== parsed.linkId) return { ok: false };
    await affiliateDeps.store.markNoticeSeen(latest.id, new Date().toISOString());
    revalidatePath("/join");
    return { ok: true };
  } catch (error) {
    console.error("[join] dismiss failed:", error);
    return { ok: false };
  }
}
